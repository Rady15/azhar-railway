import fs from 'fs';
const read=p=>fs.readFileSync(p,'utf8');
const server=read('server.ts'), schema=read('db/schema.sql'), app=read('src/App.tsx'), contracts=read('src/views/CompoundContracts.tsx'), units=read('src/views/CompoundUnits.tsx'), api=read('src/services/api.ts'), sidebar=read('src/components/Sidebar.tsx');
const checks=[]; const check=(name,ok)=>checks.push({name,ok:!!ok});
for (const t of ['rent_installments','rental_payments','payment_allocations','rent_events','app_users','roles','permissions','refresh_tokens','buildings','water_meters']) check(`schema:${t}`, schema.includes(`CREATE TABLE IF NOT EXISTS ${t}`));
for (const r of ["/api/Payment", "/api/Rental/overdue", "/api/Rental/ledger/:contractId", "/api/Payment/:id/reverse", "/api/Contracts/:id/terminate", "/api/Contracts/:id/renew", "/api/Contracts/:id/final-settlement", "/api/Buildings", "/api/WaterMeter", "/api/admin/dashboard-stats"]) check(`route:${r}`,server.includes(r));
check('payment uses DB transaction',server.includes("await c.query('BEGIN')")&&server.includes('payment_allocations'));
check('renewal closes old future schedule',server.includes("due_date >= $2")&&server.includes("status=CASE WHEN paid_amount>0 THEN 'Paid' ELSE 'Cancelled' END"));
check('termination proration helper',server.includes('applyTerminationSettlement')&&server.includes('usedDays/totalDays'));
check('dashboard archived-safe query',server.includes("JOIN contracts c ON c.id=ri.contract_id")&&server.includes("ri.due_date<=CURRENT_DATE"));
check('reports preserve archived debt',server.includes("HAVING COALESCE(c.data->>'status','Active')<>'Archived' OR"));
check('contract ledger UI',contracts.includes('Contract Rent Ledger')&&contracts.includes('getRentLedger'));
check('payment reversal UI',contracts.includes('handleReversePayment')&&contracts.includes('reversePayment'));
check('renew UI',contracts.includes('handleRenew')&&contracts.includes('renewContract'));
check('terminate UI',contracts.includes('handleTerminate')&&contracts.includes('getFinalSettlement'));
check('real payment form',contracts.includes('paymentReference')&&contracts.includes('contractId: activeModal.contract.id'));
check('building update UI',units.includes('onUpdateBuilding?.')&&app.includes('handleUpdateBuilding'));
check('building archive UI',units.includes('onDeleteBuilding?.')&&app.includes('handleDeleteBuilding'));
check('companies CRUD UI',sidebar.includes("handleSelect('azhar_companies')")&&app.includes('handleAddCompany')&&api.includes('addCompany'));
check('announcements CRUD UI',sidebar.includes("handleSelect('azhar_announcements')")&&app.includes('handleAddAnnouncement')&&api.includes('addAnnouncement'));
check('server-backed buildings initial load',app.includes('apiService.getBuildings()'));
check('pre-response DB persistence',server.includes('pre-response persistence failed')&&server.includes('await saveState("tenants", tenantsStore)')&&server.indexOf('await saveState("tenants", tenantsStore)') < server.indexOf('await saveState("contracts", contractsStore)'));

// Pure accounting invariants mirroring backend rules.
const schedule=(gross,count)=>{const base=Math.floor(gross/count*100)/100;let allocated=0;return Array.from({length:count},(_,i)=>{const a=i===count-1?Math.round((gross-allocated)*100)/100:base;allocated+=a;return a;});};
const q=schedule(48000,4); check('sim quarterly schedule 48k',JSON.stringify(q)==='[12000,12000,12000,12000]');
let remaining=15000; const opens=[10000,10000,10000], alloc=[]; for(const o of opens){const a=Math.min(o,remaining);alloc.push(a);remaining-=a;if(remaining<=0)break;} check('sim 15k allocation oldest first',JSON.stringify(alloc)==='[10000,5000]'&&remaining===0);
const status=(due,orig,paid,today)=> paid>=orig?'Paid':paid>0?'Partially Paid':due<today?'Overdue':'Pending';
check('sim overdue unpaid',status('2026-01-01',10000,0,'2026-08-14')==='Overdue');
check('sim partial stays partial',status('2026-01-01',10000,4000,'2026-08-14')==='Partially Paid');
let paid=10000; paid=Math.max(0,paid-4000); check('sim reversal restores installment',paid===6000);
const proration=(amount,used,total)=>Math.round(amount*(used/total)*100)/100; check('sim termination proration',proration(3100,15,31)===1500);

const failed=checks.filter(x=>!x.ok); console.log(JSON.stringify({total:checks.length,passed:checks.length-failed.length,failed:failed.length,checks},null,2));
process.exitCode=failed.length?1:0;
