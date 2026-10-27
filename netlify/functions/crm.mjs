import { getStore as openStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';

const recordPrefix = 'company:';
const stages = ['Cold Leads', 'Hot Leads', 'Qualified Clients', 'Live Clients'];
const priorities = ['High', 'Medium', 'Low'];
const fields = {
  company: 160,
  stage: 40,
  industry: 120,
  website: 300,
  location: 160,
  companySize: 120,
  relationshipStatus: 80,
  introduction: 200,
  contactName: 120,
  contactTitle: 120,
  email: 254,
  phone: 80,
  keyContacts: 3000,
  source: 200,
  needs: 1000,
  relationshipOwner: 120,
  lastContacted: 10,
  nextFollowUp: 10,
  nextAction: 500,
  priority: 20,
  estimatedValue: 100,
  commercialFee: 200,
  serviceType: 120,
  feeModel: 120,
  agreedFee: 120,
  currency: 40,
  invoiceTrigger: 160,
  paymentTerms: 160,
  guaranteeTerms: 300,
  checksIncluded: 300,
  additionalChecks: 300,
  referenceChecks: 300,
  offerCondition: 300,
  exclusivity: 100,
  ownershipPeriod: 100,
  cancellationTerms: 500,
  contractSigned: 40,
  specialConditions: 1000,
  agreementDate: 10,
  activityNotes: 3000,
  notes: 2000,
};
let crmStore;

function getCrmStore() {
  crmStore ??= openStore('recruitment-crm', { consistency: 'strong' });
  return crmStore;
}

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

async function getRecords() {
  const store = getCrmStore();
  const { blobs } = await store.list({ prefix: recordPrefix });
  const records = await Promise.all(
    blobs.map(({ key }) => store.get(key, { type: 'json' })),
  );
  return records.filter(Boolean);
}

function getRecordKey(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? `${recordPrefix}${id}`
    : null;
}

function isValidDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const record = {};
  for (const [field, maxLength] of Object.entries(fields)) {
    const value = input[field] ?? '';
    if (typeof value !== 'string' || value.length > maxLength) return null;
    record[field] = value.trim();
  }

  if (!record.company || !stages.includes(record.stage)) return null;
  if (!priorities.includes(record.priority)) return null;
  if (!isValidDate(record.lastContacted) || !isValidDate(record.nextFollowUp) || !isValidDate(record.agreementDate)) return null;
  if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) return null;

  return record;
}

export default async (request) => {
  let user;
  try {
    user = await getUser();
  } catch (error) {
    console.error('Unable to verify CRM identity:', error);
    return jsonResponse({ error: 'Unable to verify your sign-in. Please log in again.' }, 401);
  }

  if (!user) return jsonResponse({ error: 'Please sign in to access the CRM.' }, 401);
  if (!user.roles?.includes('admin')) {
    return jsonResponse({ error: 'Admin access is required to use the CRM.' }, 403);
  }

  try {
    if (request.method === 'GET') {
      return jsonResponse(await getRecords());
    }

    if (request.method === 'POST' || request.method === 'PUT') {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse({ error: 'The submitted data is not valid JSON.' }, 400);
      }

      const record = validateRecord(payload);
      if (!record) {
        return jsonResponse({ error: 'Check the required company, stage, priority, date, and email fields.' }, 400);
      }

      if (request.method === 'POST') {
        const records = await getRecords();
        if (records.some((entry) => entry.company.toLowerCase() === record.company.toLowerCase())) {
          return jsonResponse({ error: 'A company with that name is already in the CRM.' }, 409);
        }

        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        await getCrmStore().setJSON(`${recordPrefix}${id}`, { ...record, id, createdAt: now, updatedAt: now });
      } else {
        const id = new URL(request.url).searchParams.get('id');
        const key = getRecordKey(id);
        if (!key) return jsonResponse({ error: 'A valid company ID is required.' }, 400);
        const store = getCrmStore();
        const existing = await store.get(key, { type: 'json' });
        if (!existing) return jsonResponse({ error: 'That company could not be found.' }, 404);

        const records = await getRecords();
        if (records.some((entry) => entry.id !== id && entry.company.toLowerCase() === record.company.toLowerCase())) {
          return jsonResponse({ error: 'A company with that name is already in the CRM.' }, 409);
        }

        await store.setJSON(key, {
          ...record,
          id,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        });
      }

      return jsonResponse(await getRecords());
    }

    if (request.method === 'DELETE') {
      const id = new URL(request.url).searchParams.get('id');
      const key = getRecordKey(id);
      if (!key) return jsonResponse({ error: 'A valid company ID is required.' }, 400);

      const store = getCrmStore();
      const record = await store.get(key, { type: 'json' });
      if (!record) return jsonResponse({ error: 'That company could not be found.' }, 404);
      await store.delete(key);
      return jsonResponse(await getRecords());
    }

    return jsonResponse({ error: 'This request method is not supported.' }, 405);
  } catch (error) {
    console.error('Unable to process CRM request:', error);
    return jsonResponse({ error: 'The CRM could not complete that request. Please try again.' }, 500);
  }
};
