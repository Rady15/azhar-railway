import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";
const DATABASE_URL = process.env.DATABASE_URL || "";
const isProduction = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET || "azhar-development-secret-change-me";
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
let dbPool: any = null;

const TABLES: Record<string, string> = {
  tenants: "tenants", contracts: "contracts", houses: "houses", staff: "staff",
  payments: "payments", electricityMeters: "electricity_meters", maintenance: "maintenance",
  letters: "letters", announcements: "announcements", complaints: "complaints", expenses: "expenses",
  companies: "companies", facilities: "facilities", facilityBookings: "facility_bookings", notifications: "notifications"
};

function normalizeSearch(value: unknown) { return String(value ?? "").trim().toLocaleLowerCase("en"); }
function matchesQuery(item: any, q: string) {
  if (!q) return true;
  const needle = normalizeSearch(q);
  return Object.values(item || {}).some((value) => value != null && typeof value !== "object" && normalizeSearch(value).includes(needle));
}
function searchText(item: any) {
  return Object.values(item || {}).filter(v => v != null && typeof v !== "object").map(v => String(v)).join(" ").slice(0, 12000);
}
function safeContentDisposition(fileName: unknown, disposition: "inline" | "attachment" = "inline") {
  const raw = String(fileName || "file").replace(/[\r\n]/g, "").trim() || "file";
  const extMatch = raw.match(/\.[A-Za-z0-9]{1,10}$/);
  const ext = extMatch ? extMatch[0] : "";
  const asciiBase = raw.replace(ext, "").normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "file";
  const ascii = `${asciiBase}${ext}`.replace(/"/g, "");
  const encoded = encodeURIComponent(raw).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
function paginated<T>(items: T[], req: any) {
  const pageRaw = Number(req.query.page || 0), pageSizeRaw = Number(req.query.pageSize || req.query.limit || 0);
  if (!pageRaw && !pageSizeRaw) return items;
  const page = Math.max(1, pageRaw || 1), pageSize = Math.min(200, Math.max(1, pageSizeRaw || 25));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length, totalPages: Math.ceil(items.length / pageSize) };
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
function verifyPassword(password: string, encoded: string) {
  try {
    const [alg, saltHex, hashHex] = encoded.split("$");
    if (alg !== "scrypt") return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
    return crypto.timingSafeEqual(expected, actual);
  } catch { return false; }
}
const tokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const b64url = (buf: Buffer) => buf.toString("base64url");
function signJwt(payload: Record<string, any>): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", Buffer.from(JWT_SECRET)).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}
function verifyJwt(token: string): Record<string, any> | null {
  try {
    const [h,b,s] = token.split("."); if (!h || !b || !s) return null;
    const expected = crypto.createHmac("sha256", Buffer.from(JWT_SECRET)).update(`${h}.${b}`).digest();
    const actual = Buffer.from(s, "base64url");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    return payload.exp && payload.exp * 1000 >= Date.now() ? payload : null;
  } catch { return null; }
}

async function initDatabase() {
  if (!DATABASE_URL) {
    if (isProduction) throw new Error("DATABASE_URL is required in production");
    console.warn("[db] DATABASE_URL not set; development memory mode enabled");
    return;
  }
  if (isProduction) {
    const weak = (v:string) => /replace|change|default|example|secret/i.test(v || '');
    if (JWT_SECRET.length < 32 || weak(JWT_SECRET)) throw new Error("JWT_SECRET must be at least 32 random characters and must not be a placeholder in production");
    if (weak(DATABASE_URL)) throw new Error("DATABASE_URL still contains a placeholder value; set a real production database password");
  }
  dbPool = new Pool({ connectionString: DATABASE_URL, ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }, max: Number(process.env.DATABASE_POOL_MAX || 10), idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
  const schema = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await dbPool.query(schema);
  await seedSecurity();
  await seedTestData();
  console.log("[db] PostgreSQL schema, auth and RBAC ready");
}

async function seedSecurity() {
  if (!dbPool) return;
  const permissions = ["dashboard.read","tenants.read","tenants.write","contracts.read","contracts.write","units.read","units.write","payments.read","payments.write","maintenance.read","maintenance.write","complaints.read","complaints.write","staff.read","staff.write","expenses.read","expenses.write","facilities.read","facilities.write","reports.read","companies.read","companies.write","announcements.read","announcements.write","letters.read","letters.write","meters.read","meters.write","notifications.read","notifications.write","media.read","media.write","profile.read","profile.write","admin.manage"];
  await dbPool.query("INSERT INTO roles(name,description) VALUES ('Admin','Full system access'),('Staff','Operational staff'),('Tenant','Tenant portal') ON CONFLICT(name) DO NOTHING");
  for (const code of permissions) await dbPool.query("INSERT INTO permissions(code,description) VALUES($1,$2) ON CONFLICT(code) DO NOTHING", [code, code]);
  await dbPool.query("INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.name='Admin' ON CONFLICT DO NOTHING");
  await dbPool.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code = ANY($1::text[]) WHERE r.name='Staff' ON CONFLICT DO NOTHING`, [["dashboard.read","tenants.read","contracts.read","units.read","payments.read","maintenance.read","maintenance.write","complaints.read","complaints.write","facilities.read","meters.read","notifications.read","profile.read","profile.write","media.read","media.write"]]);
  await dbPool.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code = ANY($1::text[]) WHERE r.name='Tenant' ON CONFLICT DO NOTHING`, [["notifications.read","profile.read","profile.write","media.read","media.write"]]);
  const username = process.env.ADMIN_USERNAME || "m.barmada";
  const email = process.env.ADMIN_EMAIL || "admin@azhar.com";
  const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? "" : "Admin@123");
  if (!adminPassword) throw new Error("ADMIN_PASSWORD is required in production");
  if (isProduction && (adminPassword.length < 12 || /replace|change|default|admin@123/i.test(adminPassword))) throw new Error("ADMIN_PASSWORD must be at least 12 characters and must not be a placeholder in production");
  const existing = await dbPool.query("SELECT id FROM app_users WHERE username=$1 OR email=$2 LIMIT 1", [username,email]);
  let userId = existing.rows[0]?.id;
  if (!userId) {
    const created = await dbPool.query("INSERT INTO app_users(username,email,password_hash,full_name) VALUES($1,$2,$3,$4) RETURNING id", [username,email,hashPassword(adminPassword),"System Administrator"]);
    userId = created.rows[0].id;
  }
  await dbPool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='Admin' ON CONFLICT DO NOTHING", [userId]);

  // Seed staff user (linked to staff entity created in seedTestData)
  const staffUsername = "staff1";
  const staffEmail = "staff1@azhar.com";
  const staffPassword = process.env.STAFF_PASSWORD || "Staff@12345678";
  const staffEntityId = "staff-ahmed-mohamed";
  const existingStaff = await dbPool.query("SELECT id FROM app_users WHERE username=$1 OR email=$2 LIMIT 1", [staffUsername, staffEmail]);
  let staffUserId = existingStaff.rows[0]?.id;
  if (!staffUserId) {
    const created = await dbPool.query("INSERT INTO app_users(username,email,password_hash,full_name,entity_type,entity_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id", [staffUsername, staffEmail, hashPassword(staffPassword), "Ahmed Mohamed", "staff", staffEntityId]);
    staffUserId = created.rows[0].id;
  }
  await dbPool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='Staff' ON CONFLICT DO NOTHING", [staffUserId]);

  // Seed tenant user (linked to tenant entity created in seedTestData)
  const tenantUsername = "tenant1";
  const tenantEmail = "tenant1@azhar.com";
  const tenantPassword = process.env.TENANT_PASSWORD || "Tenant@12345678";
  const tenantEntityId = "tenant-aya-ahmed";
  const existingTenant = await dbPool.query("SELECT id FROM app_users WHERE username=$1 OR email=$2 LIMIT 1", [tenantUsername, tenantEmail]);
  let tenantUserId = existingTenant.rows[0]?.id;
  if (!tenantUserId) {
    const created = await dbPool.query("INSERT INTO app_users(username,email,password_hash,full_name,entity_type,entity_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id", [tenantUsername, tenantEmail, hashPassword(tenantPassword), "Aya Ahmed", "tenant", tenantEntityId]);
    tenantUserId = created.rows[0].id;
  }
  await dbPool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name='Tenant' ON CONFLICT DO NOTHING", [tenantUserId]);
}

async function seedTestData() {
  if (!dbPool) return;
  if (process.env.SKIP_SEED === "true") { console.log("[seed] SKIP_SEED=true, skipping test data seeding"); return; }
  const alreadySeeded = await dbPool.query("SELECT 1 FROM tenants LIMIT 1");
  if (alreadySeeded.rowCount && alreadySeeded.rowCount > 0) return;
  console.log("[seed] Seeding test data...");
  const now = new Date().toISOString();
  const st = (obj: any) => searchText(obj);

  // ─── BUILDINGS ───
  const buildings = [
    { id: "bldg-1", buildingNumber: "1", name: "المبنى الأول", notes: "Building A - 6 floors, 24 units", isActive: true },
    { id: "bldg-2", buildingNumber: "2", name: "المبنى الثاني", notes: "Building B - 6 floors, 24 units", isActive: true },
    { id: "bldg-3", buildingNumber: "3", name: "المبنى الثالث", notes: "Building C - 5 floors, 20 units", isActive: true },
  ];
  for (const b of buildings) {
    await dbPool.query("INSERT INTO buildings(id,building_number,name,notes,is_active,updated_at) VALUES($1,$2,$3,$4,$5,NOW()) ON CONFLICT(id) DO NOTHING", [b.id, b.buildingNumber, b.name, b.notes, b.isActive]);
  }

  // ─── TENANTS ───
  const tenants = [
    { id: "tenant-aya-ahmed", fullName: "Aya Ahmed", fullNameArabic: "آية أحمد", phoneNumber: "0551234567", nationalId: "1098765432", houseNumber: "101", unitNumber: "101", buildingNumber: "1", email: "aya@email.com", isActive: true },
    { id: "tenant-mohammed-ali", fullName: "Mohammed Ali", fullNameArabic: "محمد علي", phoneNumber: "0559876543", nationalId: "1087654321", houseNumber: "205", unitNumber: "205", buildingNumber: "1", email: "mohammed@email.com", isActive: true },
    { id: "tenant-fatma-hassan", fullName: "Fatma Hassan", fullNameArabic: "فاطمة حسن", phoneNumber: "0543216789", nationalId: "1076543210", houseNumber: "312", unitNumber: "312", buildingNumber: "2", email: "fatma@email.com", isActive: true },
    { id: "tenant-omar-khaled", fullName: "Omar Khaled", fullNameArabic: "عمر خالد", phoneNumber: "0567891234", nationalId: "1065432109", houseNumber: "103", unitNumber: "103", buildingNumber: "2", email: "omar@email.com", isActive: true },
    { id: "tenant-nora-saeed", fullName: "Nora Saeed", fullNameArabic: "نورة سعيد", phoneNumber: "0534567890", nationalId: "1054321098", houseNumber: "401", unitNumber: "401", buildingNumber: "3", email: "nora@email.com", isActive: true },
    { id: "tenant-khaled-youssef", fullName: "Khaled Youssef", fullNameArabic: "خالد يوسف", phoneNumber: "0578901234", nationalId: "1043210987", houseNumber: "202", unitNumber: "202", buildingNumber: "3", email: "khaled@email.com", isActive: true },
    { id: "tenant-sara-ibrahim", fullName: "Sara Ibrahim", fullNameArabic: "سارة إبراهيم", phoneNumber: "0523456789", nationalId: "1032109876", houseNumber: "505", unitNumber: "505", buildingNumber: "1", email: "sara@email.com", isActive: true },
    { id: "tenant-ali-hassan", fullName: "Ali Hassan", fullNameArabic: "علي حسن", phoneNumber: "0589012345", nationalId: "1021098765", houseNumber: "301", unitNumber: "301", buildingNumber: "2", email: "ali@email.com", isActive: true },
  ];
  for (const t of tenants) {
    await dbPool.query("INSERT INTO tenants(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [t.id, JSON.stringify(t), st(t)]);
  }

  // ─── STAFF ───
  const staffMembers = [
    { id: "staff-ahmed-mohamed", empCode: "STF-001", name: "Ahmed Mohamed", nameArabic: "أحمد محمد", role: "فني صيانة كهربائية", mobile: "0501111111", whatsapp: "0501111111", nationalId: "2011111111", status: "Active", joiningDate: "2024-01-15", salary: 5000 },
    { id: "staff-hassan-ali", empCode: "STF-002", name: "Hassan Ali", nameArabic: "حسن علي", role: "فني صيانة سباكة", mobile: "0502222222", whatsapp: "0502222222", nationalId: "2022222222", status: "Active", joiningDate: "2024-03-01", salary: 4500 },
    { id: "staff-mahmoud-hussein", empCode: "STF-003", name: "Mahmoud Hussein", nameArabic: "محمود حسين", role: "مسؤول نظافة", mobile: "0503333333", whatsapp: "0503333333", nationalId: "2033333333", status: "Active", joiningDate: "2024-06-10", salary: 4000 },
    { id: "staff-omar-farouk", empCode: "STF-004", name: "Omar Farouk", nameArabic: "عمر فاروق", role: "حارس أمن", mobile: "0504444444", whatsapp: "0504444444", nationalId: "2044444444", status: "Active", joiningDate: "2024-02-20", salary: 4200 },
    { id: "staff-youssef-ibrahim", empCode: "STF-005", name: "Youssef Ibrahim", nameArabic: "يوسف إبراهيم", role: "مشرف صيانة", mobile: "0505555555", whatsapp: "0505555555", nationalId: "2055555555", status: "Active", joiningDate: "2023-11-01", salary: 6500 },
  ];
  for (const s of staffMembers) {
    await dbPool.query("INSERT INTO staff(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [s.id, JSON.stringify(s), st(s)]);
  }

  // ─── COMPANIES ───
  const companies = [
    { id: "comp-001", name: "شركة النظافة المتحدة", nameArabic: "شركة النظافة المتحدة", contactPerson: "خالد العلي", phone: "0556667777", email: "cleaning@united.com", serviceType: "تنظيف", status: "Active" },
    { id: "comp-002", name: "مؤسسة الأمل للصيانة", nameArabic: "مؤسسة الأمل للصيانة", contactPerson: "سعد القحطاني", phone: "0557778888", email: "maintenance@amal.com", serviceType: "صيانة عامة", status: "Active" },
    { id: "comp-003", name: "شركة الأمان الأمنية", nameArabic: "شركة الأمان الأمنية", contactPerson: "عبدالله الشمري", phone: "0558889999", email: "security@aman.com", serviceType: "أمن وحراسة", status: "Active" },
  ];
  for (const c of companies) {
    await dbPool.query("INSERT INTO companies(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [c.id, JSON.stringify(c), st(c)]);
  }

  // ─── CONTRACTS ───
  const contracts = [
    { id: "contract-001", tenantId: "tenant-aya-ahmed", tenantName: "Aya Ahmed", tenantNameArabic: "آية أحمد", contractNo: "AZ-2025-001", unitNumber: "101", houseNumber: "101", buildingNumber: "1", annualRent: 48000, waterYearlyBill: 2400, discount: 0, paidAmount: 30000, remainingAmount: 20400, leaseStartDate: "2025-01-01", leaseEndDate: "2025-12-31", leaseDurationMonths: 12, paymentMethod: "شياكات", paymentFrequency: "quarterly", status: "Active" },
    { id: "contract-002", tenantId: "tenant-mohammed-ali", tenantName: "Mohammed Ali", tenantNameArabic: "محمد علي", contractNo: "AZ-2025-002", unitNumber: "205", houseNumber: "205", buildingNumber: "1", annualRent: 52000, waterYearlyBill: 2600, discount: 2000, paidAmount: 52600, remainingAmount: 0, leaseStartDate: "2025-02-01", leaseEndDate: "2026-01-31", leaseDurationMonths: 12, paymentMethod: "تحويل بنكي", paymentFrequency: "Quarterly", status: "Active" },
    { id: "contract-003", tenantId: "tenant-fatma-hassan", tenantName: "Fatma Hassan", tenantNameArabic: "فاطمة حسن", contractNo: "AZ-2024-003", unitNumber: "312", houseNumber: "312", buildingNumber: "2", annualRent: 44000, waterYearlyBill: 2200, discount: 0, paidAmount: 22000, remainingAmount: 24200, leaseStartDate: "2024-07-01", leaseEndDate: "2025-06-30", leaseDurationMonths: 12, paymentMethod: "شياكات", paymentFrequency: "semi-annual", status: "Active" },
    { id: "contract-004", tenantId: "tenant-omar-khaled", tenantName: "Omar Khaled", tenantNameArabic: "عمر خالد", contractNo: "AZ-2025-004", unitNumber: "103", houseNumber: "103", buildingNumber: "2", annualRent: 46000, waterYearlyBill: 2300, discount: 1000, paidAmount: 15000, remainingAmount: 32300, leaseStartDate: "2025-03-01", leaseEndDate: "2026-02-28", leaseDurationMonths: 12, paymentMethod: "نقداً", paymentFrequency: "quarterly", status: "Active" },
    { id: "contract-005", tenantId: "tenant-nora-saeed", tenantName: "Nora Saeed", tenantNameArabic: "نورة سعيد", contractNo: "AZ-2024-005", unitNumber: "401", houseNumber: "401", buildingNumber: "3", annualRent: 40000, waterYearlyBill: 2000, discount: 0, paidAmount: 42000, remainingAmount: 0, leaseStartDate: "2024-04-01", leaseEndDate: "2025-03-31", leaseDurationMonths: 12, paymentMethod: "تحويل بنكي", paymentFrequency: "Quarterly", status: "Archived" },
    { id: "contract-006", tenantId: "tenant-khaled-youssef", tenantName: "Khaled Youssef", tenantNameArabic: "خالد يوسف", contractNo: "AZ-2025-006", unitNumber: "202", houseNumber: "202", buildingNumber: "3", annualRent: 42000, waterYearlyBill: 2100, discount: 500, paidAmount: 21000, remainingAmount: 22600, leaseStartDate: "2025-01-15", leaseEndDate: "2026-01-14", leaseDurationMonths: 12, paymentMethod: "شياكات", paymentFrequency: "quarterly", status: "Active" },
    { id: "contract-007", tenantId: "tenant-sara-ibrahim", tenantName: "Sara Ibrahim", tenantNameArabic: "سارة إبراهيم", contractNo: "AZ-2025-007", unitNumber: "505", houseNumber: "505", buildingNumber: "1", annualRent: 55000, waterYearlyBill: 2750, discount: 0, paidAmount: 41062, remainingAmount: 16688, leaseStartDate: "2025-06-01", leaseEndDate: "2026-05-31", leaseDurationMonths: 12, paymentMethod: "تحويل بنكي", paymentFrequency: "Quarterly", status: "Active" },
    { id: "contract-008", tenantId: "tenant-ali-hassan", tenantName: "Ali Hassan", tenantNameArabic: "علي حسن", contractNo: "AZ-2025-008", unitNumber: "301", houseNumber: "301", buildingNumber: "2", annualRent: 45000, waterYearlyBill: 2250, discount: 1500, paidAmount: 22875, remainingAmount: 22875, leaseStartDate: "2025-04-01", leaseEndDate: "2026-03-31", leaseDurationMonths: 12, paymentMethod: "نقداً", paymentFrequency: "semi-annual", status: "Active" },
  ];
  for (const c of contracts) {
    await dbPool.query("INSERT INTO contracts(id,tenant_id,data,search_text,updated_at) VALUES($1,$2,$3::jsonb,$4,NOW()) ON CONFLICT(id) DO NOTHING", [c.id, c.tenantId, JSON.stringify(c), st(c)]);
  }

  // ─── PAYMENTS ───
  const payments = [
    { id: "pay-001", tenantId: "tenant-aya-ahmed", tenantName: "Aya Ahmed", contractNo: "AZ-2025-001", amount: 12000, paymentDate: "2025-01-15", paymentMethod: "شياك", receiptNo: "REC-001", status: "Paid", unitNumber: "101" },
    { id: "pay-002", tenantId: "tenant-aya-ahmed", tenantName: "Aya Ahmed", contractNo: "AZ-2025-001", amount: 12000, paymentDate: "2025-04-15", paymentMethod: "شياك", receiptNo: "REC-002", status: "Paid", unitNumber: "101" },
    { id: "pay-003", tenantId: "tenant-mohammed-ali", tenantName: "Mohammed Ali", contractNo: "AZ-2025-002", amount: 4467, paymentDate: "2025-02-10", paymentMethod: "تحويل بنكي", receiptNo: "REC-003", status: "Paid", unitNumber: "205" },
    { id: "pay-004", tenantId: "tenant-mohammed-ali", tenantName: "Mohammed Ali", contractNo: "AZ-2025-002", amount: 4467, paymentDate: "2025-03-10", paymentMethod: "تحويل بنكي", receiptNo: "REC-004", status: "Paid", unitNumber: "205" },
    { id: "pay-005", tenantId: "tenant-mohammed-ali", tenantName: "Mohammed Ali", contractNo: "AZ-2025-002", amount: 4466, paymentDate: "2025-04-10", paymentMethod: "تحويل بنكي", receiptNo: "REC-005", status: "Paid", unitNumber: "205" },
    { id: "pay-006", tenantId: "tenant-fatma-hassan", tenantName: "Fatma Hassan", contractNo: "AZ-2024-003", amount: 22000, paymentDate: "2024-07-01", paymentMethod: "شياك", receiptNo: "REC-006", status: "Paid", unitNumber: "312" },
    { id: "pay-007", tenantId: "tenant-nora-saeed", tenantName: "Nora Saeed", contractNo: "AZ-2024-005", amount: 42000, paymentDate: "2024-04-01", paymentMethod: "تحويل بنكي", receiptNo: "REC-007", status: "Paid", unitNumber: "401" },
    { id: "pay-008", tenantId: "tenant-sara-ibrahim", tenantName: "Sara Ibrahim", contractNo: "AZ-2025-007", amount: 4812, paymentDate: "2025-06-10", paymentMethod: "تحويل بنكي", receiptNo: "REC-008", status: "Paid", unitNumber: "505" },
    { id: "pay-009", tenantId: "tenant-sara-ibrahim", tenantName: "Sara Ibrahim", contractNo: "AZ-2025-007", amount: 4812, paymentDate: "2025-07-10", paymentMethod: "تحويل بنكي", receiptNo: "REC-009", status: "Paid", unitNumber: "505" },
    { id: "pay-010", tenantId: "tenant-khaled-youssef", tenantName: "Khaled Youssef", contractNo: "AZ-2025-006", amount: 10625, paymentDate: "2025-01-20", paymentMethod: "شياك", receiptNo: "REC-010", status: "Paid", unitNumber: "202" },
    { id: "pay-011", tenantId: "tenant-ali-hassan", tenantName: "Ali Hassan", contractNo: "AZ-2025-008", amount: 22875, paymentDate: "2025-04-05", paymentMethod: "نقداً", receiptNo: "REC-011", status: "Paid", unitNumber: "301" },
    { id: "pay-012", tenantId: "tenant-omar-khaled", tenantName: "Omar Khaled", contractNo: "AZ-2025-004", amount: 11500, paymentDate: "2025-03-05", paymentMethod: "نقداً", receiptNo: "REC-012", status: "Paid", unitNumber: "103" },
  ];
  for (const p of payments) {
    await dbPool.query("INSERT INTO payments(id,tenant_id,data,search_text,updated_at) VALUES($1,$2,$3::jsonb,$4,NOW()) ON CONFLICT(id) DO NOTHING", [p.id, p.tenantId, JSON.stringify(p), st(p)]);
  }

  // ─── MAINTENANCE REQUESTS ───
  const maintenanceRequests = [
    { id: "mnt-001", ticketNo: "MNT-001", category: "كهرباء وتكييف", workActivity: "كهرباء وتكييف", description: "التكهيف لا يعمل في غرفة النوم الرئيسية", issueDescription: "التكهيف لا يعمل في غرفة النوم الرئيسية", priority: "High", status: "In Progress", tenantId: "tenant-aya-ahmed", tenantName: "Aya Ahmed", unitNumber: "101", buildingNumber: "1", tenantPhone: "0551234567", assignedStaffId: "staff-ahmed-mohamed", assignedStaffName: "Ahmed Mohamed", requestDate: "2025-07-20", notes: "تم الفحص - يحتاج تعبئة غاز" },
    { id: "mnt-002", ticketNo: "MNT-002", category: "سباكة ومياه", workActivity: "سباكة ومياه", description: "تسريب من الحوض في المطبخ", issueDescription: "تسريب من الحوض في المطبخ", priority: "Medium", status: "New", tenantId: "tenant-mohammed-ali", tenantName: "Mohammed Ali", unitNumber: "205", buildingNumber: "1", tenantPhone: "0559876543", requestDate: "2025-08-01" },
    { id: "mnt-003", ticketNo: "MNT-003", category: "أبواب وأقفال", workActivity: "أبواب وأقفال", description: "المفتاح لا يدور في القفل الرئيسي", issueDescription: "المفتاح لا يدور في القفل الرئيسي", priority: "High", status: "In Progress", tenantId: "tenant-fatma-hassan", tenantName: "Fatma Hassan", unitNumber: "312", buildingNumber: "2", tenantPhone: "0543216789", assignedStaffId: "staff-hassan-ali", assignedStaffName: "Hassan Ali", requestDate: "2025-07-28", notes: "يجب تغيير القفل بالكامل" },
    { id: "mnt-004", ticketNo: "MNT-004", category: "دهانات وديكور", workActivity: "دهانات وديكور", description: "تقشر الطلاء في السقف", issueDescription: "تقشر الطلاء في السقف", priority: "Low", status: "Done", tenantId: "tenant-omar-khaled", tenantName: "Omar Khaled", unitNumber: "103", buildingNumber: "2", tenantPhone: "0567891234", assignedStaffId: "staff-mahmoud-hussein", assignedStaffName: "Mahmoud Hussein", requestDate: "2025-06-15", notes: "تم الانتهاء - تم طلاء السقف مجدداً" },
    { id: "mnt-005", ticketNo: "MNT-005", category: "أجهزة ومطبخ", workActivity: "أجهزة ومطبخ", description: "الفرن الكهربائي لا يعمل", issueDescription: "الفرن الكهربائي لا يعمل", priority: "Medium", status: "New", tenantId: "tenant-nora-saeed", tenantName: "Nora Saeed", unitNumber: "401", buildingNumber: "3", tenantPhone: "0534567890", requestDate: "2025-08-05" },
    { id: "mnt-006", ticketNo: "MNT-006", category: "كهرباء وتكييف", workActivity: "كهرباء وتكييف", description: "انقطاع متكرر للكهرباء في الصالة", issueDescription: "انقطاع متكرر للكهرباء في الصالة", priority: "High", status: "In Progress", tenantId: "tenant-khaled-youssef", tenantName: "Khaled Youssef", unitNumber: "202", buildingNumber: "3", tenantPhone: "0578901234", assignedStaffId: "staff-ahmed-mohamed", assignedStaffName: "Ahmed Mohamed", requestDate: "2025-07-30", notes: "مشكلة في لوحة الكهرباء الرئيسية" },
    { id: "mnt-007", ticketNo: "MNT-007", category: "سباكة ومياه", workActivity: "سباكة ومياه", description: "بئر المياه بطيء التصريف", issueDescription: "بئر المياه بطيء التصريف", priority: "Low", status: "Done", tenantId: "tenant-sara-ibrahim", tenantName: "Sara Ibrahim", unitNumber: "505", buildingNumber: "1", tenantPhone: "0523456789", assignedStaffId: "staff-hassan-ali", assignedStaffName: "Hassan Ali", requestDate: "2025-07-10", notes: "تم تسليك البئر بنجاح" },
    { id: "mnt-008", ticketNo: "MNT-008", category: "أبواب وأقفال", workActivity: "أبواب وأقفال", description: "باب الحمام لا يُقفل", issueDescription: "باب الحمام لا يُقفل", priority: "Medium", status: "New", tenantId: "tenant-ali-hassan", tenantName: "Ali Hassan", unitNumber: "301", buildingNumber: "2", tenantPhone: "0589012345", requestDate: "2025-08-06" },
  ];
  for (const m of maintenanceRequests) {
    await dbPool.query("INSERT INTO maintenance(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [m.id, JSON.stringify(m), st(m)]);
  }

  // ─── COMPLAINTS ───
  const complaints = [
    { id: "comp-c001", ticketNo: "CMP-001", category: "إزعاج وضوضاء", description: "الجيران يشغلون موسيقى بصوت عالي بعد منتصف الليل بشكل متكرر", priority: "High", status: "In Progress", tenantId: "tenant-aya-ahmed", tenantName: "Aya Ahmed", unitNumber: "101", buildingNumber: "1", resolutionNotes: "تم التواصل مع الجيران وتحذيرهم رسمياً", createdAt: "2025-07-22T10:30:00Z" },
    { id: "comp-c002", ticketNo: "CMP-002", category: "نظافة الممرات", description: "نظافة الطابق الثالث سيئة - أوساخ وقمامة في الممر", priority: "Medium", status: "Resolved", tenantId: "tenant-fatma-hassan", tenantName: "Fatma Hassan", unitNumber: "312", buildingNumber: "2", resolutionNotes: "تم تكليف فريق النظافة بتنظيف الممر فوراً وزيادةדירות التنظيف اليومية", createdAt: "2025-07-25T14:00:00Z" },
    { id: "comp-c003", ticketNo: "CMP-003", category: "مواقف السيارات", description: "شخص يضع كرسي في موقف سيارتي المخصص يومياً", priority: "Medium", status: "New", tenantId: "tenant-mohammed-ali", tenantName: "Mohammed Ali", unitNumber: "205", buildingNumber: "1", createdAt: "2025-08-02T09:15:00Z" },
    { id: "comp-c004", ticketNo: "CMP-004", category: "أمن المجمع", description: "بوابة المدخل الخلفية مفتوحة دائماً في الليل", priority: "High", status: "In Progress", tenantId: "tenant-omar-khaled", tenantName: "Omar Khaled", unitNumber: "103", buildingNumber: "2", resolutionNotes: "تم إخطار فريق الأمن بضرورة إغلاق البوابة بعد الساعة 11 مساءً", createdAt: "2025-07-29T22:00:00Z" },
    { id: "comp-c005", ticketNo: "CMP-005", category: "خدمات المسبح", description: "المسبح غير نظيف والمياه عكرة منذ أيام", priority: "High", status: "New", tenantId: "tenant-sara-ibrahim", tenantName: "Sara Ibrahim", unitNumber: "505", buildingNumber: "1", createdAt: "2025-08-04T16:45:00Z" },
    { id: "comp-c006", ticketNo: "CMP-006", category: "إزعاج وضوضاء", description: "أعمال صيانة تتم في وضح النهار بصوت شديد جداً في weekends", priority: "Low", status: "Resolved", tenantId: "tenant-khaled-youssef", tenantName: "Khaled Youssef", unitNumber: "202", buildingNumber: "3", resolutionNotes: "تم تحديد مواعيد الصيانة في weekdays فقط من 8 صباحاً لـ 6 مساءً", createdAt: "2025-07-18T11:00:00Z" },
  ];
  for (const c of complaints) {
    await dbPool.query("INSERT INTO complaints(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [c.id, JSON.stringify(c), st(c)]);
  }

  // ─── LETTERS ───
  const letters = [
    { id: "ltr-001", title: "تحديث إيجار الوحدة 101", content: "عزيزي المستأجر أحمد، نود إبلاغكم بضرورة تحديث دفعة الإيجار للفترة القادمة وفقاً للعقد الموقع.يرجى المراجعة خلال 15 يوم عمل.", recipientType: "SpecificTenant", recipientName: "آية أحمد", tenantId: "tenant-aya-ahmed", sentByName: "إدارة المجمع", sentByNameAr: "إدارة المجمع", sentAt: "2025-07-01T09:00:00Z", category: "إيجار" },
    { id: "ltr-002", title: "صيانة الطابق الثاني - إشعار مسبق", content: "نود إبلاغ جميع سكان الطابق الثاني بأنه ستتم أعمال صيانة للكهرباء يوم الأحد القادم من 9 صباحاً حتى 2 ظهراً.يرجى الترتيب.", recipientType: "AllTenants", sentByName: "قسم الصيانة", sentByNameAr: "قسم الصيانة", sentAt: "2025-07-15T08:00:00Z", category: "صيانة" },
    { id: "ltr-003", title: "تنبيه أمني - إغلاق الأبواب", content: "نreminder لجميع المستأجرين بضرورة إقفال أبواب الشقق عند الخروج وعدم ترك الأبواب مفتوحة لأسباب أمنية.", recipientType: "AllTenants", sentByName: "قسم الأمن", sentByNameAr: "قسم الأمن", sentAt: "2025-07-20T10:00:00Z", category: "أمني" },
    { id: "ltr-004", title: "resultado دورة المياه - تقرير فني", content: "تم الانتهاء من إصلاح تسريب المياه في الوحدة 312.يرجى متابعة حالياً خلال أسبوع والإبلاغ عن أي مشاكل.", recipientType: "SpecificTenant", recipientName: "فاطمة حسن", tenantId: "tenant-fatma-hassan", sentByName: "أحمد محمد - فني صيانة", sentByNameAr: "أحمد محمد", sentAt: "2025-07-28T14:30:00Z", category: "صيانة" },
    { id: "ltr-005", title: "دعوة لاجتماع سنوي للمستأجرين", content: "يسرنا دعوتكم لاجتماع سنوي لمناقشة خطة التطوير للمجمع وخدمة المستأجرين. الاجتماع يوم السبت 15/8 الساعة 7 مساءً في قاعة المرافق.", recipientType: "AllTenants", sentByName: "مدير المجمع", sentByNameAr: "مدير المجمع", sentAt: "2025-08-01T09:00:00Z", category: "عام" },
    { id: "ltr-006", title: "شكر وتقدير - فريق النظافة", content: "نود شكر وتقدير فريق النظافة على الجهود المبذولة في الحفاظ على نظافة المجمع خلال الفترة الماضية.نشكركم على تعاونكم.", recipientType: "Staff", recipientName: "فريق النظافة", sentByName: "مدير المجمع", sentByNameAr: "مدير المجمع", sentAt: "2025-08-03T11:00:00Z", category: "شكر" },
  ];
  for (const l of letters) {
    await dbPool.query("INSERT INTO letters(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [l.id, JSON.stringify(l), st(l)]);
  }

  // ─── ANNOUNCEMENTS ───
  const announcements = [
    { id: "ann-001", title: "صيانة مجدولة - انقطاع مياه مؤقت", name: "صيانة مجدولة - انقطاع مياه مؤقت", description: "سيتم انقطاع المياه يوم الأحد القادم من 8 صباحاً حتى 12 ظهراً لإجراء أعمال صيانة على شبكة المياه الرئيسية.يرجى التخزين المسبق.", body: "سيتم انقطاع المياه يوم الأحد القادم من 8 صباحاً حتى 12 ظهراً لإجراء أعمال صيانة على شبكة المياه الرئيسية.يرجى التخزين المسبق.", announcementDate: "2025-08-01", priority: "High", status: "Active", targetAudience: "all" },
    { id: "ann-002", title: "افتتاح مسبح المجمع رسمياً", name: "افتتاح مسبح المجمع رسمياً", description: "يسعدنا إعلان افتتاح المسبح بشكل رسمي ابتداءً من يوم الجمعة القادمة.مواعيد الاستخدام: من 6 صباحاً لـ 10 مساءً.", body: "يسعدنا إعلان افتتاح المسبح بشكل رسمي ابتداءً من يوم الجمعة القادمة.مواعيد الاستخدام: من 6 صباحاً لـ 10 مساءً.", announcementDate: "2025-07-25", priority: "Medium", status: "Active", targetAudience: "tenants" },
    { id: "ann-003", title: "قوانين جديدة لاستخدام مرافق المجمع", name: "قوانين جديدة لاستخدام مرافق المجمع", description: "نود إبلاغكم بقوانين جديدة لاستخدام مرافق المجمع تشمل: منع הכנסת الطعام للمسبح، استخدام المرافق في المواعيد المحددة فقط، والحفاظ على النظافة.", body: "نود إبلاغكم بقوانين جديدة لاستخدام مرافق المجمع تشمل: منع الطعام للمسبح، استخدام المرافق في المواعيد المحددة فقط، والحفاظ على النظافة.", announcementDate: "2025-07-20", priority: "Medium", status: "Active", targetAudience: "all" },
    { id: "ann-004", title: "تحديث نظام الدفع الإلكتروني", name: "تحديث نظام الدفع الإلكتروني", description: "通知 جميع المستأجرين بأنه سيتم تحديث نظام الدفع الإلكتروني ابتداءً من الشهر القادم.يمكنكم استخدام تطبيق المصرف الجديد لدفع الإيجار.", body: "通知 جميع المستأجرين بأنه سيتم تحديث نظام الدفع الإلكتروني ابتداءً من الشهر القادم.", announcementDate: "2025-08-05", priority: "Low", status: "Active", targetAudience: "tenants" },
  ];
  for (const a of announcements) {
    await dbPool.query("INSERT INTO announcements(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [a.id, JSON.stringify(a), st(a)]);
  }

  // ─── FACILITIES ───
  const facilities = [
    { id: "fac-001", name: "المسبح الخارجي", title: "المسبح الخارجي", category: "Pool", description: "مسبح خارجي بمقاسات أولمبية مناسب للعائلات", location: "الجناح الشرقي", operatingHours: "6:00 AM - 10:00 PM", capacityLimit: 30, isAvailable: true, pricePerBooking: 200 },
    { id: "fac-002", name: "صالة الألعاب الرياضية", title: "صالة الألعاب الرياضية", category: "Gym", description: "صالة مجهزة بأحدث الأجهزة الرياضية", location: "المبنى الرئيسي - الطابق الأرضي", operatingHours: "5:00 AM - 11:00 PM", capacityLimit: 20, isAvailable: true, pricePerBooking: 0 },
    { id: "fac-003", name: "قاعة الاحتفالات", title: "قاعة الاحتفالات", category: "Hall", description: "قاعة فاخرة للاحتفالات والمناسبات بسعة 100 شخص", location: "بجوار مكتب الإدارة", operatingHours: "10:00 AM - 12:00 AM", capacityLimit: 100, isAvailable: true, pricePerBooking: 1500 },
    { id: "fac-004", name: "ملعب الأطفال", title: "ملعب الأطفال", category: "Playground", description: "ملعب آمن ومكيف للأطفال مع ألعاب متنوعة", location: "حديقة المجمع المركزية", operatingHours: "7:00 AM - 8:00 PM", capacityLimit: 25, isAvailable: true, pricePerBooking: 0 },
    { id: "fac-005", name: "غرفة الاجتماعات", title: "غرفة الاجتماعات", category: "Meeting", description: "غرفة اجتماعات مجهزة بشاشة عرض وبروجكتور", location: "مكتب الإدارة - الطابق الأول", operatingHours: "8:00 AM - 6:00 PM", capacityLimit: 12, isAvailable: true, pricePerBooking: 100 },
    { id: "fac-006", name: "الموقف المغطي", title: "الموقف المغطي", category: "Parking", description: "موقف سيارات مغطي بسعة 50 سيارة", location: "الطابق السفلي", operatingHours: "24/7", capacityLimit: 50, isAvailable: true, pricePerBooking: 50 },
  ];
  for (const f of facilities) {
    await dbPool.query("INSERT INTO facilities(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [f.id, JSON.stringify(f), st(f)]);
  }

  // ─── FACILITY BOOKINGS ───
  const bookings = [
    { id: "bk-001", facilityId: "fac-003", facilityName: "قاعة الاحتفالات", tenantId: "tenant-aya-ahmed", tenantName: "Aya Ahmed", bookingDate: "2025-08-20", startTime: "18:00", endTime: "23:00", guestsCount: 80, purpose: "عيد ميلاد", status: "Approved", bookingNo: "BK-001", adminNotes: "تم الموافقة - يرجى الحضور قبل الموعد بساعة" },
    { id: "bk-002", facilityId: "fac-001", facilityName: "المسبح الخارجي", tenantId: "tenant-mohammed-ali", tenantName: "Mohammed Ali", bookingDate: "2025-08-22", startTime: "14:00", endTime: "18:00", guestsCount: 8, purpose: "حفل عائلي", status: "Pending", bookingNo: "BK-002" },
    { id: "bk-003", facilityId: "fac-005", facilityName: "غرفة الاجتماعات", tenantId: "tenant-khaled-youssef", tenantName: "Khaled Youssef", bookingDate: "2025-08-18", startTime: "10:00", endTime: "12:00", guestsCount: 6, purpose: "اجتماع أهالي", status: "Approved", bookingNo: "BK-003", adminNotes: "الاجتماع معتمد" },
    { id: "bk-004", facilityId: "fac-001", facilityName: "المسبح الخارجي", tenantId: "tenant-sara-ibrahim", tenantName: "Sara Ibrahim", bookingDate: "2025-08-15", startTime: "09:00", endTime: "12:00", guestsCount: 4, purpose: "سباحة صباحية", status: "Completed", bookingNo: "BK-004" },
    { id: "bk-005", facilityId: "fac-003", facilityName: "قاعة الاحتفالات", tenantId: "tenant-fatma-hassan", tenantName: "Fatma Hassan", bookingDate: "2025-09-01", startTime: "17:00", endTime: "22:00", guestsCount: 50, purpose: "مناسبة عائلية", status: "Pending", bookingNo: "BK-005" },
  ];
  for (const b of bookings) {
    await dbPool.query("INSERT INTO facility_bookings(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [b.id, JSON.stringify(b), st(b)]);
  }

  // ─── EXPENSES ───
  const expenses = [
    { id: "exp-001", description: "رواتب فريق الصيانة", descriptionArabic: "رواتب فريق الصيانة", amount: 25000, category: "رواتب", date: "2025-07-01", paidTo: "فريق الصيانة", status: "Paid", createdBy: "admin" },
    { id: "exp-002", description: "فاتورة كهرباء الممرات العامة", descriptionArabic: "فاتورة كهرباء الممرات العامة", amount: 8500, category: "مرافق", date: "2025-07-15", paidTo: "شركة الكهرباء", status: "Paid", createdBy: "admin" },
    { id: "exp-003", description: "مواد تنظيف شهرية", descriptionArabic: "مواد تنظيف شهرية", amount: 3200, category: "نظافة", date: "2025-07-20", paidTo: "شركة النظافة المتحدة", status: "Paid", createdBy: "admin" },
    { id: "exp-004", description: "صيانة مكيفات الممرات", descriptionArabic: "صيانة مكيفات الممرات", amount: 6000, category: "صيانة", date: "2025-08-01", paidTo: "مؤسسة الأمل للصيانة", status: "Pending", createdBy: "admin" },
    { id: "exp-005", description: "خدمات أمن وحراسة", descriptionArabic: "خدمات أمن وحراسة", amount: 15000, category: "أمن", date: "2025-08-01", paidTo: "شركة الأمان الأمنية", status: "Pending", createdBy: "admin" },
    { id: "exp-006", description: "صيانة حديقة المجمع", descriptionArabic: "صيانة حديقة المجمع", amount: 4500, category: "صيانة", date: "2025-07-25", paidTo: "مؤسسة الزهور", status: "Paid", createdBy: "admin" },
    { id: "exp-007", description: "فاتورة مياه شهرية", descriptionArabic: "فاتورة مياه شهرية", amount: 12000, category: "مرافق", date: "2025-08-01", paidTo: "شركة المياه", status: "Pending", createdBy: "admin" },
    { id: "exp-008", description: "إصلاح بوابة المدخل الإلكترونية", descriptionArabic: "إصلاح بوابة المدخل الإلكترونية", amount: 3800, category: "صيانة", date: "2025-07-28", paidTo: "شركة التقنية", status: "Paid", createdBy: "admin" },
  ];
  for (const e of expenses) {
    await dbPool.query("INSERT INTO expenses(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [e.id, JSON.stringify(e), st(e)]);
  }

  // ─── HOUSES / UNITS ───
  const houses = [
    // Building 1
    { id: "unit-101", houseNumber: "101", unitNumber: "101", buildingNumber: "1", floorNumber: "1", area: "150", roomsCount: 2, bathroomsCount: 2, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: false, status: "Occupied", tenantId: "tenant-aya-ahmed", tenantName: "Aya Ahmed" },
    { id: "unit-102", houseNumber: "102", unitNumber: "102", buildingNumber: "1", floorNumber: "1", area: "140", roomsCount: 2, bathroomsCount: 1, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: true, status: "Vacant" },
    { id: "unit-103", houseNumber: "103", unitNumber: "103", buildingNumber: "1", floorNumber: "1", area: "160", roomsCount: 3, bathroomsCount: 2, hasGarage: true, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: false, status: "Occupied", tenantId: "tenant-mohammed-ali", tenantName: "Mohammed Ali" },
    { id: "unit-201", houseNumber: "201", unitNumber: "201", buildingNumber: "1", floorNumber: "2", area: "150", roomsCount: 2, bathroomsCount: 2, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: true, status: "Vacant" },
    { id: "unit-205", houseNumber: "205", unitNumber: "205", buildingNumber: "1", floorNumber: "2", area: "170", roomsCount: 3, bathroomsCount: 2, hasGarage: true, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: true, isAvailable: false, status: "Occupied", tenantId: "tenant-sara-ibrahim", tenantName: "Sara Ibrahim" },
    { id: "unit-301", houseNumber: "301", unitNumber: "301", buildingNumber: "1", floorNumber: "3", area: "155", roomsCount: 2, bathroomsCount: 2, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: true, status: "Vacant" },
    { id: "unit-505", houseNumber: "505", unitNumber: "505", buildingNumber: "1", floorNumber: "5", area: "200", roomsCount: 4, bathroomsCount: 3, hasGarage: true, hasGarden: true, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: true, isAvailable: false, status: "Occupied", tenantId: "tenant-sara-ibrahim", tenantName: "Sara Ibrahim" },
    // Building 2
    { id: "unit-201b2", houseNumber: "201", unitNumber: "201", buildingNumber: "2", floorNumber: "2", area: "145", roomsCount: 2, bathroomsCount: 1, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: false, isFurnished: false, isAvailable: true, status: "Vacant" },
    { id: "unit-301b2", houseNumber: "301", unitNumber: "301", buildingNumber: "2", floorNumber: "3", area: "160", roomsCount: 3, bathroomsCount: 2, hasGarage: true, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: false, status: "Occupied", tenantId: "tenant-ali-hassan", tenantName: "Ali Hassan" },
    { id: "unit-312", houseNumber: "312", unitNumber: "312", buildingNumber: "2", floorNumber: "3", area: "150", roomsCount: 2, bathroomsCount: 2, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: false, status: "Occupied", tenantId: "tenant-fatma-hassan", tenantName: "Fatma Hassan" },
    { id: "unit-103b2", houseNumber: "103", unitNumber: "103", buildingNumber: "2", floorNumber: "1", area: "140", roomsCount: 2, bathroomsCount: 1, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: false, isFurnished: false, isAvailable: false, status: "Occupied", tenantId: "tenant-omar-khaled", tenantName: "Omar Khaled" },
    { id: "unit-401b2", houseNumber: "401", unitNumber: "401", buildingNumber: "2", floorNumber: "4", area: "165", roomsCount: 3, bathroomsCount: 2, hasGarage: true, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: true, status: "Vacant" },
    // Building 3
    { id: "unit-202b3", houseNumber: "202", unitNumber: "202", buildingNumber: "3", floorNumber: "2", area: "155", roomsCount: 3, bathroomsCount: 2, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: false, status: "Occupied", tenantId: "tenant-khaled-youssef", tenantName: "Khaled Youssef" },
    { id: "unit-401", houseNumber: "401", unitNumber: "401", buildingNumber: "3", floorNumber: "4", area: "145", roomsCount: 2, bathroomsCount: 2, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: false, status: "Occupied", tenantId: "tenant-nora-saeed", tenantName: "Nora Saeed" },
    { id: "unit-101b3", houseNumber: "101", unitNumber: "101", buildingNumber: "3", floorNumber: "1", area: "150", roomsCount: 2, bathroomsCount: 2, hasGarage: false, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: false, isAvailable: true, status: "Vacant" },
    { id: "unit-302b3", houseNumber: "302", unitNumber: "302", buildingNumber: "3", floorNumber: "3", area: "160", roomsCount: 3, bathroomsCount: 2, hasGarage: true, hasGarden: false, hasInstalledKitchen: true, hasCentralAirConditioning: true, isFurnished: true, isAvailable: true, status: "Vacant" },
  ];
  for (const h of houses) {
    await dbPool.query("INSERT INTO houses(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [h.id, JSON.stringify(h), st(h)]);
  }

  // ─── ELECTRICITY METERS ───
  const meters = [
    { id: "met-001", meterNumber: "E-101-001", unitId: "unit-101", building: "1", unitNumber: "101", lastReading: 45200, previousReading: 44800, readingDate: "2025-07-31", status: "Active" },
    { id: "met-002", meterNumber: "E-205-002", unitId: "unit-205", building: "1", unitNumber: "205", lastReading: 38900, previousReading: 38500, readingDate: "2025-07-31", status: "Active" },
    { id: "met-003", meterNumber: "E-312-003", unitId: "unit-312", building: "2", unitNumber: "312", lastReading: 52100, previousReading: 51600, readingDate: "2025-07-31", status: "Active" },
    { id: "met-004", meterNumber: "E-103-004", unitId: "unit-103b2", building: "2", unitNumber: "103", lastReading: 29800, previousReading: 29400, readingDate: "2025-07-31", status: "Active" },
    { id: "met-005", meterNumber: "E-401-005", unitId: "unit-401", building: "3", unitNumber: "401", lastReading: 41200, previousReading: 40800, readingDate: "2025-07-31", status: "Active" },
    { id: "met-006", meterNumber: "E-202-006", unitId: "unit-202b3", building: "3", unitNumber: "202", lastReading: 35600, previousReading: 35100, readingDate: "2025-07-31", status: "Active" },
  ];
  for (const m of meters) {
    await dbPool.query("INSERT INTO electricity_meters(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING", [m.id, JSON.stringify(m), st(m)]);
  }

  console.log("[seed] Test data seeded successfully: 3 buildings, 16 units, 8 tenants, 5 staff, 3 companies, 8 contracts, 12 payments, 8 maintenance, 6 complaints, 6 letters, 4 announcements, 6 facilities, 5 bookings, 8 expenses, 6 meters");
}

async function loadState(key: string, fallback: any[]) {
  if (!dbPool) return fallback;
  const table = TABLES[key]; if (!table) return fallback;
  const result = await dbPool.query(`SELECT data FROM ${table} ORDER BY updated_at DESC`);
  // Never seed demonstration/fallback records into a production database.
  if (!result.rowCount) return (isProduction || process.env.SKIP_SEED === "true") ? [] : fallback;
  return result.rows.map((r:any)=>r.data);
}
async function ensureTenantForFinancialItem(client:any, item:any) {
  const tenantId = item?.tenantId ? String(item.tenantId) : '';
  if (!tenantId) return null;
  const exists = await client.query(`SELECT 1 FROM tenants WHERE id=$1 LIMIT 1`, [tenantId]);
  if (exists.rowCount) return tenantId;
  const source = tenantsStore.find((t:any)=>String(t?.id||'')===tenantId);
  const recovered = source || {
    id: tenantId,
    fullName: item?.tenantName || `Recovered tenant ${tenantId.slice(0,8)}`,
    fullNameArabic: item?.tenantNameArabic || '',
    phoneNumber: item?.tenantMobile || '',
    houseNumber: item?.unitNumber || item?.houseNumber || '',
    contractNumber: item?.contractNumber || item?.contractNo || '',
    isActive: String(item?.status||'Active').toLowerCase() !== 'archived',
    recoveredFromLegacyData: true
  };
  await client.query(`INSERT INTO tenants(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING`, [tenantId, JSON.stringify({...recovered,id:tenantId}), searchText(recovered)]);
  if (!source) tenantsStore.push({...recovered,id:tenantId});
  console.warn(`[db] repaired orphan tenant ${tenantId} before saving ${item?.contractNo || item?.contractNumber || item?.id || 'financial record'}`);
  return tenantId;
}

async function saveState(key: string, value: any[]) {
  if (!dbPool) return;
  const table = TABLES[key]; if (!table) return;
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");
    const ids: string[] = [];
    for (const raw of value) {
      const item = raw || {}; const id = String(item.id || crypto.randomUUID()); ids.push(id);
      let tenantId = item.tenantId ? String(item.tenantId) : null;
      if (table === "contracts" || table === "payments") {
        if (tenantId) tenantId = await ensureTenantForFinancialItem(client, item);
        await client.query(`INSERT INTO ${table}(id,tenant_id,data,search_text,updated_at) VALUES($1,$2,$3::jsonb,$4,NOW()) ON CONFLICT(id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,data=EXCLUDED.data,search_text=EXCLUDED.search_text,updated_at=NOW()`, [id,tenantId,JSON.stringify({...item,id}),searchText(item)]);
      } else {
        await client.query(`INSERT INTO ${table}(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,search_text=EXCLUDED.search_text,updated_at=NOW()`, [id,JSON.stringify({...item,id}),searchText(item)]);
      }
    }
    if (ids.length) await client.query(`DELETE FROM ${table} WHERE NOT (id = ANY($1::text[]))`, [ids]); else await client.query(`DELETE FROM ${table}`);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}
async function ensureTenantReferences(seedTenants: any[] = []) {
  if (!dbPool) return;
  const byId = new Map<string, any>();
  for (const t of [...seedTenants, ...tenantsStore]) if (t?.id) byId.set(String(t.id), t);
  const referenced = new Set<string>();
  for (const item of [...contractsStore, ...paymentsStore]) if (item?.tenantId) referenced.add(String(item.tenantId));
  if (!referenced.size) return;
  const existing = await dbPool.query(`SELECT id FROM tenants WHERE id = ANY($1::text[])`, [[...referenced]]);
  const existingIds = new Set(existing.rows.map((r:any)=>String(r.id)));
  let repaired = 0;
  for (const tenantId of referenced) {
    if (existingIds.has(tenantId)) continue;
    const contract = contractsStore.find((c:any)=>String(c?.tenantId||'')===tenantId);
    const payment = paymentsStore.find((p:any)=>String(p?.tenantId||'')===tenantId);
    const source = byId.get(tenantId);
    const recovered = source || {
      id: tenantId,
      fullName: contract?.tenantName || payment?.tenantName || `Recovered tenant ${tenantId.slice(0,8)}`,
      fullNameArabic: contract?.tenantNameArabic || '',
      phoneNumber: contract?.tenantMobile || '',
      houseNumber: contract?.unitNumber || contract?.houseNumber || payment?.unitNumber || '',
      contractNumber: contract?.contractNumber || contract?.contractNo || '',
      isActive: String(contract?.status||'Active').toLowerCase() !== 'archived',
      recoveredFromLegacyData: true
    };
    await dbPool.query(`INSERT INTO tenants(id,data,search_text,updated_at) VALUES($1,$2::jsonb,$3,NOW()) ON CONFLICT(id) DO NOTHING`, [tenantId, JSON.stringify({...recovered,id:tenantId}), searchText(recovered)]);
    tenantsStore.push({...recovered,id:tenantId});
    repaired++;
  }
  if (repaired) console.warn(`[db] repaired ${repaired} orphan tenant reference(s) from legacy data`);
}

function normalizeLoginIdentifier(value: any) {
  return String(value ?? '')
    .trim()
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

async function getUserWithRole(identifier: string, roleHint?: string) {
  if (!dbPool) return null;
  const value = normalizeLoginIdentifier(identifier);
  if (!value) return null;
  const role = roleHint === 'Tenant' || roleHint === 'Staff' || roleHint === 'Admin' ? roleHint : '';
  const roleClause = role ? `AND EXISTS (SELECT 1 FROM user_roles urh JOIN roles rh ON rh.id=urh.role_id WHERE urh.user_id=u.id AND rh.name=$2)` : '';
  const baseParams = role ? [value, role] : [value];
  const r = await dbPool.query(`SELECT u.*, COALESCE(array_agg(DISTINCT ro.name) FILTER (WHERE ro.name IS NOT NULL), '{}') roles, COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') permissions
    FROM app_users u
    LEFT JOIN user_roles ur ON ur.user_id=u.id
    LEFT JOIN roles ro ON ro.id=ur.role_id
    LEFT JOIN role_permissions rp ON rp.role_id=ro.id
    LEFT JOIN permissions p ON p.id=rp.permission_id
    WHERE (lower(trim(u.username))=lower(trim($1)) OR lower(trim(u.email))=lower(trim($1))) ${roleClause}
    GROUP BY u.id LIMIT 1`, baseParams);
  if (r.rows[0]) return r.rows[0];

  const digits = value.replace(/\D/g, '');
  const normalized = (v:any) => normalizeLoginIdentifier(v).toLowerCase();
  const samePhone = (v:any) => digits && String(v ?? '').replace(/\D/g, '') === digits;

  if (role !== 'Admin') {
    const staff = role !== 'Tenant' ? staffStore.find((x:any) =>
      normalized(x.empCode || x.employeeCode || x.employeeNumber || x.code) === normalized(value) ||
      samePhone(x.phoneNumber || x.mobile || x.mobileNumber || x.phone || x.contactNumber)
    ) : null;
    if (staff) {
      const linked = await dbPool.query(`SELECT u.* FROM app_users u WHERE u.entity_type='staff' AND u.entity_id=$1 AND u.is_active=TRUE LIMIT 1`, [String(staff.id)]);
      if (linked.rows[0]) {
        const full = await dbPool.query(`SELECT u.*, COALESCE(array_agg(DISTINCT ro.name) FILTER (WHERE ro.name IS NOT NULL), '{}') roles, COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') permissions FROM app_users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles ro ON ro.id=ur.role_id LEFT JOIN role_permissions rp ON rp.role_id=ro.id LEFT JOIN permissions p ON p.id=rp.permission_id WHERE u.id=$1 GROUP BY u.id`, [linked.rows[0].id]);
        return full.rows[0] || null;
      }
    }

    const tenant = role !== 'Staff' ? tenantsStore.find((x:any) =>
      normalized(x.houseNumber || x.unitNumber || x.unitNo || x.unit || x.houseNo) === normalized(value) ||
      samePhone(x.phoneNumber || x.mobile || x.mobileNumber || x.phone || x.whatsappNumber || x.contactNumber)
    ) : null;
    if (tenant) {
      const linked = await dbPool.query(`SELECT u.* FROM app_users u WHERE u.entity_type='tenant' AND u.entity_id=$1 AND u.is_active=TRUE LIMIT 1`, [String(tenant.id)]);
      if (linked.rows[0]) {
        const full = await dbPool.query(`SELECT u.*, COALESCE(array_agg(DISTINCT ro.name) FILTER (WHERE ro.name IS NOT NULL), '{}') roles, COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') permissions FROM app_users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles ro ON ro.id=ur.role_id LEFT JOIN role_permissions rp ON rp.role_id=ro.id LEFT JOIN permissions p ON p.id=rp.permission_id WHERE u.id=$1 GROUP BY u.id`, [linked.rows[0].id]);
        return full.rows[0] || null;
      }
    }
  }
  return null;
}
function publicUser(u: any) { const role = u.entity_type==='tenant' ? 'Tenant' : u.entity_type==='staff' ? 'Staff' : (u.roles?.includes('Admin') ? 'Admin' : (u.roles?.[0] || 'Staff')); return { id:u.id, username:u.username, email:u.email, fullName:u.full_name, role, roles:u.roles || [], permissions:u.permissions || [], entityType:u.entity_type || null, entityId:u.entity_id || null, tenantId:u.entity_type==='tenant'?u.entity_id:null, staffId:u.entity_type==='staff'?u.entity_id:null }; }
async function issueTokens(u: any, req?: any) {
  const role = u.entity_type==='tenant' ? 'Tenant' : u.entity_type==='staff' ? 'Staff' : (u.roles?.includes('Admin') ? 'Admin' : (u.roles?.[0] || 'Staff'));
  const accessToken = signJwt({ sub:u.id, username:u.username, role, permissions:u.permissions || [], iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+ACCESS_TTL_SECONDS });
  const refreshToken = crypto.randomBytes(48).toString("hex");
  if (dbPool) await dbPool.query("INSERT INTO refresh_tokens(user_id,token_hash,expires_at,user_agent,ip_address) VALUES($1,$2,NOW()+make_interval(secs => $3::int),$4,$5)", [u.id,tokenHash(refreshToken),REFRESH_TTL_SECONDS,String(req?.headers?.["user-agent"]||"").slice(0,500),req?.ip||null]);
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
}
const rateBuckets = new Map<string,{count:number,resetAt:number}>();
function rateLimit(name:string, max:number, windowMs:number) {
  return (req:any,res:any,next:any) => {
    const key = `${name}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
    const now = Date.now(); const current = rateBuckets.get(key);
    if (!current || current.resetAt <= now) { rateBuckets.set(key,{count:1,resetAt:now+windowMs}); return next(); }
    current.count += 1;
    if (current.count > max) { res.setHeader('Retry-After', String(Math.ceil((current.resetAt-now)/1000))); return res.status(429).json({message:'محاولات كثيرة في وقت قصير. حاول مرة أخرى بعد قليل'}); }
    next();
  };
}

function requireAuth(req:any,res:any,next:any) {
  const auth=req.headers.authorization||""; const payload=auth.startsWith("Bearer ")?verifyJwt(auth.slice(7)):null;
  if(!payload) return res.status(401).json({isSuccess:false,message:"Unauthorized: missing or expired access token"}); req.user=payload; next();
}
function requirePermission(code:string) { return (req:any,res:any,next:any)=> req.user?.permissions?.includes(code) ? next() : res.status(403).json({message:"Forbidden",requiredPermission:code}); }
let tenantsStore: any[] = [
  {
    id: "257358ac-02d4-4eff-9139-0a953fcaf295",
    fullName: "mustafa ali",
    fullNameArabic: "مصطفى علي",
    email: "mustafaali1m@gmail.com",
    phoneNumber: "0539111781",
    emergencyPhoneNumber: "0566027120",
    nationality: "Sudan",
    familyCount: "4",
    workNotes: "",
    isMarried: true,
    whatsappNumber: "966591234567",
    tenantRemarks: "",
    companyName: "AZ",
    houseNumber: "203",
    contractNumber: "20230102203",
    contractStartDate: "2023-10-02",
    contractEndDate: "2024-10-01",
    annualRent: 45000,
    monthlyRent: 3750,
    paidAmount: 18750,
    remainingAmount: 26250,
    paymentMethod: "Quarterly",
    paymentDueDay: "1",
    electricityMeter: "482835",
    waterCost: "100",
    isActive: true
  },
  {
    id: "ecb6fed5-8fc3-4d84-bc99-c5139faffd59",
    fullName: "Aya Ahmed",
    fullNameArabic: "آية أحمد",
    email: "aya123@gmail.com",
    phoneNumber: "01102782069",
    emergencyPhoneNumber: "01102782069",
    nationality: "Egyptian",
    familyCount: "2",
    workNotes: "",
    isMarried: false,
    whatsappNumber: "9661102782069",
    tenantRemarks: "",
    companyName: "AZ",
    houseNumber: "A-15",
    contractNumber: "CNT-2024-001",
    contractStartDate: "2024-01-01",
    contractEndDate: "2025-01-01",
    annualRent: 10000,
    monthlyRent: 2000,
    paidAmount: 2000,
    remainingAmount: 8000,
    paymentMethod: "Quarterly",
    paymentDueDay: "1",
    electricityMeter: "2000",
    waterCost: "100",
    isActive: true
  }
];

let contractsStore: any[] = [
  {
    id: "3",
    contractNumber: "20230102203",
    contractNo: "20230102203",
    houseNumber: "203",
    houseId: "df2f59a4-e619-4036-a644-07d422460fa6",
    buildingNumber: "101",
    unitType: "Apartment",
    unitNumber: "203",
    tenantId: "257358ac-02d4-4eff-9139-0a953fcaf295",
    tenantName: "mustafa ali",
    tenantMobile: "0539111781",
    emergencyPhone: "0566027120",
    nationalId: "",
    leaseStartDate: "2023-10-02",
    leaseEndDate: "2024-10-01",
    leaseDurationMonths: 12,
    annualRent: 45000,
    monthlyRent: 3750,
    waterYearlyBill: 1200,
    totalYearlyRent: 46200,
    discount: 0,
    paidAmount: 18750,
    remainingAmount: 27450,
    paymentMethod: "Quarterly",
    paymentNumber: "PAY-1001",
    electricityMeterNumber: "482835",
    verifiedInEjar: true,
    transferAccountToTenant: true,
    insurance: 1000,
    commission: 500,
    englishNotes: "Standard residential lease contract",
    arabicNotes: "عقد إيجار سكني كمبوند أزهار",
    status: "Active",
    isArchived: false,
    adminNote: null,
    contractDocumentUrl: null,
    notes: [],
    installments: [
      { id: "1", installmentNo: 1, dueDate: "2023-10-02", amount: 18750, paidDate: "2023-10-02", status: "Paid" }
    ]
  }
];

let housesStore: any[] = [
  {
    id: "df2f59a4-e619-4036-a644-07d422460fa6",
    houseNumber: "203",
    buildingNumber: "101",
    floorNumber: "2",
    area: "220",
    roomsCount: 3,
    bathroomsCount: 3,
    hasGarage: true,
    hasGarden: false,
    hasInstalledKitchen: true,
    hasCentralAirConditioning: true,
    isFurnished: true,
    notes: "Available for rent",
    isAvailable: false
  }
];

let staffStore = [
  {
    id: "b88b8ee5-e721-47aa-bf7e-bb75c9a4facf",
    fullName: "System Administrator",
    email: "m.barmada@azhar-residence.com",
    phoneNumber: "0550896224",
    role: "Admin",
    isActive: true
  }
];

let paymentsStore: any[] = [
  {
    id: "705fbe0f-e4ca-4f2a-8a2a-650b006604bf",
    tenantId: "257358ac-02d4-4eff-9139-0a953fcaf295",
    tenantName: "mustafa ali",
    amount: 18750,
    month: 10,
    year: 2023,
    paymentMethod: "Quarterly",
    status: "Paid",
    paymentDate: "2023-10-02"
  }
];

let electricityMetersStore: any[] = [
  {
    id: "e452d2f7-066d-4d5b-a3ce-a11169535b8b",
    meterNumber: "482835",
    unitId: "df2f59a4-e619-4036-a644-07d422460fa6",
    houseId: "df2f59a4-e619-4036-a644-07d422460fa6",
    building: "101",
    unitNumber: "203",
    paymentNumber: "10001799526"
  }
];

let maintenanceStore: any[] = [];
let lettersStore: any[] = [];
let announcementsStore: any[] = [];
let complaintsStore: any[] = [];
let expensesStore: any[] = [];
let companiesStore: any[] = [];
let facilitiesStore: any[] = [];
let facilityBookingsStore: any[] = [];
let profileStore: any = { displayName: "Admin", email: "admin@azhar.com", profileImageUrl: "" };

let notificationsStore: any[] = [
  { id: "local-notif-1", title: "مرحباً بك", body: "تم تسجيل الدخول بنجاح في نظام إدارة كمبوند أزهار", type: "System", relatedEntityId: "", isRead: false, createdAt: new Date().toISOString() }
];


function frequencyParts(value: any) {
  const raw = String(value || '').trim().toLowerCase();
  const v = raw.replace(/[^a-z0-9]/g, '');
  if (v.includes('fourmonth') || v.includes('4month') || v.includes('every4')) return { count: 3, months: 4, label: 'Every-4-Months' };
  if (v.includes('semi')) return { count: 2, months: 6, label: 'Semi-Annual' };
  if (v.includes('quarter')) return { count: 4, months: 3, label: 'Quarterly' };
  if (v.includes('annual') || v.includes('year')) return { count: 1, months: 12, label: 'Annual' };
  // Legacy monthly / bi-monthly values are intentionally normalized to quarterly so no new schedule can be created with them.
  return { count: 4, months: 3, label: 'Quarterly' };
}
function normalizePaymentFrequency(value:any) {
  const raw=String(value||'').trim().toLowerCase();
  if(raw.includes('four') || raw.includes('4 month') || raw.includes('every-4')) return 'Every-4-Months';
  if(raw.includes('semi')) return 'Semi-Annual';
  if(raw.includes('quarter')) return 'Quarterly';
  if(raw.includes('annual') || raw.includes('year')) return 'Annual';
  return 'Quarterly';
}
function addMonthsDate(dateValue: string, months: number) {
  const d = new Date(`${String(dateValue).slice(0,10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0,10);
  const originalDay = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)).getUTCDate();
  d.setUTCDate(Math.min(originalDay,lastDay));
  return d.toISOString().slice(0,10);
}
function contractMoney(contract:any) {
  const unitRent = Math.max(0, Number(contract.annualRent || 0));
  const water = Math.max(0, Number(contract.waterYearlyBill || 0));
  const discount = Math.max(0, Number(contract.discount || 0));
  const grossRent = Math.round((unitRent + water) * 100) / 100;
  const netDue = Math.max(0, Math.round((grossRent - discount) * 100) / 100);
  return { unitRent, water, grossRent, discount, netDue };
}
function normalizeContractMoney(contract:any) {
  const money = contractMoney(contract);
  contract.annualRent = money.unitRent;
  contract.waterYearlyBill = money.water;
  // totalYearlyRent is always the visible gross rent: Unit Rent + Water.
  contract.totalYearlyRent = money.grossRent;
  // netYearlyRent is the amount used by the installment ledger after discount.
  contract.netYearlyRent = money.netDue;
  return contract;
}
function contractGross(contract:any) {
  // Backend is authoritative: never trust a stale client-supplied totalYearlyRent.
  return contractMoney(contract).netDue;
}
async function refreshInstallmentStatuses(client:any, contractId?:string) {
  const params:any[]=[]; let where="status <> 'Cancelled'";
  if(contractId){params.push(contractId);where += ` AND contract_id=$${params.length}`;}
  await client.query(`UPDATE rent_installments SET status=CASE WHEN paid_amount >= original_amount THEN 'Paid' WHEN paid_amount > 0 THEN 'Partially Paid' WHEN due_date < CURRENT_DATE THEN 'Overdue' ELSE 'Pending' END, updated_at=NOW() WHERE ${where}`,params);
}
async function rebuildContractSchedule(contract:any, client?:any) {
  if(!dbPool) return [];
  const c=client||await dbPool.connect(); const own=!client;
  try{
    if(own) await c.query('BEGIN');
    const cid=String(contract.id); const tenantId=contract.tenantId?String(contract.tenantId):null;
    const allocations=await c.query(`SELECT COUNT(*)::int count FROM payment_allocations pa JOIN rent_installments ri ON ri.id=pa.installment_id WHERE ri.contract_id=$1`,[cid]);
    if(Number(allocations.rows[0]?.count||0)>0){
      await refreshInstallmentStatuses(c,cid);
      const existing=await c.query(`SELECT id,installment_no AS "installmentNo",due_date AS "dueDate",original_amount::float8 amount,paid_amount::float8 AS "paidAmount",status FROM rent_installments WHERE contract_id=$1 ORDER BY installment_no`,[cid]);
      if(own) await c.query('COMMIT'); return existing.rows;
    }
    await c.query('DELETE FROM rent_installments WHERE contract_id=$1',[cid]);
    const freq=frequencyParts(contract.paymentFrequency||contract.paymentMethod); const gross=contractGross(contract);
    const base=Math.floor((gross/freq.count)*100)/100; let allocated=0;
    for(let i=1;i<=freq.count;i++){
      const amount=i===freq.count?Math.round((gross-allocated)*100)/100:base; allocated+=amount;
      const due=addMonthsDate(contract.leaseStartDate||contract.contractStartDate||new Date().toISOString().slice(0,10),(i-1)*freq.months);
      await c.query(`INSERT INTO rent_installments(contract_id,tenant_id,installment_no,due_date,original_amount) VALUES($1,$2,$3,$4,$5)`,[cid,tenantId,i,due,amount]);
    }
    await refreshInstallmentStatuses(c,cid);
    const rows=await c.query(`SELECT id,installment_no AS "installmentNo",due_date AS "dueDate",original_amount::float8 amount,paid_amount::float8 AS "paidAmount",status FROM rent_installments WHERE contract_id=$1 ORDER BY installment_no`,[cid]);
    if(own) await c.query('COMMIT'); return rows.rows;
  } catch(e){if(own) await c.query('ROLLBACK'); throw e;} finally{if(own)c.release();}
}
async function contractFinance(contractId:string, client?:any){
  if(!dbPool) return null; const c=client||dbPool;
  await refreshInstallmentStatuses(c,contractId);
  const r=await c.query(`SELECT COALESCE(SUM(original_amount),0)::float8 total,COALESCE(SUM(paid_amount),0)::float8 paid,COALESCE(SUM(original_amount-paid_amount),0)::float8 remaining,COALESCE(SUM(CASE WHEN status='Overdue' THEN original_amount-paid_amount ELSE 0 END),0)::float8 overdue,MIN(due_date) FILTER(WHERE status IN ('Pending','Partially Paid','Overdue')) AS next_due_date,COUNT(*) FILTER(WHERE status='Overdue')::int overdue_count FROM rent_installments WHERE contract_id=$1 AND status<>'Cancelled'`,[contractId]);
  return r.rows[0]||null;
}
function daysUntilDate(dateValue:any){
  if(!dateValue) return undefined;
  const due=Date.parse(`${String(dateValue).slice(0,10)}T00:00:00Z`);
  const today=Date.parse(`${new Date().toISOString().slice(0,10)}T00:00:00Z`);
  if(!Number.isFinite(due)||!Number.isFinite(today)) return undefined;
  return Math.round((due-today)/86400000);
}
function applyNextPaymentMeta(contract:any, nextDueDate:any){
  const date=nextDueDate ? String(nextDueDate).slice(0,10) : '';
  contract.nextPaymentDate=date || undefined;
  contract.nextPaymentDays=date ? daysUntilDate(date) : undefined;
  return contract;
}
async function syncContractMoney(contract:any, client?:any){
  const fin=await contractFinance(String(contract.id),client); if(!fin)return contract;
  contract.paidAmount=Number(fin.paid||0); contract.remainingAmount=Number(fin.remaining||0);
  applyNextPaymentMeta(contract, fin.next_due_date);
  const idx=contractsStore.findIndex((x:any)=>String(x.id)===String(contract.id)); if(idx>=0) contractsStore[idx]={...contractsStore[idx],paidAmount:contract.paidAmount,remainingAmount:contract.remainingAmount,nextPaymentDate:contract.nextPaymentDate,nextPaymentDays:contract.nextPaymentDays};
  if(dbPool){
    const c=client||dbPool;
    // Never let optional NULL payment metadata turn contracts.data into SQL NULL.
    await c.query(`UPDATE contracts SET data=jsonb_set(jsonb_set(jsonb_set(jsonb_set(COALESCE(data,'{}'::jsonb),'{paidAmount}',COALESCE(to_jsonb($2::numeric),'null'::jsonb),true),'{remainingAmount}',COALESCE(to_jsonb($3::numeric),'null'::jsonb),true),'{nextPaymentDate}',COALESCE(to_jsonb($4::text),'null'::jsonb),true),'{nextPaymentDays}',COALESCE(to_jsonb($5::int),'null'::jsonb),true),updated_at=NOW() WHERE id=$1`,[String(contract.id),contract.paidAmount,contract.remainingAmount,contract.nextPaymentDate||null,contract.nextPaymentDays ?? null]);
  }
  return contract;
}

async function contractSettlementPreview(contractId:string,effectiveDate:string,client?:any){
  if(!dbPool) return null; const c=client||dbPool;
  await refreshInstallmentStatuses(c,contractId);
  const installments=await c.query(`SELECT id,installment_no,due_date,original_amount::float8,paid_amount::float8,status FROM rent_installments WHERE contract_id=$1 AND status<>'Cancelled' ORDER BY due_date,installment_no`,[contractId]);
  const rows=installments.rows; const effective=String(effectiveDate).slice(0,10);
  let accrued=0,paid=0,cancelFuture=0,credit=0;
  for(let i=0;i<rows.length;i++){
    const row=rows[i]; const due=String(row.due_date).slice(0,10); const nextDue=i+1<rows.length?String(rows[i+1].due_date).slice(0,10):null;
    const original=Number(row.original_amount||0), rowPaid=Number(row.paid_amount||0);
    if(due>effective){ cancelFuture += Math.max(0,original-rowPaid); credit += Math.max(0,rowPaid); continue; }
    let earned=original;
    if(nextDue && effective<nextDue){
      const startMs=new Date(`${due}T00:00:00Z`).getTime(), endMs=new Date(`${nextDue}T00:00:00Z`).getTime(), effMs=new Date(`${effective}T23:59:59Z`).getTime();
      const totalDays=Math.max(1,Math.ceil((endMs-startMs)/86400000)); const usedDays=Math.min(totalDays,Math.max(1,Math.ceil((effMs-startMs)/86400000)));
      earned=Math.round((original*(usedDays/totalDays))*100)/100;
    }
    accrued += earned; paid += Math.min(rowPaid,earned); credit += Math.max(0,rowPaid-earned);
  }
  const unapplied=await c.query(`SELECT COALESCE(SUM(rp.amount-COALESCE(a.allocated,0)),0)::float8 credit FROM rental_payments rp LEFT JOIN (SELECT payment_id,SUM(amount) allocated FROM payment_allocations GROUP BY payment_id) a ON a.payment_id=rp.id WHERE rp.contract_id=$1 AND rp.status='Posted'`,[contractId]);
  credit += Number(unapplied.rows[0]?.credit||0);
  const amountDue=Math.max(0,Math.round((accrued-paid-credit)*100)/100);
  return {effectiveDate:effective,accruedAmount:Math.round(accrued*100)/100,paidApplied:Math.round(paid*100)/100,creditAmount:Math.round(credit*100)/100,cancelledFutureAmount:Math.round(cancelFuture*100)/100,amountDue,refundDue:Math.max(0,Math.round((credit-(accrued-paid))*100)/100)};
}
async function applyTerminationSettlement(contract:any,effectiveDate:string,client:any){
  const cid=String(contract.id); const effective=String(effectiveDate).slice(0,10);
  const rows=(await client.query(`SELECT id,installment_no,due_date,original_amount::float8,paid_amount::float8,status FROM rent_installments WHERE contract_id=$1 AND status<>'Cancelled' ORDER BY due_date,installment_no FOR UPDATE`,[cid])).rows;
  for(let i=0;i<rows.length;i++){
    const row=rows[i], due=String(row.due_date).slice(0,10), nextDue=i+1<rows.length?String(rows[i+1].due_date).slice(0,10):null;
    const original=Number(row.original_amount||0), paid=Number(row.paid_amount||0);
    if(due>effective){ await client.query(`UPDATE rent_installments SET original_amount=$2::numeric,status=CASE WHEN $2::numeric>0 THEN 'Paid' ELSE 'Cancelled' END,updated_at=NOW() WHERE id=$1`,[row.id,paid]); continue; }
    if(nextDue && effective<nextDue){
      const startMs=new Date(`${due}T00:00:00Z`).getTime(), endMs=new Date(`${nextDue}T00:00:00Z`).getTime(), effMs=new Date(`${effective}T23:59:59Z`).getTime();
      const totalDays=Math.max(1,Math.ceil((endMs-startMs)/86400000)); const usedDays=Math.min(totalDays,Math.max(1,Math.ceil((effMs-startMs)/86400000)));
      const earned=Math.round((original*(usedDays/totalDays))*100)/100;
      await client.query(`UPDATE rent_installments SET original_amount=$2::numeric,updated_at=NOW() WHERE id=$1`,[row.id,earned]);
    }
  }
  await refreshInstallmentStatuses(client,cid);
  return contractSettlementPreview(cid,effective,client);
}

function makeReceiptNo(){ return `RCPT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }

async function startServer() {
  // Production is database-only. Never allow bundled development/demo records to participate in startup or legacy repair.
  if (isProduction) {
    tenantsStore=[]; contractsStore=[]; housesStore=[]; staffStore=[]; paymentsStore=[]; electricityMetersStore=[];
    maintenanceStore=[]; lettersStore=[]; announcementsStore=[]; complaintsStore=[]; expensesStore=[]; companiesStore=[];
    facilitiesStore=[]; facilityBookingsStore=[]; notificationsStore=[];
  }
  const seedTenants = tenantsStore.map((x:any)=>({...x}));
  await initDatabase();
  tenantsStore = await loadState("tenants", tenantsStore);
  contractsStore = (await loadState("contracts", contractsStore)).map((c:any) => { const clean={...c}; delete clean.representativeName; delete clean.RepresentativeName; clean.paymentFrequency=normalizePaymentFrequency(clean.paymentFrequency || clean.paymentMethod); clean.paymentMethod=clean.paymentFrequency; normalizeContractMoney(clean); return clean; });
  housesStore = (await loadState("houses", housesStore)).map((h:any)=>{ const living=Math.max(Number(h.livingCount||0),Number(h.living||0),Number(h.LivingCount||0),Number(h.Living||0)); const majlis=Math.max(Number(h.majlisCount||0),Number(h.majlis||0),Number(h.MajlisCount||0),Number(h.Majlis||0)); return {...h,livingCount:living,majlisCount:majlis,living,majlis}; });
  staffStore = await loadState("staff", staffStore);
  paymentsStore = await loadState("payments", paymentsStore);
  electricityMetersStore = await loadState("electricityMeters", electricityMetersStore);
  // Meter records belong to units, never tenants. Migrate legacy transfer flags away.
  electricityMetersStore = electricityMetersStore.map((meter:any) => {
    const legacy = { ...meter };
    delete legacy.transferredToTenant;
    delete legacy.representativeName;
    const unit = housesStore.find((u:any) => String(u.id) === String(legacy.unitId || legacy.houseId || ''))
      || housesStore.find((u:any) => String(u.buildingNumber || '') === String(legacy.building || '') && String(u.unitNumber || u.houseNumber || '') === String(legacy.unitNumber || legacy.houseNumber || ''));
    if (!unit) return legacy;
    return { ...legacy, unitId: unit.id, houseId: unit.id, building: unit.buildingNumber || '', unitNumber: unit.unitNumber || unit.houseNumber || '', houseNumber: unit.unitNumber || unit.houseNumber || '', type: unit.type || legacy.type || '', isRented: unit.status === 'Occupied' };
  });
  maintenanceStore = await loadState("maintenance", maintenanceStore);
  lettersStore = await loadState("letters", lettersStore);
  announcementsStore = await loadState("announcements", announcementsStore);
  complaintsStore = await loadState("complaints", complaintsStore);
  expensesStore = await loadState("expenses", expensesStore);
  companiesStore = await loadState("companies", companiesStore);
  facilitiesStore = await loadState("facilities", facilitiesStore);
  facilityBookingsStore = await loadState("facilityBookings", facilityBookingsStore);
  notificationsStore = await loadState("notifications", notificationsStore);
  // Repair legacy/partial database states before contracts or installments touch tenant foreign keys.
  await ensureTenantReferences(seedTenants);
  // Persist canonicalized legacy repairs (gross rent, removed representative field, unit living/majlis aliases).
  if (dbPool) { await saveState("houses", housesStore); await saveState("contracts", contractsStore); }
  if (dbPool) {
    for (const contract of contractsStore) {
      if (String(contract.status || "Active").toLowerCase() !== "archived") {
        await rebuildContractSchedule(contract);
        await syncContractMoney(contract);
      }
    }
  }

  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.disable("x-powered-by");
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (isProduction) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-Request-Id", String(req.headers["x-request-id"] || crypto.randomUUID()));
    const allowedOrigins = String(process.env.CORS_ORIGIN || '').split(',').map(x=>x.trim()).filter(Boolean);
    const requestOrigin = String(req.headers.origin || '');
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) { res.setHeader("Access-Control-Allow-Origin", requestOrigin); res.setHeader("Vary","Origin"); }
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/health", async (_req, res) => {
    try {
      if (dbPool) await dbPool.query("SELECT 1");
      res.json({ ok: true, database: dbPool ? "connected" : "development-memory", timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ ok: false, database: "unavailable", timestamp: new Date().toISOString() });
    }
  });

  // API Router setup matching Postman collection endpoints

  // 1. Account / Auth API
  app.post("/api/Account/login", rateLimit("login", 8, 15*60*1000), async (req, res) => {
    try {
      const { email, username, password } = req.body || {};
      const identifier = String(email || username || '').trim();
      if (!identifier || !password) return res.status(400).json({ isSuccess:false, message:"Email/username and password are required" });
      if (!dbPool) return res.status(503).json({ isSuccess:false, message:"Database is required for authentication" });
      const user = await getUserWithRole(identifier);
      if (!user || !user.is_active || !verifyPassword(String(password), user.password_hash)) return res.status(401).json({ isSuccess:false, message:"Invalid email or password" });
      const tokens = await issueTokens(user, req);
      res.json({ isSuccess:true, ...tokens, user:publicUser(user) });
    } catch (e) { console.error(e); res.status(500).json({isSuccess:false,message:"Login failed"}); }
  });

  app.post("/api/Account/refresh", async (req, res) => {
    try {
      const refreshToken = String(req.body?.refreshToken || "");
      if (!refreshToken) return res.status(400).json({isSuccess:false,message:"refreshToken is required"});
      if (!dbPool) return res.status(503).json({isSuccess:false,message:"Database unavailable"});
      const r = await dbPool.query("SELECT user_id FROM refresh_tokens WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>NOW() LIMIT 1", [tokenHash(refreshToken)]);
      if (!r.rowCount) return res.status(401).json({isSuccess:false,message:"Invalid or expired refresh token"});
      await dbPool.query("UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1", [tokenHash(refreshToken)]);
      const urow = await dbPool.query("SELECT username FROM app_users WHERE id=$1 AND is_active=TRUE", [r.rows[0].user_id]);
      if (!urow.rowCount) return res.status(401).json({isSuccess:false,message:"User no longer exists"});
      const user = await getUserWithRole(urow.rows[0].username);
      const tokens = await issueTokens(user, req);
      res.json({isSuccess:true,...tokens,user:publicUser(user)});
    } catch (e) { console.error(e); res.status(500).json({isSuccess:false,message:"Token refresh failed"}); }
  });

  app.post("/api/Account/logout", async (req, res) => {
    const refreshToken=String(req.body?.refreshToken||"");
    if (dbPool && refreshToken) await dbPool.query("UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1",[tokenHash(refreshToken)]).catch(()=>undefined);
    res.json({isSuccess:true,message:"Logged out successfully"});
  });

  app.get("/api/Account/me", requireAuth, async (req:any,res) => {
    if(!dbPool) return res.status(503).json({isSuccess:false,message:"Database unavailable"});
    const r=await dbPool.query("SELECT username FROM app_users WHERE id=$1 AND is_active=TRUE",[req.user.sub]);
    if(!r.rowCount) return res.status(404).json({isSuccess:false,message:"User not found"});
    const user=await getUserWithRole(r.rows[0].username);
    res.json({isSuccess:true,user:publicUser(user)});
  });


  // Password recovery. In production the reset token is never returned unless explicitly enabled for a trusted staging environment.
  app.post("/api/Account/forgot-password", rateLimit("forgot-password", 5, 15*60*1000), async (req,res) => {
    const identifier=String(req.body?.email||req.body?.username||'').trim().toLowerCase();
    const generic={isSuccess:true,message:"إذا كان الحساب موجوداً فسيتم إنشاء طلب استعادة كلمة المرور"};
    if(!identifier || !dbPool) return res.json(generic);
    const r=await dbPool.query(`SELECT id,email,full_name FROM app_users WHERE (lower(email)=lower($1) OR lower(username)=lower($1)) AND is_active=TRUE LIMIT 1`,[identifier]);
    if(!r.rowCount) return res.json(generic);
    const token=crypto.randomBytes(32).toString('hex');
    await dbPool.query(`UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL`,[r.rows[0].id]);
    await dbPool.query(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at,ip_address,user_agent) VALUES($1,$2,NOW()+INTERVAL '30 minutes',$3,$4)`,[r.rows[0].id,tokenHash(token),req.ip||null,String(req.headers['user-agent']||'').slice(0,500)]);
    const callback=String(process.env.PASSWORD_RESET_CALLBACK_URL||'').trim();
    if(callback){ try{ await fetch(callback,{method:'POST',headers:{'Content-Type':'application/json','X-Azhar-Reset-Secret':String(process.env.PASSWORD_RESET_CALLBACK_SECRET||'')},body:JSON.stringify({email:r.rows[0].email,name:r.rows[0].full_name,resetToken:token,expiresMinutes:30})}); }catch(e){ console.error('[password-reset] callback failed',e); } }
    if(!isProduction && process.env.PASSWORD_RESET_EXPOSE_TOKEN==='true') return res.json({...generic,resetToken:token});
    return res.json(generic);
  });

  app.post("/api/Account/reset-password", rateLimit("reset-password", 8, 15*60*1000), async (req,res) => {
    const token=String(req.body?.token||''); const password=String(req.body?.newPassword||req.body?.password||'');
    if(token.length<20 || password.length<8) return res.status(400).json({isSuccess:false,message:'بيانات إعادة تعيين كلمة المرور غير صحيحة'});
    if(!dbPool) return res.status(503).json({isSuccess:false,message:'الخدمة غير متاحة حالياً'});
    const r=await dbPool.query(`SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() LIMIT 1`,[tokenHash(token)]);
    if(!r.rowCount) return res.status(400).json({isSuccess:false,message:'رابط إعادة تعيين كلمة المرور غير صالح أو انتهت صلاحيته'});
    const c=await dbPool.connect(); try{ await c.query('BEGIN'); await c.query(`UPDATE app_users SET password_hash=$2,updated_at=NOW() WHERE id=$1`,[r.rows[0].user_id,hashPassword(password)]); await c.query(`UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1`,[r.rows[0].id]); await c.query(`UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`,[r.rows[0].user_id]); await c.query('COMMIT'); res.json({isSuccess:true,message:'تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن'}); }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  });

  // Public display route only for non-sensitive profile/facility images.
  app.get("/media/:id", async (req,res) => {
    if(!dbPool) return res.status(404).end();
    const r=await dbPool.query(`SELECT category,file_name,mime_type,content FROM media_assets WHERE id=$1`,[req.params.id]);
    if(!r.rowCount) return res.status(404).end();
    const row=r.rows[0];
    if(!['profile','facility-image'].includes(String(row.category))) return res.status(403).end();
    res.setHeader('Content-Type',row.mime_type); res.setHeader('Cache-Control','public, max-age=3600'); res.setHeader('Content-Disposition', safeContentDisposition(row.file_name, 'inline')); res.send(row.content);
  });

  // Protect all remaining /api/* routes with an access token
  app.use("/api", requireAuth);

  // Enforce RBAC for every business API. Admin always has full access.
  app.use("/api", (req:any,res,next) => {
    if (req.user?.role === "Admin" || req.user?.permissions?.includes("admin.manage")) return next();
    const p = req.path.toLowerCase();
    if (p.startsWith('/admin/')) return res.status(403).json({message:'ليس لديك صلاحية للوصول إلى إعدادات الإدارة'});
    if (p.startsWith('/tenant-portal')) return req.user?.role==='Tenant' ? next() : res.status(403).json({message:'هذه الخدمة مخصصة للمستأجر فقط'});
    if (p.startsWith('/staff-portal')) return req.user?.role==='Staff' ? next() : res.status(403).json({message:'هذه الخدمة مخصصة للموظفين فقط'});
    if (p.startsWith('/account/change-password')) return next();
    const write = ["POST","PUT","PATCH","DELETE"].includes(req.method);
    const rules: Array<[string,string]> = [
      ["/tenants","tenants"],["/contracts","contracts"],["/house","units"],["/buildings","units"],
      ["/electricitymeter","meters"],["/watermeter","meters"],["/payment","payments"],["/rental","payments"],
      ["/maintenance","maintenance"],["/complaints","complaints"],["/staff","staff"],["/expense","expenses"],
      ["/facilities","facilities"],["/facilitybookings","facilities"],["/company","companies"],
      ["/announcements","announcements"],["/letters","letters"],["/notifications","notifications"],
      ["/media","media"],["/profile","profile"],["/reports","reports"],["/search","dashboard"]
    ];
    const hit = rules.find(([prefix]) => p.startsWith(prefix));
    if (!hit) return res.status(403).json({message:'ليس لديك صلاحية لتنفيذ هذه العملية'});
    const permission = `${hit[1]}.${write ? "write" : "read"}`;
    return req.user?.permissions?.includes(permission) ? next() : res.status(403).json({message:'ليس لديك صلاحية لتنفيذ هذه العملية'});
  });

  // Persist successful JSON mutations before the success response is sent.
  // This prevents "success in UI, failed in database" states.
  app.use("/api", (req: any, res: any, next) => {
    const originalJson = res.json.bind(res);
    let jsonCommitted = false;
    res.json = (body:any) => {
      if (jsonCommitted) return res;
      jsonCommitted = true;
      (async () => {
        if (!dbPool) return originalJson(body);
        const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
        try {
          if (mutating && res.statusCode < 400) {
            // Persist in dependency order. Contracts/payments reference tenants, so never race them.
            await saveState("tenants", tenantsStore);
            await saveState("houses", housesStore);
            await saveState("staff", staffStore);
            await saveState("contracts", contractsStore);
            await saveState("payments", paymentsStore);
            await saveState("electricityMeters", electricityMetersStore);
            await saveState("maintenance", maintenanceStore);
            await saveState("letters", lettersStore);
            await saveState("announcements", announcementsStore);
            await saveState("complaints", complaintsStore);
            await saveState("expenses", expensesStore);
            await saveState("companies", companiesStore);
            await saveState("facilities", facilitiesStore);
            await saveState("facilityBookings", facilityBookingsStore);
            await saveState("notifications", notificationsStore);
          }
          await dbPool.query(
            "INSERT INTO azhar_audit_log(user_id, method, path, status_code, ip_address, user_agent, metadata) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)",
            [req.user?.sub || null, req.method, req.path, res.statusCode, req.ip || null, String(req.headers["user-agent"] || "").slice(0,500), JSON.stringify({query:req.query || {}})]
          );
          return originalJson(body);
        } catch (e:any) {
          console.error('[persistence] pre-response persistence failed', e);
          if (!res.headersSent) { res.status(500); return originalJson({message:'Database persistence failed',detail:isProduction?undefined:String(e?.message||e)}); }
        }
      })();
      return res;
    };
    next();
  });

  function cleanEntity(item:any){ if(!item)return null; const x={...item}; delete x.password; delete x.passwordHash; delete x.password_hash; return x; }
  async function linkedEntity(req:any, type:'tenant'|'staff'){
    if(!dbPool) return null;
    const ur=await dbPool.query(`SELECT id,email,entity_type,entity_id FROM app_users WHERE id=$1 AND is_active=TRUE LIMIT 1`,[req.user?.sub]);
    if(!ur.rowCount) return null;
    let entityId=ur.rows[0].entity_type===type ? ur.rows[0].entity_id : null;
    const store:any[]=type==='tenant'?tenantsStore:staffStore;
    let entity=entityId ? store.find((x:any)=>String(x.id)===String(entityId)) : null;
    if(!entity){ entity=store.find((x:any)=>String(x.email||'').trim().toLowerCase()===String(ur.rows[0].email||'').trim().toLowerCase()); if(entity){entityId=String(entity.id);await dbPool.query(`UPDATE app_users SET entity_type=$2,entity_id=$3,updated_at=NOW() WHERE id=$1`,[req.user.sub,type,entityId]);} }
    return entity ? {entity,entityId:String(entity.id),user:ur.rows[0]} : null;
  }
  function tenantContracts(tenant:any){ return contractsStore.filter((c:any)=>String(c.tenantId||'')===String(tenant.id) || (!!tenant.unitNumber && String(c.unitNumber||c.houseNumber||'')===String(tenant.unitNumber||tenant.houseNumber||''))); }
  function selfNotifications(req:any, link:any){ return notificationsStore.filter((n:any)=> !n.userId && !n.tenantId && !n.staffId || String(n.userId||'')===String(req.user.sub) || (link?.entityId && (String(n.tenantId||'')===link.entityId || String(n.staffId||'')===link.entityId))); }

  app.put('/api/Account/change-password', async (req:any,res)=>{
    if(!dbPool)return res.status(503).json({message:'الخدمة غير متاحة حالياً'});
    const current=String(req.body?.currentPassword||''); const next=String(req.body?.newPassword||'');
    if(next.length<8)return res.status(400).json({message:'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف'});
    const r=await dbPool.query(`SELECT password_hash FROM app_users WHERE id=$1 AND is_active=TRUE`,[req.user.sub]);
    if(!r.rowCount || !verifyPassword(current,r.rows[0].password_hash))return res.status(400).json({message:'كلمة المرور الحالية غير صحيحة'});
    const c=await dbPool.connect();try{await c.query('BEGIN');await c.query(`UPDATE app_users SET password_hash=$2,updated_at=NOW() WHERE id=$1`,[req.user.sub,hashPassword(next)]);await c.query(`UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`,[req.user.sub]);await c.query('COMMIT');res.json({message:'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مرة أخرى'});}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  });

  // Tenant self-service API. Identity is always derived from JWT -> app_users.entity_id, never from a tenantId supplied by the client.
  app.get('/api/tenant-portal/me', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'لم يتم ربط حسابك بملف مستأجر'});res.json({tenant:cleanEntity(link.entity),user:{id:req.user.sub,role:req.user.role}});});
  app.put('/api/tenant-portal/profile', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});const allowed=['phoneNumber','mobile','whatsapp','whatsappNumber','emergencyPhoneNumber','emergencyPhone','profileImageUrl'];for(const k of allowed)if(req.body?.[k]!==undefined)link.entity[k]=req.body[k];res.json(cleanEntity(link.entity));});
  app.get('/api/tenant-portal/contracts', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});res.json(tenantContracts(link.entity));});
  app.get('/api/tenant-portal/contracts/current', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});const list=tenantContracts(link.entity).filter((x:any)=>!x.isArchived&&String(x.status||'Active')!=='Archived').sort((a:any,b:any)=>String(b.leaseStartDate||'').localeCompare(String(a.leaseStartDate||'')));if(!list.length)return res.status(404).json({message:'لا يوجد عقد ساري حالياً'});res.json(list[0]);});
  app.get('/api/tenant-portal/installments', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link||!dbPool)return res.status(404).json({message:'ملف المستأجر غير موجود'});await refreshInstallmentStatuses(dbPool);const r=await dbPool.query(`SELECT id,contract_id AS "contractId",installment_no AS "installmentNo",due_date AS "dueDate",original_amount::float8 AS amount,paid_amount::float8 AS "paidAmount",GREATEST(original_amount-paid_amount,0)::float8 AS "remainingAmount",status FROM rent_installments WHERE tenant_id=$1 ORDER BY due_date,installment_no`,[link.entityId]);res.json(r.rows);});
  app.get('/api/tenant-portal/payments', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link||!dbPool)return res.status(404).json({message:'ملف المستأجر غير موجود'});const r=await dbPool.query(`SELECT p.id,p.receipt_no AS "receiptNo",p.contract_id AS "contractId",p.amount::float8,p.payment_method AS "paymentMethod",p.reference_no AS "referenceNo",p.payment_date AS "paymentDate",p.notes,p.status,COALESCE(SUM(a.amount),0)::float8 AS "allocatedAmount",(p.amount-COALESCE(SUM(a.amount),0))::float8 AS "unappliedAmount" FROM rental_payments p LEFT JOIN payment_allocations a ON a.payment_id=p.id WHERE p.tenant_id=$1 GROUP BY p.id ORDER BY p.payment_date DESC,p.created_at DESC`,[link.entityId]);res.json(r.rows);});
  app.get('/api/tenant-portal/ledger', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link||!dbPool)return res.status(404).json({message:'ملف المستأجر غير موجود'});await refreshInstallmentStatuses(dbPool);const installments=await dbPool.query(`SELECT id,contract_id AS "contractId",installment_no AS "installmentNo",due_date AS "dueDate",original_amount::float8 AS amount,paid_amount::float8 AS "paidAmount",GREATEST(original_amount-paid_amount,0)::float8 AS "remainingAmount",status FROM rent_installments WHERE tenant_id=$1 ORDER BY due_date`,[link.entityId]);const payments=await dbPool.query(`SELECT id,receipt_no AS "receiptNo",contract_id AS "contractId",amount::float8,payment_method AS "paymentMethod",payment_date AS "paymentDate",status FROM rental_payments WHERE tenant_id=$1 ORDER BY payment_date DESC`,[link.entityId]);const summary=installments.rows.reduce((a:any,x:any)=>{a.total+=Number(x.amount||0);a.paid+=Number(x.paidAmount||0);a.remaining+=Number(x.remainingAmount||0);if(x.status==='Overdue')a.overdue+=Number(x.remainingAmount||0);return a;},{total:0,paid:0,remaining:0,overdue:0});res.json({summary,installments:installments.rows,payments:payments.rows});});
  app.get('/api/tenant-portal/maintenance', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});const unit=String(link.entity.unitNumber||link.entity.houseNumber||'');res.json(maintenanceStore.filter((x:any)=>String(x.tenantId||'')===link.entityId || (!!unit&&String(x.unitNumber||x.houseNumber||'')===unit)));});
  app.post('/api/tenant-portal/maintenance', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});const unit=String(link.entity.unitNumber||link.entity.houseNumber||'');const contract=tenantContracts(link.entity).find((x:any)=>!x.isArchived);const item={id:`mnt-${Date.now()}`,ticketNo:`MNT-${Date.now()}`,tenantId:link.entityId,tenantName:link.entity.fullName||link.entity.name,tenantPhone:link.entity.phoneNumber||link.entity.mobile||'',unitNumber:unit,houseNumber:unit,buildingNumber:contract?.buildingNumber||'',category:req.body?.category||req.body?.workActivity||'General',title:req.body?.title||req.body?.category||'Maintenance',description:req.body?.description||req.body?.issueDescription||'',priority:req.body?.priority||'Medium',attachmentUrl:req.body?.attachmentUrl||'',status:'New',createdAt:new Date().toISOString(),requestDate:new Date().toISOString().slice(0,10)};maintenanceStore.unshift(item);res.status(201).json(item);});
  app.get('/api/tenant-portal/complaints', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});const unit=String(link.entity.unitNumber||link.entity.houseNumber||'');res.json(complaintsStore.filter((x:any)=>String(x.tenantId||'')===link.entityId || (!!unit&&String(x.unitNumber||'')===unit)));});
  app.post('/api/tenant-portal/complaints', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});const unit=String(link.entity.unitNumber||link.entity.houseNumber||'');const item={id:`cmp-${Date.now()}`,ticketNo:`CMP-${Date.now()}`,ticketNumber:`CMP-${Date.now()}`,tenantId:link.entityId,complainantName:link.entity.fullName||link.entity.name,phone:link.entity.phoneNumber||link.entity.mobile||'',unitNumber:unit,category:req.body?.category||'General',description:req.body?.description||'',priority:req.body?.priority||'Medium',attachmentUrl:req.body?.attachmentUrl||'',status:'New',createdAt:new Date().toISOString()};complaintsStore.unshift(item);res.status(201).json(item);});
  app.get('/api/tenant-portal/announcements', async (_req,res)=>res.json(announcementsStore.filter((x:any)=>x.isActive!==false)));
  app.get('/api/tenant-portal/facilities', async (_req,res)=>res.json(facilitiesStore.filter((x:any)=>x.isActive!==false)));
  app.get('/api/tenant-portal/facility-bookings', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});res.json(facilityBookingsStore.filter((x:any)=>String(x.tenantId||'')===link.entityId));});
  app.post('/api/tenant-portal/facility-bookings', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});const facility=facilitiesStore.find((x:any)=>String(x.id)===String(req.body?.facilityId||''));if(!facility)return res.status(400).json({message:'المرفق المحدد غير موجود'});const item={id:`booking-${Date.now()}`,bookingNo:`BK-${Date.now()}`,tenantId:link.entityId,tenantName:link.entity.fullName||link.entity.name,unitNumber:link.entity.unitNumber||link.entity.houseNumber||'',facilityId:facility.id,facilityName:facility.name||facility.title||'',bookingDate:req.body?.bookingDate||'',startTime:req.body?.startTime||'',endTime:req.body?.endTime||'',guestsCount:Number(req.body?.guestsCount||0),purpose:req.body?.purpose||'',notes:req.body?.notes||'',status:'Pending',createdAt:new Date().toISOString()};facilityBookingsStore.unshift(item);res.status(201).json(item);});
  app.put('/api/tenant-portal/facility-bookings/:id/cancel', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});const item=facilityBookingsStore.find((x:any)=>String(x.id)===req.params.id&&String(x.tenantId||'')===link.entityId);if(!item)return res.status(404).json({message:'الحجز غير موجود'});if(item.status==='Cancelled')return res.status(409).json({message:'الحجز ملغي بالفعل'});item.status='Cancelled';item.cancelReason=req.body?.reason||'';item.cancelledAt=new Date().toISOString();res.json(item);});
  app.get('/api/tenant-portal/notifications', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');res.json(selfNotifications(req,link));});
  app.put('/api/tenant-portal/notifications/:id/read', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');const item=selfNotifications(req,link).find((x:any)=>String(x.id)===req.params.id);if(!item)return res.status(404).json({message:'الإشعار غير موجود'});item.isRead=true;res.json(item);});
  app.get('/api/tenant-portal/documents', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link||!dbPool)return res.status(404).json({message:'ملف المستأجر غير موجود'});const contracts=tenantContracts(link.entity);const ids=[link.entityId,...contracts.map((x:any)=>String(x.id))];const r=await dbPool.query(`SELECT id,entity_type AS "entityType",entity_id AS "entityId",category,file_name AS "fileName",mime_type AS "mimeType",file_size AS "fileSize",created_at AS "createdAt" FROM media_assets WHERE entity_id=ANY($1::text[]) ORDER BY created_at DESC`,[ids]);res.json(r.rows);});
  app.get('/api/tenant-portal/letters', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});const eid=link.entityId;const name=(link.entity.fullName||link.entity.name||'').toLowerCase();res.json(lettersStore.filter((x:any)=>String(x.recipientId||'')===eid||String(x.tenantId||'')===eid||(name&&(String(x.recipientName||'').toLowerCase()===name))));});
  app.put('/api/tenant-portal/profile', async (req:any,res)=>{const link=await linkedEntity(req,'tenant');if(!link)return res.status(404).json({message:'ملف المستأجر غير موجود'});for(const k of ['fullName','fullNameArabic','email','phoneNumber','mobile','whatsappNumber','whatsapp','emergencyPhoneNumber','familyCount'])if(req.body?.[k]!==undefined)link.entity[k]=req.body[k];res.json(cleanEntity(link.entity));});

  // Staff self-service API. Staff can only update work assigned to their linked staff record.
  app.get('/api/staff-portal/me', async (req:any,res)=>{const link=await linkedEntity(req,'staff');if(!link)return res.status(404).json({message:'لم يتم ربط حسابك بملف موظف'});res.json({staff:cleanEntity(link.entity),user:{id:req.user.sub,role:req.user.role,permissions:req.user.permissions||[]}});});
  app.put('/api/staff-portal/profile', async (req:any,res)=>{const link=await linkedEntity(req,'staff');if(!link)return res.status(404).json({message:'ملف الموظف غير موجود'});for(const k of ['phoneNumber','phone','profileImageUrl'])if(req.body?.[k]!==undefined)link.entity[k]=req.body[k];res.json(cleanEntity(link.entity));});
  app.get('/api/staff-portal/dashboard', async (req:any,res)=>{const link=await linkedEntity(req,'staff');if(!link)return res.status(404).json({message:'ملف الموظف غير موجود'});const assigned=maintenanceStore.filter((x:any)=>String(x.assignedStaffId||x.assignedToId||'')===link.entityId);res.json({maintenance:{total:assigned.length,new:assigned.filter((x:any)=>['New','Open','Assigned'].includes(x.status)).length,inProgress:assigned.filter((x:any)=>['In Progress','InProgress'].includes(x.status)).length,done:assigned.filter((x:any)=>['Done','Closed','Completed'].includes(x.status)).length},notifications:selfNotifications(req,link).filter((x:any)=>!x.isRead).length});});
  app.get('/api/staff-portal/maintenance', async (req:any,res)=>{const link=await linkedEntity(req,'staff');if(!link)return res.status(404).json({message:'ملف الموظف غير موجود'});res.json(maintenanceStore.filter((x:any)=>String(x.assignedStaffId||x.assignedToId||'')===link.entityId).map((x:any)=>({...x,assignedStaffId:x.assignedStaffId||x.assignedToId||undefined,assignedStaffName:x.assignedStaffName||x.assignedToName||undefined})));});
  app.put('/api/staff-portal/maintenance/:id/status', async (req:any,res)=>{const link=await linkedEntity(req,'staff');if(!link)return res.status(404).json({message:'ملف الموظف غير موجود'});const item=maintenanceStore.find((x:any)=>String(x.id)===req.params.id&&String(x.assignedStaffId||x.assignedToId||'')===link.entityId);if(!item)return res.status(404).json({message:'طلب الصيانة غير موجود أو غير مسند إليك'});const requested=String(req.body?.status||''); const current=String(item.status||'New'); const terminal=['Done','Completed','Closed']; if(terminal.includes(current)) return res.status(409).json({message:'طلب الصيانة مكتمل بالفعل ولا يمكن تغييره من حساب الموظف'}); const allowedByCurrent:Record<string,string[]>={New:['In Progress'],Assigned:['In Progress'],Open:['In Progress'],'In Progress':['Done','Completed'],'InProgress':['Done','Completed']}; const allowed=allowedByCurrent[current]||[]; if(!allowed.includes(requested)) return res.status(400).json({message:'لا يمكن الانتقال من الحالة الحالية إلى الحالة المحددة'}); item.status=requested==='Completed'?'Done':requested;item.updatedAt=new Date().toISOString();res.json(item);});
  app.put('/api/staff-portal/maintenance/:id/notes', async (req:any,res)=>{const link=await linkedEntity(req,'staff');if(!link)return res.status(404).json({message:'ملف الموظف غير موجود'});const item=maintenanceStore.find((x:any)=>String(x.id)===req.params.id&&String(x.assignedStaffId||x.assignedToId||'')===link.entityId);if(!item)return res.status(404).json({message:'طلب الصيانة غير موجود أو غير مسند إليك'});item.workNotes=req.body?.notes||'';item.notes=req.body?.notes||item.notes||'';item.updatedAt=new Date().toISOString();res.json(item);});
  app.get('/api/staff-portal/complaints', async (req:any,res)=>{ if(!req.user?.permissions?.includes('complaints.read'))return res.status(403).json({message:'ليس لديك صلاحية لعرض الشكاوى'});res.json(complaintsStore);});
  app.put('/api/staff-portal/complaints/:id/status', async (req:any,res)=>{if(!req.user?.permissions?.includes('complaints.write'))return res.status(403).json({message:'ليس لديك صلاحية لتحديث الشكاوى'});const item=complaintsStore.find((x:any)=>String(x.id)===req.params.id);if(!item)return res.status(404).json({message:'الشكوى غير موجودة'});item.status=req.body?.status||item.status;item.resolution=req.body?.resolution??item.resolution;res.json(item);});
  app.get('/api/staff-portal/units', async (req:any,res)=>{if(!req.user?.permissions?.includes('units.read'))return res.status(403).json({message:'ليس لديك صلاحية لعرض الوحدات'});res.json(housesStore);});
  app.get('/api/staff-portal/tenants', async (req:any,res)=>{if(!req.user?.permissions?.includes('tenants.read'))return res.status(403).json({message:'ليس لديك صلاحية لعرض المستأجرين'});res.json(tenantsStore.map(cleanEntity));});
  app.get('/api/staff-portal/announcements', async (_req,res)=>res.json(announcementsStore.filter((x:any)=>x.isActive!==false)));
  app.get('/api/staff-portal/notifications', async (req:any,res)=>{const link=await linkedEntity(req,'staff');res.json(selfNotifications(req,link));});
  app.put('/api/staff-portal/notifications/:id/read', async (req:any,res)=>{const link=await linkedEntity(req,'staff');const item=selfNotifications(req,link).find((x:any)=>String(x.id)===req.params.id);if(!item)return res.status(404).json({message:'الإشعار غير موجود'});item.isRead=true;res.json(item);});

  async function mediaScope(req:any){
    if(req.user?.role==='Admin'||req.user?.permissions?.includes('admin.manage'))return {all:true,ids:new Set<string>()};
    if(req.user?.role==='Tenant'){
      const link=await linkedEntity(req,'tenant'); if(!link)return {all:false,ids:new Set<string>()};
      const ids=new Set<string>([String(req.user.sub),link.entityId,...tenantContracts(link.entity).map((x:any)=>String(x.id))]);
      for(const x of maintenanceStore)if(String(x.tenantId||'')===link.entityId)ids.add(String(x.id));
      for(const x of complaintsStore)if(String(x.tenantId||'')===link.entityId)ids.add(String(x.id));
      return {all:false,ids};
    }
    if(req.user?.role==='Staff'){
      const link=await linkedEntity(req,'staff'); if(!link)return {all:false,ids:new Set<string>([String(req.user.sub)])};
      const ids=new Set<string>([String(req.user.sub),link.entityId]);
      for(const x of maintenanceStore)if(String(x.assignedStaffId||x.assignedToId||'')===link.entityId)ids.add(String(x.id));
      return {all:false,ids};
    }
    return {all:false,ids:new Set<string>([String(req.user?.sub||'')])};
  }
  async function canAccessMedia(req:any, entityId:any){ const scope=await mediaScope(req); return scope.all || (!!entityId && scope.ids.has(String(entityId))); }

  // Media API - database-backed uploads for profile photos, facility images and tenant documents
  app.post("/api/Media", rateLimit("media-upload", 30, 10*60*1000), async (req:any,res) => {
    if(!dbPool) return res.status(503).json({message:"خدمة رفع الملفات غير متاحة حالياً"});
    const { fileName, mimeType, dataBase64, entityType, entityId, category } = req.body || {};
    if(!fileName || !mimeType || !dataBase64 || !category) return res.status(400).json({message:"بيانات الملف غير مكتملة"});
    const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif','application/pdf']);
    if(!allowed.has(String(mimeType))) return res.status(400).json({message:"نوع الملف غير مدعوم. استخدم صورة JPG/PNG/WEBP أو ملف PDF"});
    let content:Buffer;
    try { content = Buffer.from(String(dataBase64).replace(/^data:[^;]+;base64,/,''), 'base64'); } catch { return res.status(400).json({message:"تعذر قراءة الملف"}); }
    const max = category === 'profile' ? 3*1024*1024 : 8*1024*1024;
    if(!content.length) return res.status(400).json({message:"الملف فارغ"});
    if(content.length > max) return res.status(413).json({message: category==='profile' ? "حجم صورة البروفايل يجب ألا يتجاوز 3 ميجابايت" : "حجم الملف يجب ألا يتجاوز 8 ميجابايت"});
    const targetId=String(entityId||req.user?.sub||'');
    if(!(await canAccessMedia(req,targetId))) return res.status(403).json({message:'لا يمكنك رفع ملفات لهذا السجل'});
    if(req.user?.role==='Tenant' && String(category)==='facility-image') return res.status(403).json({message:'ليس لديك صلاحية لتعديل صور المرافق'});
    const r=await dbPool.query(`INSERT INTO media_assets(entity_type,entity_id,category,file_name,mime_type,file_size,content,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,file_name,mime_type,file_size,created_at`,[entityType||null,targetId||null,String(category),String(fileName).slice(0,255),String(mimeType),content.length,content,req.user?.sub||null]);
    const row=r.rows[0]; const publicDisplay=['profile','facility-image'].includes(String(category)); res.status(201).json({...row,url:publicDisplay?`/media/${row.id}`:`/api/Media/${row.id}/content`});
  });
  app.get("/api/Media/:id/content", async (req:any,res) => {
    if(!dbPool) return res.status(404).end();
    const r=await dbPool.query(`SELECT entity_id,file_name,mime_type,content FROM media_assets WHERE id=$1`,[req.params.id]);
    if(!r.rowCount) return res.status(404).json({message:"الملف غير موجود"});
    if(!(await canAccessMedia(req,r.rows[0].entity_id))) return res.status(403).json({message:'ليس لديك صلاحية لعرض هذا الملف'});
    res.setHeader('Content-Type',r.rows[0].mime_type); res.setHeader('Content-Disposition', safeContentDisposition(r.rows[0].file_name, 'inline')); res.setHeader('Cache-Control','private, max-age=3600'); res.send(r.rows[0].content);
  });
  app.get("/api/Media", async (req:any,res) => {
    if(!dbPool) return res.json([]);
    const scope=await mediaScope(req);
    const requestedEntity=req.query.entityId?String(req.query.entityId):null;
    if(requestedEntity && !scope.all && !scope.ids.has(requestedEntity)) return res.status(403).json({message:'ليس لديك صلاحية لعرض ملفات هذا السجل'});
    const ids=[...scope.ids];
    const r=scope.all
      ? await dbPool.query(`SELECT id,entity_type AS "entityType",entity_id AS "entityId",category,file_name AS "fileName",mime_type AS "mimeType",file_size AS "fileSize",created_at AS "createdAt" FROM media_assets WHERE ($1::text IS NULL OR entity_type=$1) AND ($2::text IS NULL OR entity_id=$2) ORDER BY created_at DESC`,[req.query.entityType||null,requestedEntity])
      : await dbPool.query(`SELECT id,entity_type AS "entityType",entity_id AS "entityId",category,file_name AS "fileName",mime_type AS "mimeType",file_size AS "fileSize",created_at AS "createdAt" FROM media_assets WHERE entity_id=ANY($1::text[]) AND ($2::text IS NULL OR entity_type=$2) AND ($3::text IS NULL OR entity_id=$3) ORDER BY created_at DESC`,[ids,req.query.entityType||null,requestedEntity]);
    res.json(r.rows.map((x:any)=>({...x,url:`/api/Media/${x.id}/content`})));
  });
  app.delete("/api/Media/:id", async (req:any,res) => { if(!dbPool)return res.status(503).json({message:"قاعدة البيانات غير متاحة"}); const f=await dbPool.query(`SELECT entity_id FROM media_assets WHERE id=$1`,[req.params.id]); if(!f.rowCount)return res.status(404).json({message:"الملف غير موجود"}); if(!(await canAccessMedia(req,f.rows[0].entity_id)))return res.status(403).json({message:'ليس لديك صلاحية لحذف هذا الملف'}); const r=await dbPool.query(`DELETE FROM media_assets WHERE id=$1 RETURNING id`,[req.params.id]); res.json({message:"تم حذف الملف"}); });

  // Notifications API

  app.get("/api/Notifications", async (req:any, res) => {
    const link=req.user?.role==='Tenant'?await linkedEntity(req,'tenant'):req.user?.role==='Staff'?await linkedEntity(req,'staff'):null;
    const rows=(req.user?.role==='Admin'||req.user?.permissions?.includes('admin.manage'))?notificationsStore:selfNotifications(req,link);
    res.json({ value: rows, Count: rows.length });
  });

  app.put("/api/Notifications/:id/read", async (req:any, res) => {
    const link=req.user?.role==='Tenant'?await linkedEntity(req,'tenant'):req.user?.role==='Staff'?await linkedEntity(req,'staff'):null;
    const allowed=(req.user?.role==='Admin'||req.user?.permissions?.includes('admin.manage'))?notificationsStore:selfNotifications(req,link);
    const item=allowed.find((n:any)=>String(n.id)===req.params.id);
    if(!item)return res.status(404).json({message:'الإشعار غير موجود'}); item.isRead=true; res.json({message:'تم تعليم الإشعار كمقروء'});
  });

  app.put("/api/Account/fcm-token", async (req:any, res) => {
    const token=String(req.body?.fcmToken||'').trim(); if(!token)return res.status(400).json({message:'رمز جهاز الإشعارات مطلوب'});
    if(dbPool) await dbPool.query(`INSERT INTO user_devices(user_id,fcm_token,device_type,last_seen_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(fcm_token) DO UPDATE SET user_id=EXCLUDED.user_id,device_type=EXCLUDED.device_type,last_seen_at=NOW()`,[req.user.sub,token,String(req.body?.deviceType||'web')]);
    res.json({ message: "تم تسجيل الجهاز لاستقبال الإشعارات" });
  });

  // 2. Tenants API
  app.get("/api/Tenants", (req, res) => {
    const q = String(req.query.q || req.query.search || "");
    const filtered = tenantsStore.filter((t:any) => !t.isDeleted && matchesQuery(t, q));
    res.json(paginated(filtered, req));
  });

  app.get("/api/Tenants/:id", (req, res) => {
    const tenant = tenantsStore.find((t:any) => t.id === req.params.id && !t.isDeleted);
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    res.json(tenant);
  });

  app.post("/api/Tenants", async (req:any, res:any) => {
    const body = req.body || {};
    const portalPassword = String(body.password || '').trim();
    const portalUsername = String(body.username || '').trim();
    if (!String(body.email || '').trim() && !portalUsername) return res.status(400).json({message:"البريد الإلكتروني أو اسم المستخدم مطلوب"});
    if (portalPassword.length < 8) return res.status(400).json({message:"كلمة مرور الدخول يجب ألا تقل عن 8 أحرف"});
    const newTenant = {
      id: body.id || `tenant-${Date.now()}`,
      fullName: body.fullName || body.FullName || "New Tenant",
      fullNameArabic: body.fullNameArabic || body.FullNameArabic || "",
      email: body.email || body.Email || "",
      username: portalUsername,
      phoneNumber: body.phoneNumber || body.PhoneNumber || "",
      emergencyPhoneNumber: body.emergencyPhoneNumber || body.EmergencyPhoneNumber || "",
      nationality: body.nationality || body.Nationality || "",
      familyCount: body.familyCount || body.FamilyCount || "1",
      workNotes: body.workNotes || body.WorkNotes || "",
      isMarried: body.isMarried !== undefined ? Boolean(body.isMarried) : true,
      whatsappNumber: body.whatsappNumber || body.WhatsappNumber || body.phoneNumber || "",
      tenantRemarks: body.tenantRemarks || body.TenantRemarks || "",
      companyName: body.companyName || body.CompanyName || "",
      houseNumber: body.houseNumber || body.HouseNumber || "",
      contractNumber: body.contractNumber || body.ContractNumber || "",
      contractStartDate: body.contractStartDate || body.ContractStartDate || "",
      contractEndDate: body.contractEndDate || body.ContractEndDate || "",
      annualRent: Number(body.annualRent || body.AnnualRent || 0),
      monthlyRent: Number(body.monthlyRent || body.MonthlyRent || 0),
      paidAmount: 0,
      remainingAmount: 0,
      paymentMethod: normalizePaymentFrequency(body.paymentMethod || body.PaymentMethod || "Quarterly"),
      paymentDueDay: body.paymentDueDay || body.PaymentDueDay || "1",
      electricityMeter: body.electricityMeter || body.ElectricityMeter || "",
      waterCost: body.waterCost || body.WaterCost || "0",
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      identityDocumentUrl: body.identityDocumentUrl || '', identityDocumentName: body.identityDocumentName || '',
      manualContractDocumentUrl: body.manualContractDocumentUrl || '', manualContractDocumentName: body.manualContractDocumentName || ''
    };
    const tenantUnit = housesStore.find((h:any) => String(h.id) === String(body.houseId || body.HouseId || '') || String(h.houseNumber || h.unitNumber || '') === String(newTenant.houseNumber || ''));
    if (tenantUnit) newTenant.houseId = tenantUnit.id;
    tenantsStore.push(newTenant);
    try {
      const credentials = await setEntityPassword('tenant', newTenant.id, portalPassword);
      if (credentials?.username) newTenant.username = credentials.username;
    } catch (e:any) {
      tenantsStore = tenantsStore.filter((x:any) => String(x.id) !== String(newTenant.id));
      return res.status(400).json({message:e?.message || 'تعذر إنشاء حساب دخول المستأجر'});
    }
    if (dbPool) await dbPool.query(`UPDATE tenants SET house_id=$2 WHERE id=$1`, [newTenant.id, newTenant.houseId || null]);
    res.status(201).json(newTenant);
  });

  app.put("/api/Tenants/:id", async (req:any, res:any) => {
    const idx = tenantsStore.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Tenant not found" });
    const existing:any = tenantsStore[idx];
    const body = req.body;
    const updated = {
      ...existing,
      fullName: body.fullName ?? body.FullName ?? existing.fullName,
      fullNameArabic: body.fullNameArabic ?? body.FullNameArabic ?? existing.fullNameArabic,
      email: body.email ?? body.Email ?? existing.email,
      username: body.username ?? existing.username ?? '',
      phoneNumber: body.phoneNumber ?? body.PhoneNumber ?? existing.phoneNumber,
      emergencyPhoneNumber: body.emergencyPhoneNumber ?? body.EmergencyPhoneNumber ?? existing.emergencyPhoneNumber,
      nationality: body.nationality ?? body.Nationality ?? existing.nationality,
      familyCount: body.familyCount ?? body.FamilyCount ?? existing.familyCount,
      workNotes: body.workNotes ?? body.WorkNotes ?? existing.workNotes,
      isMarried: body.isMarried !== undefined ? Boolean(body.isMarried) : existing.isMarried,
      whatsappNumber: body.whatsappNumber ?? body.WhatsappNumber ?? existing.whatsappNumber,
      tenantRemarks: body.tenantRemarks ?? body.TenantRemarks ?? existing.tenantRemarks,
      companyName: body.companyName ?? body.CompanyName ?? existing.companyName,
      houseNumber: body.houseNumber ?? body.HouseNumber ?? existing.houseNumber,
      houseId: body.houseId ?? body.HouseId ?? existing.houseId,
      contractNumber: body.contractNumber ?? body.ContractNumber ?? existing.contractNumber,
      contractStartDate: body.contractStartDate ?? body.ContractStartDate ?? existing.contractStartDate,
      contractEndDate: body.contractEndDate ?? body.ContractEndDate ?? existing.contractEndDate,
      annualRent: body.annualRent !== undefined ? Number(body.annualRent) : existing.annualRent,
      monthlyRent: body.monthlyRent !== undefined ? Number(body.monthlyRent) : existing.monthlyRent,
      paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) : existing.paidAmount,
      remainingAmount: body.remainingAmount !== undefined ? Number(body.remainingAmount) : existing.remainingAmount,
      paymentMethod: body.paymentMethod ?? body.PaymentMethod ?? existing.paymentMethod,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      identityDocumentUrl: body.identityDocumentUrl ?? existing.identityDocumentUrl, identityDocumentName: body.identityDocumentName ?? existing.identityDocumentName,
      manualContractDocumentUrl: body.manualContractDocumentUrl ?? existing.manualContractDocumentUrl, manualContractDocumentName: body.manualContractDocumentName ?? existing.manualContractDocumentName
    };
    tenantsStore[idx] = updated;
    const portalPassword = String(body.password || '').trim();
    if (portalPassword) {
      try {
        const credentials = await setEntityPassword('tenant', updated.id, portalPassword);
        if (credentials?.username) updated.username = credentials.username;
      } catch (e:any) { return res.status(400).json({message:e?.message || 'تعذر تحديث بيانات دخول المستأجر'}); }
    }
    const updatedUnit = housesStore.find((h:any) => String(h.id) === String(updated.houseId || '') || String(h.houseNumber || h.unitNumber || '') === String(updated.houseNumber || ''));
    if (updatedUnit) updated.houseId = updatedUnit.id;
    if (dbPool) await dbPool.query(`UPDATE tenants SET house_id=$2 WHERE id=$1`, [updated.id, updated.houseId || null]);
    res.json(updated);
  });

  app.get("/api/Tenants/:id/history", (req, res) => {
    const tenant = tenantsStore.find((t:any) => String(t.id) === String(req.params.id));
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    const history = contractsStore
      .filter((c:any) => String(c.tenantId || '') === String(tenant.id))
      .sort((a:any,b:any) => String(b.leaseStartDate || b.contractStartDate || '').localeCompare(String(a.leaseStartDate || a.contractStartDate || '')));
    const current = history.find((c:any) => String(c.status || '').toLowerCase() === 'active' && !c.isArchived) || null;
    res.json({ tenant: cleanEntity(tenant), currentContract: current, currentUnit: current ? { compoundId: current.compoundId, compoundName: current.compoundName, buildingNumber: current.buildingNumber, unitNumber: current.unitNumber || current.houseNumber } : null, history });
  });

  app.delete("/api/Tenants/:id", async (req:any, res) => {
    const tenantId = String(req.params.id);
    const idx = tenantsStore.findIndex((t:any) => String(t.id) === tenantId && !t.isDeleted);
    if (idx === -1) return res.status(404).json({ message: "المستأجر غير موجود أو تم حذفه بالفعل" });

    // A settled tenant may be removed from active use even if historical payments exist.
    // We block only when there is an actual outstanding rental balance.
    if (dbPool) {
      const balance = await dbPool.query(`
        SELECT COALESCE(SUM(GREATEST(original_amount - paid_amount, 0)), 0)::numeric AS outstanding
        FROM rent_installments
        WHERE tenant_id=$1 AND status <> 'Cancelled'
      `, [tenantId]);
      const outstanding = Number(balance.rows[0]?.outstanding || 0);
      if (outstanding > 0.005) {
        return res.status(409).json({
          message: `لا يمكن حذف المستأجر لأن عليه مبلغ مستحق قدره ${outstanding.toFixed(2)}. قم بتسوية المستحقات أولاً.`,
          outstandingAmount: Number(outstanding.toFixed(2))
        });
      }
    }

    const deletedAt = new Date().toISOString();
    tenantsStore[idx] = {
      ...tenantsStore[idx],
      isActive: false,
      isDeleted: true,
      deletedAt
    };

    // Close any still-active contracts after the balance has reached zero, but preserve
    // the contract/payment ledger for audit and tenant/unit history.
    contractsStore = contractsStore.map((c:any) => {
      if (String(c.tenantId || '') !== tenantId) return c;
      const active = String(c.status || '').toLowerCase() === 'active' && !c.isArchived;
      return active ? { ...c, status: 'Archived', isArchived: true, archivedAt: deletedAt, archivedReason: 'Tenant removed after full settlement' } : c;
    });

    if (dbPool) {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        const users = await client.query(`SELECT id FROM app_users WHERE entity_type='tenant' AND entity_id=$1`, [tenantId]);
        for (const row of users.rows) await client.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [row.id]);
        await client.query(`UPDATE app_users SET is_active=FALSE, updated_at=NOW() WHERE entity_type='tenant' AND entity_id=$1`, [tenantId]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally { client.release(); }
      await saveState('tenants', tenantsStore);
      await saveState('contracts', contractsStore);
    }

    res.json({
      message: "تم حذف المستأجر من النظام بعد التأكد من تسوية جميع المستحقات، مع الاحتفاظ بالسجل المالي للأرشيف.",
      deleted: true,
      archivedFinancialHistory: true
    });
  });

  app.put("/api/Tenants/:id/toggle-active", (req, res) => {
    const idx = tenantsStore.findIndex(t => t.id === req.params.id);
    if (idx !== -1) {
      tenantsStore[idx].isActive = !tenantsStore[idx].isActive;
      res.json(tenantsStore[idx]);
    } else {
      res.status(404).json({ message: "Tenant not found" });
    }
  });

  // 3. Contracts API
  app.get("/api/Contracts", async (req, res) => {
    const q = String(req.query.q || req.query.search || "");
    let rows = contractsStore.filter(c => matchesQuery(c, q));
    if (dbPool && rows.length) {
      await refreshInstallmentStatuses(dbPool);
      const ids = rows.map((c:any) => String(c.id));
      const r = await dbPool.query(
        `SELECT contract_id, MIN(due_date) FILTER (WHERE status IN ('Pending','Partially Paid','Overdue')) AS next_due_date
         FROM rent_installments WHERE contract_id = ANY($1::text[]) AND status <> 'Cancelled' GROUP BY contract_id`,
        [ids]
      );
      const meta = new Map(r.rows.map((x:any) => [String(x.contract_id), x.next_due_date]));
      rows = rows.map((c:any) => {
        const clean = { ...c };
        applyNextPaymentMeta(clean, meta.get(String(c.id)));
        return clean;
      });
    } else {
      rows = rows.map((c:any) => {
        const clean = { ...c };
        const next = Array.isArray(clean.installments)
          ? clean.installments
              .filter((i:any) => Number(i.paidAmount || 0) < Number(i.amount || i.originalAmount || 0) && i.status !== 'Cancelled')
              .sort((a:any,b:any) => String(a.dueDate||'').localeCompare(String(b.dueDate||'')))[0]?.dueDate
          : clean.nextPaymentDate;
        applyNextPaymentMeta(clean, next);
        return clean;
      });
    }
    res.json(paginated(rows, req));
  });

  app.post("/api/Contracts", async (req, res) => {
    const body = req.body;
    if (!(body.tenantId || body.TenantId)) return res.status(400).json({message:"يجب اختيار المستأجر"});
    if (!(body.houseId || body.HouseId || body.unitNumber || body.UnitNumber || body.houseNumber || body.HouseNumber)) return res.status(400).json({message:"يجب اختيار الوحدة"});
    if (!(body.leaseStartDate || body.LeaseStartDate)) return res.status(400).json({message:"تاريخ بداية العقد مطلوب"});
    if (Number(body.annualRent || body.AnnualRent || 0) <= 0) return res.status(400).json({message:"قيمة إيجار الوحدة يجب أن تكون أكبر من صفر"});
    const selectedUnit = housesStore.find((h:any) => String(h.id) === String(body.houseId || body.HouseId || '')) || housesStore.find((h:any) => String(h.houseNumber || h.unitNumber || '') === String(body.unitNumber || body.UnitNumber || body.houseNumber || body.HouseNumber || ''));
    if (!selectedUnit) return res.status(400).json({message:"الوحدة المحددة غير موجودة"});
    const selectedMeter = electricityMetersStore.find((m:any) => String(m.unitId || m.houseId || '') === String(selectedUnit.id));
    const newContract = {
      id: body.id || `contract-${Date.now()}`,
      contractNumber: body.contractNumber || body.ContractNumber || `2024${Math.floor(10000 + Math.random() * 90000)}`,
      contractNo: body.contractNo || body.contractNumber || body.ContractNumber || `2024${Math.floor(10000 + Math.random() * 90000)}`,
      houseNumber: selectedUnit.houseNumber || selectedUnit.unitNumber || body.houseNumber || body.HouseNumber || "",
      houseId: selectedUnit.id,
      buildingNumber: selectedUnit.buildingNumber || body.buildingNumber || body.BuildingNumber || "",
      unitType: selectedUnit.type || body.unitType || body.UnitType || "",
      unitNumber: selectedUnit.houseNumber || selectedUnit.unitNumber || body.unitNumber || body.UnitNumber || "",
      compoundId: selectedUnit.compoundId || body.compoundId || '1',
      compoundName: selectedUnit.compoundName || body.compoundName || 'Azhar Residence',
      tenantId: body.tenantId || body.TenantId || "",
      tenantName: body.tenantName || body.TenantName || "",
      tenantMobile: body.tenantMobile || body.TenantMobile || "",
      emergencyPhone: body.emergencyPhone || body.EmergencyPhone || "",
      nationalId: body.nationalId || body.NationalId || "",
      contractOf: body.contractOf || body.ContractOf || "",
      leaseStartDate: body.leaseStartDate || body.LeaseStartDate || "",
      leaseEndDate: body.leaseEndDate || body.LeaseEndDate || "",
      leaseDurationMonths: Number(body.leaseDurationMonths || body.LeaseDurationMonths || 12),
      annualRent: Number(body.annualRent || body.AnnualRent || 0),
      monthlyRent: Number(body.monthlyRent || body.MonthlyRent || 0),
      waterYearlyBill: Number(body.waterYearlyBill || body.WaterYearlyBill || 0),
      totalYearlyRent: 0,
      discount: Number(body.discount || body.Discount || 0),
      paidAmount: 0,
      remainingAmount: 0,
      paymentFrequency: normalizePaymentFrequency(body.paymentFrequency || body.PaymentFrequency || body.paymentMethod || body.PaymentMethod || "Quarterly"),
      paymentMethod: normalizePaymentFrequency(body.paymentMethod || body.PaymentMethod || body.paymentFrequency || body.PaymentFrequency || "Quarterly"),
      paymentNumber: body.paymentNumber || body.PaymentNumber || "",
      electricityMeterNumber: selectedMeter?.meterNumber || body.electricityMeterNumber || body.ElectricityMeterNumber || "",
      verifiedInEjar: body.verifiedInEjar !== undefined ? Boolean(body.verifiedInEjar) : false,
      transferAccountToTenant: false,
      insurance: Number(body.insurance || body.Insurance || 0),
      commission: Number(body.commission || body.Commission || 0),
      englishNotes: body.englishNotes || body.EnglishNotes || "",
      arabicNotes: body.arabicNotes || body.ArabicNotes || "",
      status: body.status || "Active",
      isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : false,
      adminNote: body.adminNote || body.AdminNote || null,
      contractDocumentUrl: body.contractDocumentUrl || body.ContractDocumentUrl || null,
      contractDocumentName: body.contractDocumentName || body.ContractDocumentName || null,
      notes: body.notes || [],
      installments: body.installments || []
    };
    normalizeContractMoney(newContract);
    newContract.remainingAmount = Math.max(0, contractGross(newContract) - Number(newContract.paidAmount || 0));
    contractsStore.push(newContract);
    if (dbPool) {
      await saveState("contracts", contractsStore);
      await dbPool.query(`UPDATE contracts SET house_id=$2 WHERE id=$1`, [newContract.id, newContract.houseId || null]);
      newContract.installments = await rebuildContractSchedule(newContract);
      await syncContractMoney(newContract);
    }
    res.status(201).json(newContract);
  });

  app.put("/api/Contracts/:id", async (req, res) => {
    const idx = contractsStore.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Contract not found" });
    const existing = contractsStore[idx];
    const body = req.body;
    const financialNumberFields = ["annualRent","waterYearlyBill","discount"];
    const financialTextFields = ["paymentFrequency","paymentMethod","leaseStartDate"];
    const scheduleFieldsChanged =
      financialNumberFields.some(k => Object.prototype.hasOwnProperty.call(body,k) && Number(body[k] ?? 0) !== Number((existing as any)[k] ?? 0)) ||
      financialTextFields.some(k => Object.prototype.hasOwnProperty.call(body,k) && String(body[k] ?? '') !== String((existing as any)[k] ?? ''));
    if(dbPool && scheduleFieldsChanged){
      const r=await dbPool.query(`SELECT COUNT(*)::int count FROM payment_allocations pa JOIN rent_installments ri ON ri.id=pa.installment_id WHERE ri.contract_id=$1`,[req.params.id]);
      if(Number(r.rows[0]?.count||0)>0)return res.status(409).json({message:"لا يمكن تعديل قيمة الإيجار أو البيانات المالية بعد تسجيل دفعات. يمكنك تعديل الحالة أو الأرشفة، ولتغيير البيانات المالية استخدم التجديد أو التسوية."});
    }
    const updated = {
      ...existing,
      ...body,
      contractNumber: body.contractNumber ?? existing.contractNumber,
      contractNo: body.contractNo ?? existing.contractNo ?? existing.contractNumber,
      houseNumber: body.houseNumber ?? existing.houseNumber,
      houseId: body.houseId ?? existing.houseId,
      buildingNumber: body.buildingNumber ?? existing.buildingNumber,
      unitType: body.unitType ?? existing.unitType,
      unitNumber: body.unitNumber ?? existing.unitNumber,
      tenantId: body.tenantId ?? existing.tenantId,
      tenantName: body.tenantName ?? existing.tenantName,
      tenantMobile: body.tenantMobile ?? existing.tenantMobile,
      emergencyPhone: body.emergencyPhone ?? existing.emergencyPhone,
      nationalId: body.nationalId ?? existing.nationalId,
      contractOf: body.contractOf ?? existing.contractOf,
      leaseStartDate: body.leaseStartDate ?? existing.leaseStartDate,
      leaseEndDate: body.leaseEndDate ?? existing.leaseEndDate,
      leaseDurationMonths: body.leaseDurationMonths !== undefined ? Number(body.leaseDurationMonths) : existing.leaseDurationMonths,
      annualRent: body.annualRent !== undefined ? Number(body.annualRent) : existing.annualRent,
      monthlyRent: body.monthlyRent !== undefined ? Number(body.monthlyRent) : existing.monthlyRent,
      waterYearlyBill: body.waterYearlyBill !== undefined ? Number(body.waterYearlyBill) : existing.waterYearlyBill,
      totalYearlyRent: 0,
      discount: body.discount !== undefined ? Number(body.discount) : existing.discount,
      paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) : existing.paidAmount,
      remainingAmount: body.remainingAmount !== undefined ? Number(body.remainingAmount) : existing.remainingAmount,
      paymentFrequency: normalizePaymentFrequency(body.paymentFrequency ?? existing.paymentFrequency ?? body.paymentMethod ?? existing.paymentMethod),
      paymentMethod: normalizePaymentFrequency(body.paymentMethod ?? existing.paymentMethod ?? body.paymentFrequency ?? existing.paymentFrequency),
      paymentNumber: body.paymentNumber ?? existing.paymentNumber,
      electricityMeterNumber: body.electricityMeterNumber ?? existing.electricityMeterNumber,
      verifiedInEjar: body.verifiedInEjar !== undefined ? Boolean(body.verifiedInEjar) : existing.verifiedInEjar,
      transferAccountToTenant: body.transferAccountToTenant !== undefined ? Boolean(body.transferAccountToTenant) : existing.transferAccountToTenant,
      insurance: body.insurance !== undefined ? Number(body.insurance) : existing.insurance,
      commission: body.commission !== undefined ? Number(body.commission) : existing.commission,
      englishNotes: body.englishNotes ?? existing.englishNotes,
      arabicNotes: body.arabicNotes ?? existing.arabicNotes,
      status: body.status ?? existing.status,
      isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : existing.isArchived,
      adminNote: body.adminNote ?? existing.adminNote,
      contractDocumentUrl: body.contractDocumentUrl ?? existing.contractDocumentUrl,
      contractDocumentName: body.contractDocumentName ?? existing.contractDocumentName,
      notes: body.notes ?? existing.notes,
      installments: body.installments ?? existing.installments
    };
    normalizeContractMoney(updated);
    if (!dbPool) updated.remainingAmount = Math.max(0, contractGross(updated) - Number(updated.paidAmount || 0));
    contractsStore[idx] = updated;
    if (dbPool) {
      await saveState("contracts", contractsStore);
      await dbPool.query(`UPDATE contracts SET house_id=$2 WHERE id=$1`, [updated.id, updated.houseId || null]);
      if (scheduleFieldsChanged) updated.installments = await rebuildContractSchedule(updated);
      else { const r=await dbPool.query(`SELECT id,installment_no AS "installmentNo",due_date AS "dueDate",original_amount::float8 amount,paid_amount::float8 AS "paidAmount",status FROM rent_installments WHERE contract_id=$1 ORDER BY installment_no`,[updated.id]); updated.installments=r.rows; }
      await syncContractMoney(updated);
    }
    res.json(updated);
  });

  app.delete("/api/Contracts/:id", async (req, res) => {
    const contract = contractsStore.find((c:any) => String(c.id) === String(req.params.id));
    if (!contract) return res.status(404).json({ message: "العقد غير موجود." });
    if (dbPool) {
      const balance = await dbPool.query(`SELECT COALESCE(SUM(GREATEST(original_amount-paid_amount,0)),0)::float8 AS outstanding FROM rent_installments WHERE contract_id=$1 AND status <> 'Cancelled'`, [req.params.id]);
      const outstanding = Number(balance.rows[0]?.outstanding || 0);
      if (outstanding > 0.005) return res.status(409).json({ message: `لا يمكن حذف العقد لأن عليه مبلغ مستحق قدره ${outstanding.toFixed(2)}. قم بتسوية المستحقات أولًا.` });
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO rent_events(contract_id,tenant_id,event_type,effective_date,metadata,created_by) VALUES($1,$2,'ContractDeleted',CURRENT_DATE,$3::jsonb,$4)`, [req.params.id, contract.tenantId || null, JSON.stringify({ contractSnapshot: contract, deletedAfterSettlement: true }), (req as any).user?.id || null]);
        await client.query(`UPDATE rental_payments SET contract_id=NULL, notes=CASE WHEN notes='' THEN $2 ELSE notes || E'\n' || $2 END WHERE contract_id=$1`, [req.params.id, `Contract ${contract.contractNo || contract.contractNumber || req.params.id} deleted after full settlement`]);
        await client.query(`DELETE FROM payment_allocations WHERE installment_id IN (SELECT id FROM rent_installments WHERE contract_id=$1)`, [req.params.id]);
        await client.query(`DELETE FROM contracts WHERE id=$1`, [req.params.id]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    }
    contractsStore = contractsStore.filter((c:any) => String(c.id) !== String(req.params.id));
    res.json({ message: "تم حذف العقد بعد التأكد من تسوية جميع المستحقات، مع الاحتفاظ بسجل الدفعات للأرشيف." });
  });

  // 4. House / Units API
  app.get("/api/house", async (req, res) => {
    const q = String(req.query.q || req.query.search || "");
    const meters = electricityMetersStore;
    const enriched = housesStore.map((h:any) => {
      const compoundId = String(h.compoundId || h.data?.compoundId || '1');
      const compoundName = compoundId === '2' ? 'Meadow Park Garden' : compoundId === '4' ? 'Daar Residence' : 'Azhar Residence';
      const meter = meters.find((m:any) => String(m.unitId || m.houseId || '') === String(h.id)) || meters.find((m:any) => String(m.unitNumber || m.houseNumber || '') === String(h.houseNumber || h.unitNumber || '') && String(m.building || m.buildingNumber || '') === String(h.buildingNumber || ''));
      return { ...h, compoundId, compoundName, type: h.type || h.unitType || 'Apartment', isFurnished: Boolean(h.isFurnished), notes: h.notes || h.notesText || '', annualRent: Number(h.annualRent || 0), electricityMeterNumber: meter?.meterNumber || '' };
    });
    res.json(paginated(enriched.filter(h => matchesQuery(h, q)), req));
  });

  app.get("/api/house/:id/history", (req, res) => {
    const unit = housesStore.find((h:any) => String(h.id) === String(req.params.id));
    if (!unit) return res.status(404).json({ message: "Unit not found" });
    const history = contractsStore
      .filter((c:any) => {
        const sameById = Boolean(c.houseId) && String(c.houseId) === String(unit.id);
        const contractUnit = String(c.unitNumber || c.houseNumber || '');
        const unitNumber = String(unit.houseNumber || unit.unitNumber || '');
        const sameNumber = contractUnit && contractUnit === unitNumber;
        const sameBuilding = !c.buildingNumber || !unit.buildingNumber || String(c.buildingNumber) === String(unit.buildingNumber);
        return sameById || (sameNumber && sameBuilding);
      })
      .sort((a:any,b:any) => String(b.leaseStartDate || b.contractStartDate || '').localeCompare(String(a.leaseStartDate || a.contractStartDate || '')));
    const current = history.find((c:any) => String(c.status || '').toLowerCase() === 'active' && !c.isArchived) || null;
    const currentTenant = current ? tenantsStore.find((t:any) => String(t.id) === String(current.tenantId)) : null;
    res.json({ unit, currentContract: current, currentTenant: cleanEntity(currentTenant), history });
  });

  app.get("/api/house/available", (req, res) => {
    const today = new Date().toISOString().slice(0,10);
    const currentlyActive = contractsStore.filter((c:any) => {
      const active = String(c.status || 'Active').toLowerCase() === 'active' && !c.isArchived;
      const start = String(c.leaseStartDate || c.contractStartDate || '').slice(0,10);
      const end = String(c.leaseEndDate || c.contractEndDate || '').slice(0,10);
      return active && (!start || start <= today) && (!end || end >= today);
    });
    const occupiedIds = new Set(currentlyActive.map((c:any) => String(c.houseId || '')));
    const occupiedKeys = new Set(currentlyActive.map((c:any) => `${String(c.buildingNumber||'')}::${String(c.unitNumber||c.houseNumber||'')}`));
    res.json(housesStore.filter((h:any) => !occupiedIds.has(String(h.id)) && !occupiedKeys.has(`${String(h.buildingNumber||'')}::${String(h.houseNumber||h.unitNumber||'')}`)));
  });

  app.post("/api/house", async (req, res) => {
    const body = req.body;
    if (!(body.HouseNumber || body.houseNumber)) return res.status(400).json({message:"رقم الوحدة مطلوب"});
    const newHouse:any = {
      id: `house-${Date.now()}`,
      houseNumber: body.HouseNumber || body.houseNumber || "",
      buildingNumber: body.BuildingNumber || body.buildingNumber || "",
      floorNumber: body.FloorNumber || body.floorNumber || "",
      area: body.area || "",
      type: body.type || body.Type || "",
      status: body.status || body.Status || "Vacant",
      annualRent: Number(body.annualRent || body.AnnualRent || 0),
      roomsCount: Number(body.roomsCount ?? body.rooms ?? body.RoomsCount ?? 0),
      bathroomsCount: Number(body.bathroomsCount ?? body.baths ?? body.BathroomsCount ?? 0),
      livingCount: Math.max(Number(body.livingCount||0),Number(body.living||0),Number(body.LivingCount||0),Number(body.Living||0)),
      majlisCount: Math.max(Number(body.majlisCount||0),Number(body.majlis||0),Number(body.MajlisCount||0),Number(body.Majlis||0)),
      hasGarage: body.hasGarage === "true" || body.hasGarage === true,
      hasGarden: body.hasGarden === "true" || body.hasGarden === true,
      hasInstalledKitchen: body.HasInstalledKitchen === "true" || body.hasInstalledKitchen === true,
      hasCentralAirConditioning: body.HasCentralAirConditioning === "true" || body.hasCentralAirConditioning === true,
      isFurnished: body.IsFurnished === "true" || body.isFurnished === true,
      notes: body.notes || "",
      compoundId: String(body.compoundId || '1'),
      compoundName: String(body.compoundName || (String(body.compoundId || '1') === '2' ? 'Meadow Park Garden' : String(body.compoundId || '1') === '4' ? 'Daar Residence' : 'Azhar Residence')),
      isAvailable: true
    };
    newHouse.living = newHouse.livingCount;
    newHouse.majlis = newHouse.majlisCount;
    housesStore.push(newHouse);
    if (dbPool) {
      await dbPool.query(`UPDATE houses SET compound_id=$2,compound_name=$3,unit_type=$4,is_furnished=$5,notes_text=$6,annual_rent=$7 WHERE id=$1`,
        [newHouse.id, newHouse.compoundId || '1', newHouse.compoundName || 'Azhar Residence', newHouse.type || 'Apartment', Boolean(newHouse.isFurnished), newHouse.notes || '', Number(newHouse.annualRent || 0)]);
    }
    res.status(201).json(newHouse);
  });


  app.put("/api/house/:id", async (req,res)=>{
    const i=housesStore.findIndex((x:any)=>x.id===req.params.id); if(i<0) return res.status(404).json({message:"Unit not found"});
    const b=req.body||{}; const patch:any={...b};
    if(b.unitNumber!==undefined||b.houseNumber!==undefined) patch.houseNumber=b.houseNumber??b.unitNumber;
    if(b.rooms!==undefined||b.roomsCount!==undefined) patch.roomsCount=Number(b.roomsCount??b.rooms??0);
    if(b.baths!==undefined||b.bathroomsCount!==undefined) patch.bathroomsCount=Number(b.bathroomsCount??b.baths??0);
    if(b.living!==undefined||b.livingCount!==undefined) patch.livingCount=Math.max(Number(b.livingCount||0),Number(b.living||0));
    if(b.majlis!==undefined||b.majlisCount!==undefined) patch.majlisCount=Math.max(Number(b.majlisCount||0),Number(b.majlis||0));
    if(b.compoundId!==undefined) patch.compoundId=String(b.compoundId);
    if(b.compoundName!==undefined) patch.compoundName=String(b.compoundName);
    if(b.isFurnished!==undefined) patch.isFurnished=Boolean(b.isFurnished);
    if(b.notes!==undefined) patch.notes=String(b.notes||'');
    if(b.annualRent!==undefined) patch.annualRent=Number(b.annualRent||0);
    housesStore[i]={...housesStore[i],...patch};
    housesStore[i].living=Number(housesStore[i].livingCount ?? housesStore[i].living ?? 0); housesStore[i].majlis=Number(housesStore[i].majlisCount ?? housesStore[i].majlis ?? 0);
    if (dbPool) {
      await dbPool.query(`UPDATE houses SET compound_id=$2,compound_name=$3,unit_type=$4,is_furnished=$5,notes_text=$6,annual_rent=$7 WHERE id=$1`,
        [housesStore[i].id, housesStore[i].compoundId || '1', housesStore[i].compoundName || 'Azhar Residence', housesStore[i].type || housesStore[i].unitType || 'Apartment', Boolean(housesStore[i].isFurnished), housesStore[i].notes || '', Number(housesStore[i].annualRent || 0)]);
    }
    res.json(housesStore[i]);
  });
  app.delete("/api/house/:id", async (req,res)=>{
    const id=String(req.params.id);
    if(dbPool){
      const refs=await dbPool.query(`SELECT
        (SELECT COUNT(*) FROM contracts WHERE house_id=$1) AS contracts_count,
        (SELECT COUNT(*) FROM electricity_meters WHERE unit_id=$1) AS electricity_count,
        (SELECT COUNT(*) FROM water_meters WHERE unit_id=$1) AS water_count`,[id]);
      const r=refs.rows[0];
      if(Number(r.contracts_count||0)>0 || Number(r.electricity_count||0)>0 || Number(r.water_count||0)>0) return res.status(409).json({message:'لا يمكن حذف الوحدة لأنها مرتبطة بعقود أو عدادات. قم بأرشفتها بدلاً من حذفها.'});
    }
    const n=housesStore.length; housesStore=housesStore.filter((x:any)=>String(x.id)!==id); if(n===housesStore.length) return res.status(404).json({message:"Unit not found"}); res.json({message:"Unit deleted"});
  });
  // 5. Staff API
  app.get("/api/staff", (req, res) => {
    res.json(paginated(staffStore.filter(x => matchesQuery(x, String(req.query.q || req.query.search || ""))), req));
  });

  // 6. Payments & Expenses API
  app.get("/api/Payment", (req, res) => {
    const q = String(req.query.q || req.query.search || "");
    res.json(paginated(paymentsStore.filter(p => matchesQuery(p, q)), req));
  });
  app.get("/api/payment", (req, res) => {
    const q = String(req.query.q || req.query.search || "");
    res.json(paginated(paymentsStore.filter(p => matchesQuery(p, q)), req));
  });

  app.post("/api/Payment", async (req:any, res) => {
    const amount=Math.round(Number(req.body.amount||0)*100)/100; if(!Number.isFinite(amount)||amount<=0) return res.status(400).json({message:"Payment amount must be greater than zero"});
    const requestedTenantId=String(req.body.tenantId||'');
    const contract=(req.body.contractId?contractsStore.find((c:any)=>String(c.id)===String(req.body.contractId)):null) || contractsStore.find((c:any)=>String(c.tenantId)===requestedTenantId && String(c.status||'Active').toLowerCase()==='active');
    const tenantId=String(contract?.tenantId||'');
    if(!contract) return res.status(400).json({message:"Active contract is required for rent payment"});
    const legacyId=`pay-${Date.now()}`; const receiptNo=makeReceiptNo(); const paymentDate=String(req.body.paymentDate||new Date().toISOString().slice(0,10)).slice(0,10);
    let allocations:any[]=[]; let unapplied=0;
    if(dbPool){
      const c=await dbPool.connect();
      try{
        await c.query('BEGIN');
        await rebuildContractSchedule(contract,c);
        const beforeFinance = await contractFinance(String(contract.id), c);
        const outstanding = Math.round(Number(beforeFinance?.remaining || 0) * 100) / 100;
        if (outstanding <= 0) {
          await c.query('ROLLBACK');
          return res.status(409).json({message:'العقد مسدد بالكامل ولا توجد مبالغ مستحقة للتسجيل.'});
        }
        if (amount > outstanding + 0.005) {
          await c.query('ROLLBACK');
          return res.status(409).json({message:`المبلغ المدخل (${amount.toFixed(2)}) أكبر من المتبقي على العقد (${outstanding.toFixed(2)}). أدخل مبلغًا لا يتجاوز المتبقي.`});
        }
        const pr=await c.query(`INSERT INTO rental_payments(legacy_id,receipt_no,tenant_id,contract_id,amount,payment_method,reference_no,payment_date,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,[legacyId,receiptNo,tenantId||contract.tenantId||null,String(contract.id),amount,req.body.paymentMethod||'Cash',req.body.referenceNo||null,paymentDate,req.body.notes||'',req.user?.sub||null]);
        let remaining=amount;
        const inst=await c.query(`SELECT id,installment_no,due_date,original_amount::float8,paid_amount::float8 FROM rent_installments WHERE contract_id=$1 AND status<>'Cancelled' AND paid_amount<original_amount ORDER BY due_date,installment_no FOR UPDATE`,[String(contract.id)]);
        for(const row of inst.rows){ if(remaining<=0) break; const open=Number(row.original_amount)-Number(row.paid_amount); const alloc=Math.min(open,remaining); if(alloc<=0)continue; await c.query(`INSERT INTO payment_allocations(payment_id,installment_id,amount) VALUES($1,$2,$3)`,[pr.rows[0].id,row.id,alloc]); await c.query(`UPDATE rent_installments SET paid_amount=paid_amount+$2,updated_at=NOW() WHERE id=$1`,[row.id,alloc]); allocations.push({installmentId:row.id,installmentNo:row.installment_no,dueDate:row.due_date,amount:alloc}); remaining=Math.round((remaining-alloc)*100)/100; }
        unapplied=remaining;
        await refreshInstallmentStatuses(c,String(contract.id));
        await syncContractMoney(contract,c);
        await c.query(`INSERT INTO rent_events(contract_id,tenant_id,event_type,effective_date,metadata,created_by) VALUES($1,$2,'PaymentPosted',$3,$4::jsonb,$5)`,[String(contract.id),tenantId||contract.tenantId||null,paymentDate,JSON.stringify({receiptNo,amount,unapplied}),req.user?.sub||null]);
        await c.query('COMMIT');
      }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
    }
    const newPayment={id:legacyId,tenantId:tenantId||contract.tenantId||'',tenantName:req.body.tenantName||contract.tenantName||'',unitNumber:req.body.unitNumber||contract.unitNumber||contract.houseNumber||'',contractId:String(contract.id),receiptNo,amount,paymentMethod:req.body.paymentMethod||'Cash',referenceNo:req.body.referenceNo||'',status:'Paid',paymentDate,unappliedAmount:unapplied,allocations};
    paymentsStore.push(newPayment); if(dbPool) await saveState('payments',paymentsStore);
    res.status(201).json(newPayment);
  });

  app.get('/api/Rental/installments', async (req,res)=>{
    if(!dbPool) return res.json([]); const tenantId=String(req.query.tenantId||''); const contractId=String(req.query.contractId||''); const status=String(req.query.status||'');
    await refreshInstallmentStatuses(dbPool,contractId||undefined);
    const where:string[]=["ri.status <> 'Cancelled'"]; const vals:any[]=[];
    if(tenantId){vals.push(tenantId);where.push(`ri.tenant_id=$${vals.length}`);} if(contractId){vals.push(contractId);where.push(`ri.contract_id=$${vals.length}`);} if(status){vals.push(status);where.push(`ri.status=$${vals.length}`);}
    const r=await dbPool.query(`SELECT ri.id,ri.contract_id AS "contractId",ri.tenant_id AS "tenantId",ri.installment_no AS "installmentNo",ri.due_date AS "dueDate",ri.original_amount::float8 AS amount,ri.paid_amount::float8 AS "paidAmount",(ri.original_amount-ri.paid_amount)::float8 AS outstanding,ri.status,c.data->>'contractNumber' AS "contractNo",c.data->>'tenantName' AS "tenantName",c.data->>'unitNumber' AS "unitNumber" FROM rent_installments ri JOIN contracts c ON c.id=ri.contract_id WHERE ${where.join(' AND ')} ORDER BY ri.due_date,ri.installment_no`,vals); res.json(paginated(r.rows,req));
  });

  app.get('/api/Rental/overdue', async (req,res)=>{
    if(!dbPool) return res.json([]); await refreshInstallmentStatuses(dbPool);
    const r=await dbPool.query(`SELECT ri.id,ri.contract_id AS "contractId",ri.tenant_id AS "tenantId",ri.installment_no AS "installmentNo",ri.due_date AS "dueDate",ri.original_amount::float8 amount,ri.paid_amount::float8 AS "paidAmount",(ri.original_amount-ri.paid_amount)::float8 outstanding,c.data->>'tenantName' AS "tenantName",c.data->>'unitNumber' AS "unitNumber",c.data->>'contractNumber' AS "contractNo" FROM rent_installments ri JOIN contracts c ON c.id=ri.contract_id WHERE ri.status='Overdue' ORDER BY ri.due_date`); res.json(paginated(r.rows,req));
  });

  app.get('/api/Rental/ledger/:contractId', async (req,res)=>{
    if(!dbPool) return res.status(503).json({message:'Database unavailable'}); const contract=contractsStore.find((x:any)=>String(x.id)===req.params.contractId); if(!contract)return res.status(404).json({message:'Contract not found'}); await rebuildContractSchedule(contract); const finance=await contractFinance(req.params.contractId);
    const inst=await dbPool.query(`SELECT id,installment_no AS "installmentNo",due_date AS "dueDate",original_amount::float8 amount,paid_amount::float8 AS "paidAmount",(original_amount-paid_amount)::float8 outstanding,status FROM rent_installments WHERE contract_id=$1 ORDER BY installment_no`,[req.params.contractId]);
    const pay=await dbPool.query(`SELECT rp.id,rp.legacy_id AS "legacyId",rp.receipt_no AS "receiptNo",rp.amount::float8,rp.payment_method AS "paymentMethod",rp.reference_no AS "referenceNo",rp.payment_date AS "paymentDate",rp.status,rp.notes,COALESCE(SUM(pa.amount),0)::float8 AS "allocatedAmount",(rp.amount-COALESCE(SUM(pa.amount),0))::float8 AS "unappliedAmount" FROM rental_payments rp LEFT JOIN payment_allocations pa ON pa.payment_id=rp.id WHERE rp.contract_id=$1 GROUP BY rp.id ORDER BY rp.payment_date DESC,rp.created_at DESC`,[req.params.contractId]); res.json({contractId:req.params.contractId,finance,installments:inst.rows,payments:pay.rows});
  });

  app.post('/api/Payment/:id/reverse', async (req:any,res)=>{
    if(!dbPool)return res.status(503).json({message:'Database unavailable'}); const c=await dbPool.connect(); try{await c.query('BEGIN'); const p=await c.query(`SELECT * FROM rental_payments WHERE (id::text=$1 OR legacy_id=$1) FOR UPDATE`,[req.params.id]); if(!p.rowCount){await c.query('ROLLBACK');return res.status(404).json({message:'Payment not found'});} if(p.rows[0].status==='Reversed'){await c.query('ROLLBACK');return res.status(409).json({message:'Payment already reversed'});} const alloc=await c.query(`SELECT installment_id,amount::float8 FROM payment_allocations WHERE payment_id=$1`,[p.rows[0].id]); for(const a of alloc.rows) await c.query(`UPDATE rent_installments SET paid_amount=GREATEST(0,paid_amount-$2),updated_at=NOW() WHERE id=$1`,[a.installment_id,a.amount]); await c.query(`UPDATE rental_payments SET status='Reversed',reversed_at=NOW(),reversed_by=$2,reversal_reason=$3 WHERE id=$1`,[p.rows[0].id,req.user?.sub||null,req.body.reason||'Reversed by administrator']); await refreshInstallmentStatuses(c,p.rows[0].contract_id); const contract=contractsStore.find((x:any)=>String(x.id)===String(p.rows[0].contract_id)); if(contract)await syncContractMoney(contract,c); await c.query(`INSERT INTO rent_events(contract_id,tenant_id,event_type,metadata,created_by) VALUES($1,$2,'PaymentReversed',$3::jsonb,$4)`,[p.rows[0].contract_id,p.rows[0].tenant_id,JSON.stringify({paymentId:p.rows[0].legacy_id,reason:req.body.reason||''}),req.user?.sub||null]); await c.query('COMMIT'); paymentsStore=paymentsStore.map((x:any)=>String(x.id)===String(p.rows[0].legacy_id)?{...x,status:'Reversed'}:x); await saveState('payments',paymentsStore); res.json({message:'Payment reversed',id:p.rows[0].legacy_id});}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  });

  app.get('/api/Contracts/:id/final-settlement', async (req,res)=>{ if(!dbPool)return res.status(503).json({message:'Database unavailable'}); const contract=contractsStore.find((x:any)=>String(x.id)===req.params.id); if(!contract)return res.status(404).json({message:'Contract not found'}); const effective=String(req.query.effectiveDate||new Date().toISOString().slice(0,10)).slice(0,10); res.json(await contractSettlementPreview(String(contract.id),effective)); });
  app.post('/api/Contracts/:id/terminate', async (req:any,res)=>{ const contract=contractsStore.find((x:any)=>String(x.id)===req.params.id); if(!contract)return res.status(404).json({message:'Contract not found'}); if(!dbPool)return res.status(503).json({message:'Database unavailable'}); const effective=String(req.body.effectiveDate||new Date().toISOString().slice(0,10)).slice(0,10); const reason=String(req.body.reason||''); const c=await dbPool.connect(); try{await c.query('BEGIN'); const settlement=await applyTerminationSettlement(contract,effective,c); contract.status='Archived'; contract.isArchived=true; contract.terminationDate=effective; contract.terminationReason=reason; await c.query(`UPDATE contracts SET data=$2::jsonb,search_text=$3,updated_at=NOW() WHERE id=$1`,[String(contract.id),JSON.stringify(contract),searchText(contract)]); await c.query(`INSERT INTO rent_events(contract_id,tenant_id,event_type,effective_date,metadata,created_by) VALUES($1,$2,'Terminated',$3,$4::jsonb,$5)`,[contract.id,contract.tenantId||null,effective,JSON.stringify({reason,settlement}),req.user?.sub||null]); await c.query('COMMIT'); await syncContractMoney(contract); res.json({...contract,settlement});}catch(e:any){try{await c.query('ROLLBACK');}catch{} console.error('[contracts] termination failed',e); return res.status(500).json({message:'تعذر إنهاء وتسوية العقد. لم يتم حفظ أي تغييرات، حاول مرة أخرى.'});}finally{c.release();} });

  app.post('/api/Contracts/:id/renew', async (req:any,res)=>{ const old=contractsStore.find((x:any)=>String(x.id)===req.params.id); if(!old)return res.status(404).json({message:'Contract not found'}); if(!dbPool)return res.status(503).json({message:'Database unavailable'}); const start=String(req.body.leaseStartDate||addMonthsDate(old.leaseEndDate||old.leaseStartDate,0)).slice(0,10); const months=Number(req.body.leaseDurationMonths||old.leaseDurationMonths||12); const end=req.body.leaseEndDate||addMonthsDate(start,months); const renewed={...old,...req.body,id:`contract-${Date.now()}`,contractNumber:req.body.contractNumber||`${old.contractNumber||old.contractNo}-R${new Date().getFullYear()}`,contractNo:req.body.contractNumber||`${old.contractNumber||old.contractNo}-R${new Date().getFullYear()}`,leaseStartDate:start,leaseEndDate:end,leaseDurationMonths:months,paidAmount:0,remainingAmount:0,status:'Active',isArchived:false,terminationDate:undefined,terminationReason:undefined,notes:[],installments:[]}; normalizeContractMoney(renewed); renewed.remainingAmount=contractGross(renewed); const c=await dbPool.connect(); try{await c.query('BEGIN'); await c.query(`UPDATE rent_installments SET original_amount=paid_amount,status=CASE WHEN paid_amount>0 THEN 'Paid' ELSE 'Cancelled' END,updated_at=NOW() WHERE contract_id=$1 AND due_date >= $2`,[String(old.id),start]); old.status='Archived'; old.isArchived=true; contractsStore.push(renewed); await c.query(`INSERT INTO contracts(id,tenant_id,data,search_text,updated_at) VALUES($1,$2,$3::jsonb,$4,NOW()) ON CONFLICT(id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,data=EXCLUDED.data,search_text=EXCLUDED.search_text,updated_at=NOW()`,[String(renewed.id),renewed.tenantId||null,JSON.stringify(renewed),searchText(renewed)]); await c.query(`UPDATE contracts SET data=$2::jsonb,search_text=$3,updated_at=NOW() WHERE id=$1`,[String(old.id),JSON.stringify(old),searchText(old)]); renewed.installments=await rebuildContractSchedule(renewed,c); await c.query(`INSERT INTO rent_events(contract_id,tenant_id,event_type,effective_date,metadata,created_by) VALUES($1,$2,'Renewed',$3,$4::jsonb,$5)`,[renewed.id,renewed.tenantId||null,start,JSON.stringify({previousContractId:old.id}),req.user?.sub||null]); await c.query('COMMIT'); await syncContractMoney(old); res.status(201).json(renewed);}catch(e){await c.query('ROLLBACK');contractsStore=contractsStore.filter((x:any)=>String(x.id)!==String(renewed.id));old.status='Active';old.isArchived=false;throw e;}finally{c.release();} });

  // Rent reports are computed from the normalized installment ledger.
  app.get("/api/Reports", async (req, res) => {
    if(!dbPool){ return res.json(tenantsStore.map((t:any)=>({tenantId:t.id,tenantName:t.fullName,nextDueDate:t.contractStartDate||'',unitNumber:t.houseNumber||'',rentAmount:Number(t.annualRent||0)/12,rentFrequency:t.paymentMethod||'Quarterly',contractEndDate:t.contractEndDate||'',remainingDays:t.contractEndDate?Math.ceil((new Date(t.contractEndDate).getTime()-Date.now())/86400000):0,paidAmount:Number(t.paidAmount||0),remainingAmount:Number(t.remainingAmount||0),status:Number(t.remainingAmount||0)<=0?'Paid':'Due Soon'}))); }
    await refreshInstallmentStatuses(dbPool);
    const r=await dbPool.query(`SELECT c.id AS "contractId",c.tenant_id AS "tenantId",c.data->>'tenantName' AS "tenantName",c.data->>'unitNumber' AS "unitNumber",c.data->>'paymentFrequency' AS "rentFrequency",c.data->>'leaseEndDate' AS "contractEndDate",COALESCE(SUM(ri.original_amount),0)::float8 AS "rentAmount",COALESCE(SUM(ri.paid_amount),0)::float8 AS "paidAmount",COALESCE(SUM(GREATEST(ri.original_amount-ri.paid_amount,0)),0)::float8 AS "remainingAmount",COALESCE(SUM(CASE WHEN ri.status='Overdue' THEN GREATEST(ri.original_amount-ri.paid_amount,0) ELSE 0 END),0)::float8 AS "overdueAmount",MIN(ri.due_date) FILTER(WHERE ri.status IN ('Pending','Partially Paid','Overdue')) AS "nextDueDate",CASE WHEN COALESCE(SUM(GREATEST(ri.original_amount-ri.paid_amount,0)),0)=0 THEN 'Paid' WHEN COUNT(*) FILTER(WHERE ri.status='Overdue')>0 THEN 'Overdue' ELSE 'Due Soon' END status FROM contracts c LEFT JOIN rent_installments ri ON ri.contract_id=c.id AND ri.status<>'Cancelled' GROUP BY c.id,c.tenant_id,c.data HAVING COALESCE(c.data->>'status','Active')<>'Archived' OR COALESCE(SUM(GREATEST(ri.original_amount-ri.paid_amount,0)),0)>0 ORDER BY "nextDueDate" NULLS LAST`);
    res.json(r.rows.map((x:any)=>({...x,remainingDays:x.contractEndDate?Math.ceil((new Date(x.contractEndDate).getTime()-Date.now())/86400000):0})));
  });

  // Additional production CRUD endpoints used by the frontend
  app.get("/api/Maintenance", (req, res) => {
    const normalized=maintenanceStore.map((x:any)=>({
      ...x,
      assignedStaffId:x.assignedStaffId || x.assignedToId || undefined,
      assignedStaffName:x.assignedStaffName || x.assignedToName || undefined
    }));
    res.json(paginated(normalized.filter(x=>matchesQuery(x,String(req.query.q||req.query.search||""))), req));
  });
  app.post("/api/Maintenance", (req:any, res:any) => {
    const body=req.body||{};
    const assignedId=String(body.assignedStaffId||body.assignedToId||'').trim();
    const assignedName=String(body.assignedStaffName||body.assignedToName||'').trim();
    const item:any={ id:`mnt-${Date.now()}`, createdAt:new Date().toISOString(), status: assignedId ? 'Assigned' : 'New', ...body, assignedStaffId:assignedId||undefined, assignedStaffName:assignedName||undefined, assignedToId:assignedId||undefined, assignedToName:assignedName||undefined };
    maintenanceStore.unshift(item);
    if(assignedId){ notificationsStore.unshift({id:`ntf-${Date.now()}`,type:'maintenance',title:'طلب صيانة جديد',message:`تم إسناد طلب الصيانة ${item.requestNumber||item.rvNo||item.id} إليك`,staffId:assignedId,entityId:String(item.id),isRead:false,createdAt:new Date().toISOString()}); }
    res.status(201).json(item);
  });
  app.put("/api/Maintenance/:id", (req, res) => {
    const i = maintenanceStore.findIndex((x:any)=>x.id===req.params.id);
    if(i<0) return res.status(404).json({message:"Maintenance not found"});
    const body=req.body||{};
    const next={...maintenanceStore[i],...body};
    if (body.assignedStaffId !== undefined) next.assignedToId=body.assignedStaffId || null;
    if (body.assignedStaffName !== undefined) next.assignedToName=body.assignedStaffName || '';
    if (body.assignedToId !== undefined) next.assignedStaffId=body.assignedToId || null;
    if (body.assignedToName !== undefined) next.assignedStaffName=body.assignedToName || '';
    if ((body.assignedStaffId || body.assignedToId) && ['New',''].includes(String(next.status||''))) next.status='Assigned';
    if ((body.assignedStaffId || body.assignedToId) && (body.assignedStaffId || body.assignedToId) !== (maintenanceStore[i].assignedStaffId || maintenanceStore[i].assignedToId)) {
      notificationsStore.unshift({id:`ntf-${Date.now()}`,type:'maintenance',title:'طلب صيانة جديد',message:`تم إسناد طلب الصيانة ${next.requestNumber||next.rvNo||next.id} إليك`,staffId:String(body.assignedStaffId||body.assignedToId),entityId:String(next.id),isRead:false,createdAt:new Date().toISOString()});
    }
    maintenanceStore[i]=next;
    res.json(next);
  });
  app.delete("/api/Maintenance/:id", (req,res)=>{ const n=maintenanceStore.length; maintenanceStore=maintenanceStore.filter((x:any)=>x.id!==req.params.id); if(n===maintenanceStore.length) return res.status(404).json({message:"Maintenance not found"}); res.json({message:"Maintenance deleted"}); });

  app.get("/api/Complaints", (req, res) => res.json(paginated(complaintsStore.filter(x => matchesQuery(x, String(req.query.q || req.query.search || ""))), req)));
  app.post("/api/Complaints", (req, res) => { const item = { id: `cmp-${Date.now()}`, ticketNumber: `TKT-${Date.now()}`, createdAt: new Date().toISOString(), status: "New", ...req.body }; complaintsStore.unshift(item); res.status(201).json(item); });
  app.put("/api/Complaints/:id/status", (req, res) => { const i=complaintsStore.findIndex((x:any)=>x.id===req.params.id); if(i<0) return res.status(404).json({message:"Complaint not found"}); complaintsStore[i]={...complaintsStore[i],...req.body}; res.json(complaintsStore[i]); });
  app.put("/api/Complaints/:id", (req,res)=>{ const i=complaintsStore.findIndex((x:any)=>x.id===req.params.id); if(i<0) return res.status(404).json({message:"Complaint not found"}); complaintsStore[i]={...complaintsStore[i],...req.body}; res.json(complaintsStore[i]); });
  app.delete("/api/Complaints/:id", (req,res)=>{ const n=complaintsStore.length; complaintsStore=complaintsStore.filter((x:any)=>x.id!==req.params.id); if(n===complaintsStore.length) return res.status(404).json({message:"Complaint not found"}); res.json({message:"Complaint deleted"}); });

  app.post("/api/staff", async (req:any, res) => {
    const body = req.body || {};
    const item:any = { id:`staff-${Date.now()}`, createdAt:new Date().toISOString(), ...body };
    if (!String(item.email || '').trim() && !String(item.username || item.empCode || '').trim()) return res.status(400).json({message:'البريد الإلكتروني أو اسم المستخدم مطلوب'});
    const rawPassword=String(item.password||'').trim();
    if (rawPassword.length < 8) return res.status(400).json({message:'كلمة مرور الدخول يجب ألا تقل عن 8 أحرف'});
    delete item.password; delete item.passwordHash; delete item.password_hash;
    try {
      staffStore.unshift(item);
      let credentials:any=null;
      if (rawPassword) credentials=await setEntityPassword('staff', item.id, rawPassword);
      if (credentials?.username) item.username=credentials.username;
      res.status(201).json(item);
    } catch (e:any) {
      staffStore = staffStore.filter((x:any) => String(x.id) !== String(item.id));
      res.status(400).json({message:e?.message || 'تعذر إنشاء حساب الموظف'});
    }
  });
  app.put("/api/staff/:id", async (req:any,res:any)=>{
    const i=staffStore.findIndex((x:any)=>x.id===req.params.id);
    if(i<0) return res.status(404).json({message:"Staff not found"});
    const body=req.body||{};
    const updated={...staffStore[i],...body};
    const portalPassword=String(body.password||'').trim();
    delete updated.password; delete updated.passwordHash; delete updated.password_hash;
    staffStore[i]=updated;
    if(portalPassword){
      try { const credentials=await setEntityPassword('staff',updated.id,portalPassword); if(credentials?.username) updated.username=credentials.username; }
      catch(e:any){ return res.status(400).json({message:e?.message||'تعذر تحديث بيانات دخول الموظف'}); }
    }
    res.json(updated);
  });
  app.delete("/api/staff/:id", (req,res)=>{ const n=staffStore.length; staffStore=staffStore.filter((x:any)=>x.id!==req.params.id); if(n===staffStore.length) return res.status(404).json({message:"Staff not found"}); res.json({message:"Staff deleted"}); });

  app.get("/api/Expense", (req,res)=>res.json(paginated(expensesStore.filter(x=>matchesQuery(x,String(req.query.q||req.query.search||""))), req)));
  app.post("/api/Expense", (req,res)=>{ const stamp=Date.now(); const item={id:`exp-${stamp}`, ...req.body, voucherNo:String(req.body?.voucherNo||`EXP-${new Date().getFullYear()}-${String(stamp).slice(-6)}`)}; expensesStore.unshift(item); res.status(201).json(item); });
  app.put("/api/Expense/:id", (req,res)=>{ const i=expensesStore.findIndex((x:any)=>x.id===req.params.id); if(i<0) return res.status(404).json({message:"Expense not found"}); expensesStore[i]={...expensesStore[i],...req.body}; res.json(expensesStore[i]); });
  app.delete("/api/Expense/:id", (req,res)=>{ const n=expensesStore.length; expensesStore=expensesStore.filter((x:any)=>x.id!==req.params.id); if(n===expensesStore.length) return res.status(404).json({message:"Expense not found"}); res.json({message:"Expense deleted"}); });

  app.get("/api/Company", (req,res)=>res.json(paginated(companiesStore.filter(x=>matchesQuery(x,String(req.query.q||req.query.search||""))),req)));
  app.post("/api/Company",(req,res)=>{const item={id:`company-${Date.now()}`,...req.body};companiesStore.unshift(item);res.status(201).json(item);});
  app.put("/api/Company/:id",(req,res)=>{const i=companiesStore.findIndex((x:any)=>String(x.id)===req.params.id);if(i<0)return res.status(404).json({message:"Company not found"});companiesStore[i]={...companiesStore[i],...req.body};res.json(companiesStore[i]);});
  app.delete("/api/Company/:id",(req,res)=>{companiesStore=companiesStore.filter((x:any)=>String(x.id)!==req.params.id);res.json({message:"Company deleted"});});
  app.get("/api/Announcements", (req,res)=>res.json(paginated(announcementsStore.filter(x=>matchesQuery(x,String(req.query.q||req.query.search||""))),req)));
  app.post("/api/Announcements",(req,res)=>{const item={id:`announcement-${Date.now()}`,createdAt:new Date().toISOString(),isActive:true,...req.body};announcementsStore.unshift(item);res.status(201).json(item);});
  app.put("/api/Announcements/:id",(req,res)=>{const i=announcementsStore.findIndex((x:any)=>String(x.id)===req.params.id);if(i<0)return res.status(404).json({message:"Announcement not found"});announcementsStore[i]={...announcementsStore[i],...req.body};res.json(announcementsStore[i]);});
  app.delete("/api/Announcements/:id",(req,res)=>{announcementsStore=announcementsStore.filter((x:any)=>String(x.id)!==req.params.id);res.json({message:"Announcement deleted"});});

  app.get("/api/letters", (req,res)=>res.json(paginated(lettersStore.filter(x=>matchesQuery(x,String(req.query.q||req.query.search||""))), req)));
  app.post("/api/letters", (req:any,res)=>{ const item={id:`letter-${Date.now()}`, sentById:req.user?.sub||"", sentByName:req.user?.username||"Admin", sentAt:new Date().toISOString(), ...req.body}; lettersStore.unshift(item); res.status(201).json(item); });
  app.put("/api/letters/:id", (req,res)=>{const i=lettersStore.findIndex((x:any)=>String(x.id)===req.params.id);if(i<0)return res.status(404).json({message:"Letter not found"});lettersStore[i]={...lettersStore[i],...req.body};res.json(lettersStore[i]);});
  app.delete("/api/letters/:id", (req,res)=>{ lettersStore=lettersStore.filter((x:any)=>x.id!==req.params.id); res.json({message:"Letter deleted"}); });

  app.get("/api/Facilities", (req,res)=>res.json(paginated(facilitiesStore.filter(x=>matchesQuery(x,String(req.query.q||req.query.search||""))), req)));
  app.post("/api/Facilities", (req,res)=>{ const item={id:`facility-${Date.now()}`,...req.body}; facilitiesStore.unshift(item); res.status(201).json(item); });
  app.put("/api/Facilities/:id", (req,res)=>{ const i=facilitiesStore.findIndex((x:any)=>x.id===req.params.id); if(i<0) return res.status(404).json({message:"Facility not found"}); facilitiesStore[i]={...facilitiesStore[i],...req.body}; res.json(facilitiesStore[i]); });
  app.delete("/api/Facilities/:id", (req,res)=>{ facilitiesStore=facilitiesStore.filter((x:any)=>x.id!==req.params.id); res.json({message:"Facility deleted"}); });

  app.get("/api/FacilityBookings", (req,res)=>res.json(paginated(facilityBookingsStore.filter(x=>matchesQuery(x,String(req.query.q||req.query.search||""))), req)));
  app.post("/api/FacilityBookings", (req,res)=>{ const item={id:`booking-${Date.now()}`, bookingNo:`BK-${Date.now()}`, createdAt:new Date().toISOString(), ...req.body}; facilityBookingsStore.unshift(item); res.status(201).json(item); });
  app.put("/api/FacilityBookings/:id", (req,res)=>{ const i=facilityBookingsStore.findIndex((x:any)=>x.id===req.params.id); if(i<0) return res.status(404).json({message:"Booking not found"}); facilityBookingsStore[i]={...facilityBookingsStore[i],...req.body}; res.json(facilityBookingsStore[i]); });
  app.delete("/api/FacilityBookings/:id", (req,res)=>{ facilityBookingsStore=facilityBookingsStore.filter((x:any)=>x.id!==req.params.id); res.json({message:"Booking deleted"}); });

  app.get("/api/Profile", async (req:any,res)=>{ if(!dbPool)return res.json(profileStore); const r=await dbPool.query("SELECT data FROM azhar_profiles WHERE user_id=$1",[req.user.sub]); res.json(r.rows[0]?.data || profileStore); });
  app.put("/api/Profile", async (req:any,res)=>{ profileStore={...profileStore,...req.body}; if(dbPool)await dbPool.query("INSERT INTO azhar_profiles(user_id,data,updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()",[req.user.sub,JSON.stringify(profileStore)]); res.json(profileStore); });

  // 7. Electricity Meter API
  app.get("/api/ElectricityMeter", (req, res) => {
    const q = String(req.query.q || req.query.search || "");
    res.json(paginated(electricityMetersStore.filter(m => matchesQuery(m, q)), req));
  });

  app.post("/api/ElectricityMeter", (req, res) => {
    const unitId = String(req.body.unitId || req.body.houseId || '').trim();
    const unit = housesStore.find((x:any) => String(x.id) === unitId);
    if (!unit) return res.status(400).json({ message: 'A valid unit is required for every electricity meter.' });
    const meterNumber = String(req.body.meterNumber || '').trim();
    if (!meterNumber) return res.status(400).json({ message: 'Meter number is required.' });
    if (electricityMetersStore.some((x:any)=>String(x.meterNumber)===meterNumber)) return res.status(409).json({message:'Meter number already exists.'});
    const newMeter = {
      id: `meter-${Date.now()}`, unitId: unit.id, houseId: unit.id,
      building: unit.buildingNumber || '', unitNumber: unit.unitNumber || unit.houseNumber || '', houseNumber: unit.unitNumber || unit.houseNumber || '',
      meterNumber, paymentNumber: String(req.body.paymentNumber || '').trim(), type: unit.type || req.body.type || '',
      isRented: unit.status === 'Occupied'
    };
    electricityMetersStore.push(newMeter);
    res.status(201).json(newMeter);
  });

  app.put("/api/ElectricityMeter/:id", (req,res)=>{
    const i=electricityMetersStore.findIndex((x:any)=>String(x.id)===req.params.id); if(i<0)return res.status(404).json({message:'Meter not found'});
    const unitId=String(req.body.unitId || electricityMetersStore[i].unitId || electricityMetersStore[i].houseId || '').trim();
    const unit=housesStore.find((x:any)=>String(x.id)===unitId); if(!unit)return res.status(400).json({message:'A valid unit is required for every electricity meter.'});
    const meterNumber=String(req.body.meterNumber ?? electricityMetersStore[i].meterNumber ?? '').trim(); if(!meterNumber)return res.status(400).json({message:'Meter number is required.'});
    if(electricityMetersStore.some((x:any,idx:number)=>idx!==i && String(x.meterNumber)===meterNumber))return res.status(409).json({message:'Meter number already exists.'});
    electricityMetersStore[i]={...electricityMetersStore[i],unitId:unit.id,houseId:unit.id,building:unit.buildingNumber||'',unitNumber:unit.unitNumber||unit.houseNumber||'',houseNumber:unit.unitNumber||unit.houseNumber||'',meterNumber,paymentNumber:String(req.body.paymentNumber ?? electricityMetersStore[i].paymentNumber ?? '').trim(),type:unit.type||electricityMetersStore[i].type||'',isRented:unit.status==='Occupied'};
    delete electricityMetersStore[i].transferredToTenant;
    res.json(electricityMetersStore[i]);
  });
  app.delete("/api/ElectricityMeter/:id", (req,res)=>{ const n=electricityMetersStore.length; electricityMetersStore=electricityMetersStore.filter((x:any)=>String(x.id)!==req.params.id); if(n===electricityMetersStore.length)return res.status(404).json({message:'Meter not found'}); res.json({message:'Meter deleted'}); });

  app.get('/api/WaterMeter', async (req,res)=>{ if(!dbPool)return res.json([]); const q=String(req.query.q||req.query.search||'').trim(); const vals:any[]=[]; let where='WHERE is_active=true'; if(q){vals.push(`%${q}%`);where+=` AND (meter_number ILIKE $1 OR building ILIKE $1 OR unit_number ILIKE $1)`;} const r=await dbPool.query(`SELECT id,unit_id AS "unitId",building,unit_number AS "unitNumber",meter_number AS "meterNumber",last_reading::float8 AS "lastReading",reading_date AS "readingDate",is_active AS "isActive" FROM water_meters ${where} ORDER BY updated_at DESC`,vals); const rows=r.rows.map((m:any)=>{if(m.unitId)return m;const u=housesStore.find((x:any)=>String(x.buildingNumber||'')===String(m.building||'') && String(x.unitNumber||x.houseNumber||'')===String(m.unitNumber||''));return {...m,unitId:u?.id};}); res.json(paginated(rows,req)); });
  app.post('/api/WaterMeter', async (req,res)=>{ if(!dbPool)return res.status(503).json({message:'Database unavailable'}); const unitId=String(req.body.unitId||'').trim(); const unit=housesStore.find((x:any)=>String(x.id)===unitId); if(!unit)return res.status(400).json({message:'A valid unit is required for every water meter.'}); const meterNumber=String(req.body.meterNumber||'').trim(); if(!meterNumber)return res.status(400).json({message:'Meter number is required.'}); const id=`water-${Date.now()}`; try{const r=await dbPool.query(`INSERT INTO water_meters(id,unit_id,building,unit_number,meter_number,last_reading,reading_date) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,unit_id AS "unitId",building,unit_number AS "unitNumber",meter_number AS "meterNumber",last_reading::float8 AS "lastReading",reading_date AS "readingDate"`,[id,unit.id,unit.buildingNumber||'',unit.unitNumber||unit.houseNumber||'',meterNumber,req.body.lastReading??null,req.body.readingDate||null]); res.status(201).json({...r.rows[0],unitId:unit.id});}catch(e:any){if(e?.code==='23505')return res.status(409).json({message:'Meter number already exists.'});throw e;} });
  app.put('/api/WaterMeter/:id', async (req,res)=>{ if(!dbPool)return res.status(503).json({message:'Database unavailable'}); const unitId=String(req.body.unitId||'').trim(); const unit=housesStore.find((x:any)=>String(x.id)===unitId); if(!unit)return res.status(400).json({message:'A valid unit is required for every water meter.'}); try{const r=await dbPool.query(`UPDATE water_meters SET unit_id=$2,building=$3,unit_number=$4,meter_number=COALESCE($5,meter_number),last_reading=COALESCE($6,last_reading),reading_date=COALESCE($7,reading_date),updated_at=NOW() WHERE id=$1 RETURNING id,unit_id AS "unitId",building,unit_number AS "unitNumber",meter_number AS "meterNumber",last_reading::float8 AS "lastReading",reading_date AS "readingDate"`,[req.params.id,unit.id,unit.buildingNumber||'',unit.unitNumber||unit.houseNumber||'',req.body.meterNumber??null,req.body.lastReading??null,req.body.readingDate??null]); if(!r.rowCount)return res.status(404).json({message:'Water meter not found'});res.json({...r.rows[0],unitId:unit.id});}catch(e:any){if(e?.code==='23505')return res.status(409).json({message:'Meter number already exists.'});throw e;} });
  app.delete('/api/WaterMeter/:id', async (req,res)=>{ if(!dbPool)return res.status(503).json({message:'Database unavailable'}); const r=await dbPool.query(`UPDATE water_meters SET is_active=false,updated_at=NOW() WHERE id=$1 RETURNING id`,[req.params.id]); if(!r.rowCount)return res.status(404).json({message:'Water meter not found'});res.json({message:'Water meter archived'}); });

  app.get('/api/Buildings', async (req,res)=>{ if(!dbPool){const uniq=[...new Set(housesStore.map((x:any)=>x.buildingNumber).filter(Boolean))];return res.json(uniq.map((n:any)=>({id:`building-${n}`,buildingNumber:n,name:`Building ${n}`,isActive:true})));} const r=await dbPool.query(`SELECT id,building_number AS "buildingNumber",name,notes,is_active AS "isActive" FROM buildings WHERE is_active=true ORDER BY building_number`); res.json(r.rows); });
  app.post('/api/Buildings', async (req,res)=>{ if(!dbPool)return res.status(503).json({message:'Database unavailable'}); const id=`building-${Date.now()}`; const r=await dbPool.query(`INSERT INTO buildings(id,building_number,name,notes) VALUES($1,$2,$3,$4) RETURNING id,building_number AS "buildingNumber",name,notes,is_active AS "isActive"`,[id,req.body.buildingNumber,req.body.name||'',req.body.notes||'']);res.status(201).json(r.rows[0]); });
  app.put('/api/Buildings/:id', async (req,res)=>{ if(!dbPool)return res.status(503).json({message:'Database unavailable'}); const r=await dbPool.query(`UPDATE buildings SET building_number=COALESCE($2,building_number),name=COALESCE($3,name),notes=COALESCE($4,notes),updated_at=NOW() WHERE id=$1 RETURNING id,building_number AS "buildingNumber",name,notes,is_active AS "isActive"`,[req.params.id,req.body.buildingNumber??null,req.body.name??null,req.body.notes??null]);if(!r.rowCount)return res.status(404).json({message:'Building not found'});res.json(r.rows[0]); });
  app.delete('/api/Buildings/:id', async (req,res)=>{ if(!dbPool)return res.status(503).json({message:'Database unavailable'}); await dbPool.query(`UPDATE buildings SET is_active=false,updated_at=NOW() WHERE id=$1`,[req.params.id]);res.json({message:'Building archived'}); });

  // Global search uses PostgreSQL indexes in production and preserves the same result shape.
  app.get("/api/search", async (req, res) => {
    const q=String(req.query.q||"").trim(); if(q.length<2) return res.json({query:q,results:[]});
    const result=(type:string,id:string,title:string,subtitle="")=>({type,id,title,subtitle});
    if (dbPool) {
      const specs:any[]=[["tenants","tenant","fullName","houseNumber","phoneNumber"],["contracts","contract","contractNumber","tenantName","unitNumber"],["houses","unit","houseNumber","buildingNumber",""] ,["payments","payment","tenantName","amount","paymentDate"],["electricity_meters","meter","meterNumber","unitNumber",""]];
      const out:any[]=[];
      for(const [table,type,titleKey,sub1,sub2] of specs){ const r=await dbPool.query(`SELECT id,data FROM ${table} WHERE search_text ILIKE $1 ORDER BY updated_at DESC LIMIT 8`,[`%${q}%`]); for(const row of r.rows){const d=row.data||{}; out.push(result(type,row.id,String(d[titleKey]||type),[d[sub1],d[sub2]].filter(Boolean).join(" • ")));} }
      return res.json({query:q,results:out.slice(0,25)});
    }
    const results=[...tenantsStore.filter(x=>matchesQuery(x,q)).slice(0,8).map(x=>result("tenant",x.id,x.fullName||x.fullNameArabic||"Tenant",`${x.houseNumber||""} • ${x.phoneNumber||""}`)),...contractsStore.filter(x=>matchesQuery(x,q)).slice(0,8).map(x=>result("contract",x.id,x.contractNumber||x.contractNo||"Contract",`${x.tenantName||""} • ${x.unitNumber||x.houseNumber||""}`)),...housesStore.filter(x=>matchesQuery(x,q)).slice(0,8).map(x=>result("unit",x.id,`Unit ${x.houseNumber||""}`,`Building ${x.buildingNumber||""}`)),...paymentsStore.filter(x=>matchesQuery(x,q)).slice(0,8).map(x=>result("payment",x.id,x.tenantName||"Payment",`${x.amount||0} • ${x.paymentDate||""}`)),...electricityMetersStore.filter(x=>matchesQuery(x,q)).slice(0,8).map(x=>result("meter",x.id,x.meterNumber||"Meter",x.unitNumber||""))].slice(0,25);
    res.json({query:q,results});
  });

  app.get("/api/admin/dashboard-stats", requirePermission("dashboard.read"), async (_req,res)=>{
    const now=Date.now(); const activeTenants=tenantsStore.filter((x:any)=>x.isActive!==false).length; const activeContracts=contractsStore.filter((x:any)=>String(x.status||"Active").toLowerCase()!=="archived").length;
    const openMaintenance=maintenanceStore.filter((x:any)=>!["completed","closed","resolved","done"].includes(String(x.status||"").toLowerCase())).length; const openComplaints=complaintsStore.filter((x:any)=>!["closed","resolved"].includes(String(x.status||"").toLowerCase())).length;
    const expiring30=contractsStore.filter((x:any)=>{const d=new Date(x.leaseEndDate||x.contractEndDate||0).getTime(); return d>=now && d<=now+30*86400000}).length;
    let totalCollected=paymentsStore.filter((x:any)=>String(x.status||'Paid')!=='Reversed').reduce((a:number,x:any)=>a+Number(x.amount||0),0),outstanding=0,overdue=0,upcoming30=0;
    if(dbPool){await refreshInstallmentStatuses(dbPool);const r=await dbPool.query(`SELECT COALESCE(SUM(ri.paid_amount),0)::float8 collected,COALESCE(SUM(CASE WHEN COALESCE(c.data->>'status','Active')<>'Archived' OR ri.due_date<=CURRENT_DATE THEN GREATEST(ri.original_amount-ri.paid_amount,0) ELSE 0 END),0)::float8 outstanding,COALESCE(SUM(CASE WHEN ri.status='Overdue' THEN GREATEST(ri.original_amount-ri.paid_amount,0) ELSE 0 END),0)::float8 overdue,COALESCE(SUM(CASE WHEN COALESCE(c.data->>'status','Active')<>'Archived' AND ri.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30 AND ri.status IN ('Pending','Partially Paid') THEN GREATEST(ri.original_amount-ri.paid_amount,0) ELSE 0 END),0)::float8 upcoming30 FROM rent_installments ri JOIN contracts c ON c.id=ri.contract_id WHERE ri.status<>'Cancelled'`);totalCollected=Number(r.rows[0].collected||0);outstanding=Number(r.rows[0].outstanding||0);overdue=Number(r.rows[0].overdue||0);upcoming30=Number(r.rows[0].upcoming30||0);}
    res.json({activeTenants,totalTenants:tenantsStore.length,totalUnits:housesStore.length,activeContracts,totalCollected,outstanding,overdue,upcoming30,collectionRate:(totalCollected+outstanding)>0?Math.round(totalCollected/(totalCollected+outstanding)*10000)/100:0,openMaintenance,openComplaints,expiringContracts30Days:expiring30,generatedAt:new Date().toISOString()});
  });

  app.get("/api/admin/permissions", requirePermission("admin.manage"), async (_req,res)=>{ if(!dbPool)return res.json([]); const r=await dbPool.query("SELECT id,code,description FROM permissions ORDER BY code"); res.json(r.rows); });
  app.get("/api/admin/roles", requirePermission("admin.manage"), async (_req,res)=>{ if(!dbPool)return res.json([]); const r=await dbPool.query(`SELECT r.id,r.name,r.description,COALESCE(array_agg(p.code) FILTER(WHERE p.code IS NOT NULL),'{}') permissions FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id GROUP BY r.id ORDER BY r.name`); res.json(r.rows); });
  app.put("/api/admin/roles/:id/permissions", requirePermission("admin.manage"), async (req,res)=>{ if(!dbPool)return res.status(503).json({message:"Database unavailable"}); const codes=Array.isArray(req.body?.permissions)?req.body.permissions:[]; const c=await dbPool.connect(); try{await c.query("BEGIN");await c.query("DELETE FROM role_permissions WHERE role_id=$1",[req.params.id]);await c.query("INSERT INTO role_permissions(role_id,permission_id) SELECT $1,id FROM permissions WHERE code=ANY($2::text[]) ON CONFLICT DO NOTHING",[req.params.id,codes]);await c.query("COMMIT");res.json({message:"Permissions updated"});}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();} });
  app.get("/api/admin/users", requirePermission("admin.manage"), async (_req,res)=>{ if(!dbPool)return res.json([]); const r=await dbPool.query(`SELECT u.id,u.username,u.email,u.full_name,u.is_active,u.created_at,COALESCE(array_agg(ro.name) FILTER(WHERE ro.name IS NOT NULL),'{}') roles FROM app_users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles ro ON ro.id=ur.role_id GROUP BY u.id ORDER BY u.created_at DESC`);res.json(r.rows); });
  app.post("/api/admin/users", requirePermission("admin.manage"), async (req,res)=>{ if(!dbPool)return res.status(503).json({message:"Database unavailable"}); const {username,email,password,fullName,role="Staff"}=req.body||{}; if(!username||!email||!password||!fullName)return res.status(400).json({message:"username,email,password,fullName are required"}); const c=await dbPool.connect(); try{await c.query("BEGIN");const u=await c.query("INSERT INTO app_users(username,email,password_hash,full_name) VALUES($1,$2,$3,$4) RETURNING id,username,email,full_name,is_active",[username,email,hashPassword(password),fullName]);await c.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name=$2",[u.rows[0].id,role]);await c.query("COMMIT");res.status(201).json(u.rows[0]);}catch(e:any){await c.query("ROLLBACK");res.status(409).json({message:"Could not create user",detail:e?.code||"error"});}finally{c.release();} });
  app.patch("/api/admin/users/:id", requirePermission("admin.manage"), async (req,res)=>{ if(!dbPool)return res.status(503).json({message:"Database unavailable"}); const {isActive,password,fullName}=req.body||{}; if(typeof isActive==="boolean")await dbPool.query("UPDATE app_users SET is_active=$2,updated_at=NOW() WHERE id=$1",[req.params.id,isActive]); if(fullName)await dbPool.query("UPDATE app_users SET full_name=$2,updated_at=NOW() WHERE id=$1",[req.params.id,fullName]); if(password)await dbPool.query("UPDATE app_users SET password_hash=$2,updated_at=NOW() WHERE id=$1",[req.params.id,hashPassword(password)]); res.json({message:"User updated"}); });

  async function setEntityPassword(entityType:'tenant'|'staff', entityId:string, password:string){
    if(!dbPool) throw new Error('Database unavailable');
    if(!password || password.length<8) throw new Error('Password must be at least 8 characters');
    const store:any[]=entityType==='tenant'?tenantsStore:staffStore;
    const entity=store.find((x:any)=>String(x.id)===String(entityId));
    if(!entity) return null;

    const rawEmail=String(entity.email||'').trim().toLowerCase();
    const safeId=String(entityId).replace(/[^a-zA-Z0-9_-]/g,'').slice(-32) || String(Date.now());
    const syntheticEmail=`${entityType}.${safeId}@azhar.local`;
    const email=rawEmail || syntheticEmail;
    const rawCode=entityType==='staff' ? String(entity.empCode||entity.employeeCode||'').trim() : '';
    const requestedUsername=String(entity.username||'').trim();
    let finalUsername=requestedUsername || rawCode || `${entityType}-${safeId}`;
    const fullName=entity.fullName||entity.name||entity.fullNameArabic||email;

    const c=await dbPool.connect();
    try{
      await c.query('BEGIN');
      // Prefer an already-linked account. Otherwise reuse an account with the same real email.
      let u=await c.query(`SELECT id FROM app_users WHERE entity_type=$1 AND entity_id=$2 LIMIT 1`,[entityType,String(entityId)]);
      let userId=u.rows[0]?.id;
      if(!userId && rawEmail){
        const byEmail=await c.query(`SELECT u.id,u.entity_type,u.entity_id,COALESCE(array_agg(ro.name) FILTER (WHERE ro.name IS NOT NULL),'{}') roles FROM app_users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles ro ON ro.id=ur.role_id WHERE lower(u.email)=lower($1) GROUP BY u.id LIMIT 1`,[rawEmail]);
        if(byEmail.rows[0]) {
          const roles=Array.isArray(byEmail.rows[0].roles)?byEmail.rows[0].roles:[];
          if(roles.includes('Admin') || (byEmail.rows[0].entity_type && (String(byEmail.rows[0].entity_type)!==entityType || String(byEmail.rows[0].entity_id)!==String(entityId)))) throw new Error('البريد الإلكتروني مرتبط بحساب آخر');
          userId=byEmail.rows[0].id;
        }
      }
      if(!userId){
        const collision=await c.query(`SELECT id FROM app_users WHERE lower(username)=lower($1) LIMIT 1`,[finalUsername]);
        if(collision.rows[0]) finalUsername=`${entityType}-${safeId}`;
        const emailCollision=await c.query(`SELECT id FROM app_users WHERE lower(email)=lower($1) LIMIT 1`,[email]);
        if(emailCollision.rows[0]) throw new Error('البريد الإلكتروني مرتبط بحساب آخر');
        const created=await c.query(`INSERT INTO app_users(username,email,password_hash,full_name,entity_type,entity_id,is_active) VALUES($1,$2,$3,$4,$5,$6,TRUE) RETURNING id`,[finalUsername,email,hashPassword(password),fullName,entityType,String(entityId)]);
        userId=created.rows[0].id;
      }else{
        const existingUser=await c.query(`SELECT username,email FROM app_users WHERE id=$1 LIMIT 1`,[userId]);
        const desiredUsername=requestedUsername || existingUser.rows[0]?.username || finalUsername;
        const usernameCollision=await c.query(`SELECT id FROM app_users WHERE lower(username)=lower($1) AND id<>$2 LIMIT 1`,[desiredUsername,userId]);
        if(usernameCollision.rows[0]) throw new Error('اسم المستخدم مرتبط بحساب آخر');
        const emailCollision=await c.query(`SELECT id FROM app_users WHERE lower(email)=lower($1) AND id<>$2 LIMIT 1`,[email,userId]);
        if(emailCollision.rows[0]) throw new Error('البريد الإلكتروني مرتبط بحساب آخر');
        finalUsername=desiredUsername;
        await c.query(`UPDATE app_users SET username=$2,email=$3,password_hash=$4,full_name=$5,is_active=true,entity_type=$6,entity_id=$7,updated_at=NOW() WHERE id=$1`,[userId,finalUsername,email,hashPassword(password),fullName,entityType,String(entityId)]);
      }
      const role=entityType==='tenant'?'Tenant':'Staff';
      await c.query(`DELETE FROM user_roles WHERE user_id=$1`,[userId]);
      await c.query(`INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE name=$2`,[userId,role]);
      await c.query(`DELETE FROM refresh_tokens WHERE user_id=$1`,[userId]);
      await c.query('COMMIT');
      return {userId,email,username: finalUsername,role};
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }
  app.put('/api/admin/tenants/:id/password', requirePermission('admin.manage'), async (req,res)=>{try{const r=await setEntityPassword('tenant',req.params.id,String(req.body.password||''));if(!r)return res.status(404).json({message:'Tenant not found'});res.json({message:'Tenant credentials updated',...r});}catch(e:any){res.status(400).json({message:e.message||'Failed to update password'});}});
  app.put('/api/admin/staff/:id/password', requirePermission('admin.manage'), async (req,res)=>{try{const r=await setEntityPassword('staff',req.params.id,String(req.body.password||''));if(!r)return res.status(404).json({message:'Staff not found'});res.json({message:'Staff credentials updated',...r});}catch(e:any){res.status(400).json({message:e.message||'Failed to update password'});}});

  app.get("/api/admin/audit-log", (req: any, res) => {
    if (req.user?.role !== "Admin") return res.status(403).json({ message: "Admin access required" });
    if (!dbPool) return res.json([]);
    dbPool.query("SELECT id, user_id, method, path, status_code, created_at FROM azhar_audit_log ORDER BY created_at DESC LIMIT 250")
      .then((r: any) => res.json(r.rows))
      .catch(() => res.status(500).json({ message: "Failed to load audit log" }));
  });

  // Firebase messaging service worker generated from production environment values.
  app.get('/firebase-messaging-sw.js', (_req,res) => {
    const cfg = {
      apiKey: process.env.VITE_FIREBASE_API_KEY || '', authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || '', storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '', appId: process.env.VITE_FIREBASE_APP_ID || ''
    };
    res.type('application/javascript').setHeader('Cache-Control','no-cache');
    res.send(`importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');\nimportScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');\nfirebase.initializeApp(${JSON.stringify(cfg)});\nconst messaging=firebase.messaging();\nmessaging.onBackgroundMessage(payload=>self.registration.showNotification(payload.notification?.title||'إشعار جديد',{body:payload.notification?.body||'',icon:'/azhar-logo.svg',badge:'/azhar-logo.svg',dir:'rtl',lang:'ar',data:payload.data||{}}));\nself.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.openWindow(event.notification.data?.url||'/'));});`);
  });

  // Vite development server setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
