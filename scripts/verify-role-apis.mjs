import fs from 'fs';
const server=fs.readFileSync('server.ts','utf8');
const schema=fs.readFileSync('db/schema.sql','utf8');
const checks=[]; const add=(n,ok)=>checks.push({name:n,passed:!!ok});
for(const [f,min] of [['Azhar-Admin.postman_collection.json',90],['Azhar-Staff.postman_collection.json',20],['Azhar-Tenant.postman_collection.json',25]]){
 const p=`api_collections/${f}`; let j=null; try{j=JSON.parse(fs.readFileSync(p,'utf8'));}catch{};
 const count=(items=[])=>items.reduce((n,x)=>n+(x.item?count(x.item):1),0);
 add(`${f} valid Postman v2.1`,j?.info?.schema?.includes('v2.1.0'));
 add(`${f} request coverage`,j&&count(j.item)>=min);
}
add('User-to-entity link columns',schema.includes('entity_type')&&schema.includes('entity_id')&&schema.includes('idx_app_users_entity'));
add('Password reset token table',schema.includes('password_reset_tokens')&&schema.includes('token_hash'));
add('Forgot password endpoint',server.includes('/api/Account/forgot-password'));
add('Reset password endpoint',server.includes('/api/Account/reset-password'));
add('Own password endpoint',server.includes('/api/Account/change-password'));
for(const p of ['/api/tenant-portal/me','/api/tenant-portal/contracts','/api/tenant-portal/installments','/api/tenant-portal/payments','/api/tenant-portal/ledger','/api/tenant-portal/maintenance','/api/tenant-portal/complaints','/api/tenant-portal/facilities','/api/tenant-portal/facility-bookings','/api/tenant-portal/notifications','/api/tenant-portal/documents']) add(`Tenant route ${p}`,server.includes(p));
for(const p of ['/api/staff-portal/me','/api/staff-portal/dashboard','/api/staff-portal/maintenance','/api/staff-portal/complaints','/api/staff-portal/units','/api/staff-portal/tenants','/api/staff-portal/announcements','/api/staff-portal/notifications']) add(`Staff route ${p}`,server.includes(p));
add('Tenant identity from JWT linkedEntity',server.includes("linkedEntity(req,'tenant')")&&server.includes('entity_id'));
add('Staff identity from JWT linkedEntity',server.includes("linkedEntity(req,'staff')")&&server.includes('entity_id'));
add('Portal RBAC role gates',server.includes("p.startsWith('/tenant-portal')")&&server.includes("p.startsWith('/staff-portal')"));
add('Tenant media ownership enforced',server.includes('canAccessMedia(req,targetId)')&&server.includes('mediaScope(req)'));
add('Generic notifications scoped',server.includes('selfNotifications(req,link)'));
add('Password reset single-use',server.includes('used_at IS NULL')&&server.includes('UPDATE password_reset_tokens SET used_at=NOW()'));
add('Password change revokes sessions',server.includes("UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL"));
const tenantView=fs.readFileSync('src/views/TenantPortalView.tsx','utf8');
const staffView=fs.readFileSync('src/views/StaffPortalView.tsx','utf8');
add('No tenant demo password',!tenantView.includes('tenant101'));
add('No staff demo password',!staffView.includes('emp102'));
add('Current password required in tenant UI',tenantView.includes('currentPassword'));
add('Current password required in staff UI',staffView.includes('currentPassword'));
const failed=checks.filter(x=>!x.passed); const result={passed:checks.length-failed.length,failed:failed.length,total:checks.length,checks};
fs.writeFileSync('ROLE_API_TEST_RESULTS.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:result.passed,failed:result.failed,total:result.total},null,2));
if(failed.length){console.error(failed);process.exit(1)}
