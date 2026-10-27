import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import crmFunction from '../netlify/functions/crm.mjs';

const crmHtml = await readFile(new URL('../crm/index.html', import.meta.url), 'utf8');
const crmScript = await readFile(new URL('../crm/crm.js', import.meta.url), 'utf8');
const functionSource = await readFile(new URL('../netlify/functions/crm.mjs', import.meta.url), 'utf8');
const companyFormHtml = crmHtml.match(/<form id="companyForm">([\s\S]*?)<\/form>/)[1];

test('CRM form fields are represented in browser and server validation', () => {
  const formFields = [...companyFormHtml.matchAll(/\bname="([^"]+)"/g)].map(([, name]) => name).sort();
  const browserFieldBlock = crmScript.match(/const fields = \[([\s\S]*?)\n\];/);
  const browserFields = [...browserFieldBlock[1].matchAll(/'([^']+)'/g)].map(([, name]) => name).sort();
  const serverFieldBlock = functionSource.match(/const fields = \{([\s\S]*?)\n\};/);
  const serverFields = [...serverFieldBlock[1].matchAll(/^\s{2}(\w+):/gm)].map(([, name]) => name).sort();

  assert.deepEqual(formFields, browserFields);
  assert.deepEqual(browserFields, serverFields);
});

test('CRM API rejects requests without an authenticated user', async () => {
  delete globalThis.netlifyIdentityContext;
  const response = await crmFunction(new Request('https://example.test/api/crm'));
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /sign in/i);
});

test('CRM API rejects authenticated users without the admin role', async () => {
  globalThis.netlifyIdentityContext = {
    user: {
      id: 'user-id',
      email: 'member@example.test',
      app_metadata: { roles: ['member'] },
    },
  };
  const response = await crmFunction(new Request('https://example.test/api/crm'));
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /admin access/i);
  delete globalThis.netlifyIdentityContext;
});
