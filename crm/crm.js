let identity = null;
const accessPanel = document.getElementById('accessPanel');
const accessMessage = document.getElementById('accessMessage');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const crmApp = document.getElementById('crmApp');
const crmStatus = document.getElementById('crmStatus');
const companyRows = document.getElementById('companyRows');
const emptyState = document.getElementById('emptyState');
const companyDialog = document.getElementById('companyDialog');
const companyForm = document.getElementById('companyForm');
const dialogTitle = document.getElementById('dialogTitle');
const dialogError = document.getElementById('dialogError');
const saveCompanyButton = document.getElementById('saveCompanyButton');
const fields = [
  'company',
  'stage',
  'industry',
  'website',
  'location',
  'companySize',
  'relationshipStatus',
  'introduction',
  'contactName',
  'contactTitle',
  'email',
  'phone',
  'keyContacts',
  'source',
  'needs',
  'relationshipOwner',
  'lastContacted',
  'nextFollowUp',
  'nextAction',
  'priority',
  'estimatedValue',
  'commercialFee',
  'serviceType',
  'feeModel',
  'agreedFee',
  'currency',
  'invoiceTrigger',
  'paymentTerms',
  'guaranteeTerms',
  'checksIncluded',
  'additionalChecks',
  'referenceChecks',
  'offerCondition',
  'exclusivity',
  'ownershipPeriod',
  'cancellationTerms',
  'contractSigned',
  'specialConditions',
  'agreementDate',
  'activityNotes',
  'notes',
];

let currentUser = null;
let records = [];
let editingId = null;
let identityReady = false;
let identityInitTimeout;

function setStatus(message, isError = false) {
  crmStatus.textContent = message;
  crmStatus.dataset.error = String(isError);
}

function isAdmin(user) {
  const roles = user?.app_metadata?.roles ?? user?.roles;
  return Array.isArray(roles) && roles.includes('admin');
}

function showAccess(message, showLogin = false) {
  accessPanel.hidden = false;
  crmApp.hidden = true;
  accessMessage.textContent = message;
  loginButton.hidden = !showLogin;
  logoutButton.hidden = !currentUser;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function requestApi(method = 'GET', record, id) {
  if (!currentUser) throw new Error('Please sign in again to continue.');
  const token = await currentUser.jwt();
  const url = id ? `/api/crm?id=${encodeURIComponent(id)}` : '/api/crm';
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(record ? { 'Content-Type': 'application/json' } : {}),
    },
    body: record ? JSON.stringify(record) : undefined,
    cache: 'no-store',
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The CRM returned an unreadable response. Please try again.');
  }

  if (!response.ok) throw new Error(result.error || `The CRM request failed (${response.status}).`);
  return result;
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(year, month - 1, day));
}

