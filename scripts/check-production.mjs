import fs from 'node:fs';
const schema=fs.readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.ts',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../src/services/api.ts',import.meta.url),'utf8');
const checks=[
 ['rent_installments table',schema.includes('CREATE TABLE IF NOT EXISTS rent_installments')],
 ['rental_payments table',schema.includes('CREATE TABLE IF NOT EXISTS rental_payments')],
 ['payment_allocations table',schema.includes('CREATE TABLE IF NOT EXISTS payment_allocations')],
 ['rent_events table',schema.includes('CREATE TABLE IF NOT EXISTS rent_events')],
 ['water_meters table',schema.includes('CREATE TABLE IF NOT EXISTS water_meters')],
 ['post payment API',server.includes('app.post("/api/Payment"')],
 ['payment allocation',server.includes('INSERT INTO payment_allocations')],
 ['reverse payment API',server.includes("/api/Payment/:id/reverse")],
 ['overdue API',server.includes("/api/Rental/overdue")],
 ['ledger API',server.includes("/api/Rental/ledger/:contractId")],
 ['renew contract API',server.includes("/api/Contracts/:id/renew")],
 ['terminate contract API',server.includes("/api/Contracts/:id/terminate")],
 ['water CRUD',server.includes("/api/WaterMeter/:id")],
 ['electricity CRUD',server.includes('app.put("/api/ElectricityMeter/:id"')],
 ['tenant password DB API',server.includes("/api/admin/tenants/:id/password")],
 ['staff password DB API',server.includes("/api/admin/staff/:id/password")],
 ['real payment UI handler',app.includes('await apiService.addPayment')],
 ['partial payment modal',fs.readFileSync(new URL('../src/views/DashboardDues.tsx',import.meta.url),'utf8').includes('Record Rent Payment')],
 ['water API client',api.includes("authedFetch('/WaterMeter')")],
 ['reverse payment client',api.includes('reversePayment(id:string')],
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`); if(!ok)failed++;}
if(failed){console.error(`\n${failed} production checks failed`);process.exit(1);}console.log(`\nAll ${checks.length} production source checks passed.`);
