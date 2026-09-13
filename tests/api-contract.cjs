const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require(require.resolve('typescript', { paths: [process.env.FE_ROOT || path.resolve(__dirname, '..')] }));
const root = path.resolve(__dirname, '..', 'src');
const calls = [];
const jsx = (type, props) => ({ type, props });
const store = {};
global.localStorage = { getItem: key => store[key] ?? null, setItem: (key, value) => { store[key] = value; }, removeItem: key => { delete store[key]; } };
let events = 0;
global.window = { dispatchEvent: () => { events++; } };
global.FormData = class { constructor(values) { this.values = values; } get(key) { return this.values[key] ?? null; } };
function load(file, overrides = {}) {
  const output = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => {
    if (overrides[name]) return overrides[name];
    if (name === 'react') return { useState: initial => [initial, () => {}], useEffect: () => {} };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    throw new Error(`Unexpected dependency ${name}`);
  }, module, module.exports);
  return module.exports;
}
async function main() {
  const selection = load('services/project-selection.ts');
  for (const invalid of [undefined, '', 'NaN', -2, 0, 1.5]) assert.equal(selection.recordId(invalid), undefined);
  selection.selectProject(4); assert.equal(selection.getSelectedProjectId(), 4); assert.equal(events, 1);
  selection.selectProject(4); assert.equal(events, 1);
  selection.selectProject(undefined); assert.equal(selection.getSelectedProjectId(), undefined); assert.equal(events, 2);
  const api = { apiRequest: async (url, options) => { calls.push({ url, body: options?.body && JSON.parse(options.body) }); return { items: [], pagination: { totalPages: 1 } }; } };
  const business = load('services/business.ts', { './api': api });
  await business.updateDealStage(17, 23); assert.deepEqual(calls.pop(), { url: '/crm/deals/17/stage', body: { stageId: 23 } });
  await business.financeOverview(4); assert.equal(calls.pop().url, '/finance/overview?projectId=4');
  const mutations = load('services/mutations.ts', { './api': api });
  const Panel = load('components/CreateResourcePanel.tsx', { '../services/mutations': mutations, '../services/business': business, '../services/p0': { createAITask: async payload => { calls.push({ url: '/ai/tasks', body: payload }); } } }).default;
  async function submit(module, section, values, projectId = 4) {
    const tree = Panel({ module, section, projectId, onClose() {}, onDone() {} });
    await tree.props.children.props.onSubmit({ preventDefault() {}, currentTarget: values });
    return calls.pop();
  }
  const automation = await submit('automations', 'automations', { name: 'Weekly review', cron: '0 9 * * 1', assistant: 'finance' });
  assert.equal(automation.body.projectId, 4);
  assert.deepEqual(automation.body.actions, [{ type: 'generate_report', payload: { title: 'Weekly review', assistant: 'finance' } }]);
  const deal = await submit('crm', 'deals', { name: 'Deal', companyId: '21', contactId: '34', expectedCloseDate: '', value: '0', currency: 'EUR' });
  assert.equal(deal.body.companyId, 21); assert.equal(deal.body.contactId, 34); assert.equal(deal.body.value, 0); assert.equal('expectedCloseDate' in deal.body, false);
  const invoice = await submit('finance', 'invoices', { companyId: '21', currency: 'EUR', itemDescription: 'Service', quantity: '2', unitPrice: '12.50' });
  assert.equal(invoice.body.projectId, 4); assert.equal(invoice.body.companyId, 21); assert.equal(invoice.body.items[0].unitPrice, 12.5); assert.equal('dueDate' in invoice.body, false);
  console.log('PASS: project selection, numeric relation IDs, stage payload, finance scope, automation payload, blank dates, decimal amounts');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