function renderRows() {
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const stage = document.getElementById('stageFilter').value;
  const visibleRecords = records
    .filter((record) => !stage || record.stage === stage)
    .filter((record) => !search || [
      record.company,
      record.contactName,
      record.email,
      record.industry,
      record.needs,
      record.nextAction,
    ].some((value) => value?.toLowerCase().includes(search)))
    .sort((left, right) => left.company.localeCompare(right.company));

  companyRows.innerHTML = visibleRecords.map((record) => `
    <tr>
      <td>${escapeHtml(record.company)}<span class="company-secondary">${escapeHtml(record.industry)}</span></td>
      <td><span class="stage-pill">${escapeHtml(record.stage)}</span></td>
      <td>${escapeHtml(record.contactName || '—')}<span class="company-secondary">${escapeHtml(record.email)}</span></td>
      <td>${escapeHtml(formatDate(record.nextFollowUp))}<span class="company-secondary">${escapeHtml(record.nextAction)}</span></td>
      <td><span class="priority-pill ${record.priority === 'High' ? 'priority-high' : ''}">${escapeHtml(record.priority)}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" data-edit="${escapeHtml(record.id)}">Edit</button>
          <button type="button" data-delete="${escapeHtml(record.id)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
  emptyState.textContent = records.length
    ? 'No companies match your search.'
    : 'No companies yet. Add one to start building your pipeline.';
  emptyState.hidden = visibleRecords.length > 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueCount = records.filter((record) => {
    if (!record.nextFollowUp) return false;
    const [year, month, day] = record.nextFollowUp.split('-').map(Number);
    return new Date(year, month - 1, day) <= today;
  }).length;

  document.getElementById('totalCount').textContent = String(records.length);
  document.getElementById('qualifiedCount').textContent = String(records.filter((record) => record.stage === 'Qualified Clients').length);
  document.getElementById('liveCount').textContent = String(records.filter((record) => record.stage === 'Live Clients').length);
  document.getElementById('followUpCount').textContent = String(dueCount);
}

async function loadRecords() {
  setStatus('Loading company records…');
  records = await requestApi();
  renderRows();
  setStatus(records.length ? `${records.length} ${records.length === 1 ? 'company' : 'companies'} in your pipeline.` : 'Your CRM is ready. Add a company to get started.');
}

function openDialog(record) {
  companyForm.reset();
  dialogError.textContent = '';
  editingId = record?.id || null;
  dialogTitle.textContent = editingId ? 'Edit company' : 'Add a company';
  saveCompanyButton.textContent = editingId ? 'Save changes' : 'Save company';

  if (record) {
    for (const field of fields) {
      companyForm.elements.namedItem(field).value = record[field] || '';
    }
  }

  companyDialog.showModal();
  companyForm.elements.namedItem('company').focus();
}

function downloadCsv() {
  const headers = [
    ['Company / Client', 'company'],
    ['Pipeline Stage', 'stage'],
    ['Industry / Sector', 'industry'],
    ['Website', 'website'],
    ['Location', 'location'],
    ['Company Size / Sites', 'companySize'],
    ['Relationship Status', 'relationshipStatus'],
    ['How We Were Introduced', 'introduction'],
    ['Main Contact', 'contactName'],
    ['Job Title', 'contactTitle'],
    ['Email', 'email'],
    ['Phone / WhatsApp', 'phone'],
    ['Other Key Contacts', 'keyContacts'],
    ['Source / Referral', 'source'],
    ['Open Roles / Need', 'needs'],
    ['Relationship Owner', 'relationshipOwner'],
    ['Last Contacted', 'lastContacted'],
    ['Next Follow-up', 'nextFollowUp'],
    ['Next Action', 'nextAction'],
    ['Priority', 'priority'],
    ['Estimated Value / Fee', 'estimatedValue'],
    ['Commercial Fee / Model', 'commercialFee'],
    ['Service Type', 'serviceType'],
    ['Fee Model', 'feeModel'],
    ['Agreed Fee', 'agreedFee'],
    ['Currency', 'currency'],
    ['Invoice Trigger', 'invoiceTrigger'],
    ['Payment Terms', 'paymentTerms'],
    ['Guarantee / Replacement Terms', 'guaranteeTerms'],
    ['Checks Included', 'checksIncluded'],
    ['Additional Checks', 'additionalChecks'],
    ['Reference Checks', 'referenceChecks'],
    ['Offer Condition', 'offerCondition'],
    ['Exclusivity', 'exclusivity'],
    ['Candidate Ownership Period', 'ownershipPeriod'],
    ['Cancellation / Refund Terms', 'cancellationTerms'],
    ['Contract Signed', 'contractSigned'],
    ['Agreement Date', 'agreementDate'],
    ['Special Conditions', 'specialConditions'],
    ['Recruitment Activity / Notes', 'activityNotes'],
    ['Notes', 'notes'],
  ];
  const escapeCell = (value) => {
    let safeValue = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(safeValue)) safeValue = `'${safeValue}`;
    return `"${safeValue.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.map(([label]) => escapeCell(label)).join(','),
    ...records.map((record) => headers.map(([, field]) => escapeCell(record[field])).join(',')),
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'recruitment-crm.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleUser(user) {
  identityReady = true;
  currentUser = user;
  clearTimeout(identityInitTimeout);
  logoutButton.hidden = !user;

  if (!identity) {
    showAccess('Netlify Identity is not available on this deployment.');
    return;
  }

  if (!user) {
    showAccess('Sign in with an administrator account to open the CRM.', true);
    return;
  }

  if (!isAdmin(user)) {
    showAccess('This account does not have administrator access.');
    return;
  }

  accessPanel.hidden = true;
  crmApp.hidden = false;
  try {
    await loadRecords();
  } catch (error) {
    setStatus(error.message, true);
  }
}

document.getElementById('addCompanyButton').addEventListener('click', () => openDialog());
document.getElementById('closeDialogButton').addEventListener('click', () => companyDialog.close());
document.getElementById('cancelDialogButton').addEventListener('click', () => companyDialog.close());
document.getElementById('searchInput').addEventListener('input', renderRows);
document.getElementById('stageFilter').addEventListener('change', renderRows);
document.getElementById('exportButton').addEventListener('click', downloadCsv);

companyRows.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');

  if (editButton) {
    const record = records.find((item) => item.id === editButton.dataset.edit);
    if (record) openDialog(record);
  }

  if (deleteButton) {
    const record = records.find((item) => item.id === deleteButton.dataset.delete);
    if (!record || !window.confirm(`Delete ${record.company} from the CRM? This cannot be undone.`)) return;
    try {
      records = await requestApi('DELETE', null, record.id);
      renderRows();
      setStatus(`${record.company} was deleted.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }
});

companyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  dialogError.textContent = '';
  saveCompanyButton.disabled = true;

  const record = Object.fromEntries(fields.map((field) => [
    field,
    companyForm.elements.namedItem(field).value.trim(),
  ]));

  try {
    records = await requestApi(editingId ? 'PUT' : 'POST', record, editingId);
    companyDialog.close();
    renderRows();
    setStatus(editingId ? 'Company details updated.' : 'Company added to the pipeline.');
  } catch (error) {
    dialogError.textContent = error.message;
  } finally {
    saveCompanyButton.disabled = false;
  }
});

function initializeIdentity(loadedIdentity) {
  identity = loadedIdentity;
  if (!identity) {
    identityReady = true;
    clearTimeout(identityInitTimeout);
    showAccess('Netlify Identity could not be loaded. Check the site deployment and try again.');
    return;
  }

  identity.on('init', handleUser);
  identity.on('login', (user) => {
    identity.close();
    handleUser(user);
  });
  identity.on('logout', () => handleUser(null));
  loginButton.addEventListener('click', () => identity.open('login'));
  identity.init();
}

if (window.netlifyIdentityReady) {
  identityInitTimeout = window.setTimeout(() => {
    if (!identityReady) showAccess('Netlify Identity is not responding. Check that Identity is enabled for this Netlify site.');
  }, 10000);
  window.netlifyIdentityReady.then(initializeIdentity);
} else {
  identityReady = true;
  showAccess('Netlify Identity is not available on this deployment.');
}

logoutButton.addEventListener('click', () => identity?.logout());
