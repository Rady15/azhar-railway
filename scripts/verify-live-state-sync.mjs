import fs from 'node:fs';
const api=fs.readFileSync('src/services/api.ts','utf8');
const app=fs.readFileSync('src/App.tsx','utf8');
const cc=fs.readFileSync('src/views/CompoundContracts.tsx','utf8');
const dues=fs.readFileSync('src/views/DashboardDues.tsx','utf8');
const server=fs.readFileSync('server.ts','utf8');
const checks=[
 ['mutation broadcasts data change', api.includes("window.dispatchEvent(new CustomEvent('azhar:data-changed'" )],
 ['App listens for global mutation refresh', app.includes("window.addEventListener('azhar:data-changed'" )],
 ['App reloads even empty unit lists', app.includes("if (unitsRes.status === 'fulfilled') setUnits(unitsRes.value)")],
 ['App reloads even empty tenant lists', app.includes("if (tenantsRes.status === 'fulfilled') setTenants(tenantsRes.value)")],
 ['dues use ledger remaining', api.includes('const remainingAmount = Math.max(0, Number(fin.remainingAmount || 0));')],
 ['tenants use ledger remaining', api.includes('fin ? Math.max(0, Number(fin.remainingAmount || 0))')],
 ['payment capped by outstanding backend', server.includes('amount > outstanding + 0.005')],
 ['payment modal capped by outstanding UI', cc.includes('normalizedAmount > currentRemaining + 0.005')],
 ['dues modal capped by outstanding UI', dues.includes('amount>outstanding+0.005')],
 ['payment modal loads fresh ledger', cc.includes('const openPayment = async (contract: Contract)') && cc.includes('apiService.getRentLedger(contract.id)')],
 ['partial payment shown from paidAmount', cc.includes('(inst as any).paidAmount ??')],
 ['modal total paid uses ledger finance', cc.includes('Number(ledgerData.finance?.paid || 0)')],
 ['unit occupancy uses contract date range frontend', api.includes('(!ends || ends >= today)')],
 ['unit availability uses contract date range backend', server.includes('(!end || end >= today)')],
 ['no hard reload for renew/terminate', !cc.includes('window.location.reload()')],
];
let failed=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${n}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} passed`);process.exitCode=failed?1:0;
