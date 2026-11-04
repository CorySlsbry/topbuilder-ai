// =============================================================================
// Role-Based Access Control (RBAC) — the permission matrix.
// =============================================================================
// Roles ordered from highest privilege to lowest:
//   owner   — founder/owner of the company account, full control
//   admin   — delegated admin, full control minus billing-destructive ops
//   manager — operational lead, scoped to assigned projects
//   member  — generic seat (used for accounting helpers, project coordinators)
//   field   — mobile-first, voice memos, photos, daily logs
//   viewer  — read-only stakeholder (PM client liaison, subcontractor PMO)
// =============================================================================

export type Role = 'owner' | 'admin' | 'manager' | 'member' | 'field' | 'viewer';

export const ROLES: readonly Role[] = ['owner', 'admin', 'manager', 'member', 'field', 'viewer'];

export type Permission =
  // Company-level financial views (cashflow, AR/AP aging, payroll totals)
  | 'FINANCIAL_VIEW'
  // Mutate tenant settings, users, integrations, billing
  | 'ADMIN_WRITE'
  // Approve / reject AI-drafted output, edit mappings, configure agents
  | 'MANAGER_WRITE'
  // Connect / disconnect integrations (Procore, QBO)
  | 'INTEGRATIONS_MANAGE'
  // View audit log
  | 'AUDIT_VIEW'
  // Manage tenant users (invite, remove, change role)
  | 'USERS_MANAGE'
  // Configure agent enable/disable + frequency
  | 'AGENTS_CONFIGURE'
  // Manually trigger an agent run
  | 'AGENTS_TRIGGER'
  // View Owner's Copilot chat
  | 'CHAT_USE'
  // Read project data
  | 'PROJECTS_READ'
  // Submit field entries (daily logs, photos, voice memos)
  | 'FIELD_SUBMIT'
  // View billing + invoices for the tenant subscription
  | 'BILLING_VIEW'
  // Mutate billing
  | 'BILLING_MANAGE';

type Matrix = Readonly<Record<Role, ReadonlySet<Permission>>>;

const own = new Set<Permission>([
  'FINANCIAL_VIEW',
  'ADMIN_WRITE',
  'MANAGER_WRITE',
  'INTEGRATIONS_MANAGE',
  'AUDIT_VIEW',
  'USERS_MANAGE',
  'AGENTS_CONFIGURE',
  'AGENTS_TRIGGER',
  'CHAT_USE',
  'PROJECTS_READ',
  'FIELD_SUBMIT',
  'BILLING_VIEW',
  'BILLING_MANAGE',
]);

const admin = new Set<Permission>([
  'FINANCIAL_VIEW',
  'ADMIN_WRITE',
  'MANAGER_WRITE',
  'INTEGRATIONS_MANAGE',
  'AUDIT_VIEW',
  'USERS_MANAGE',
  'AGENTS_CONFIGURE',
  'AGENTS_TRIGGER',
  'CHAT_USE',
  'PROJECTS_READ',
  'FIELD_SUBMIT',
  'BILLING_VIEW',
]);

const manager = new Set<Permission>([
  'MANAGER_WRITE',
  'AGENTS_TRIGGER',
  'CHAT_USE',
  'PROJECTS_READ',
  'FIELD_SUBMIT',
]);

const member = new Set<Permission>([
  'PROJECTS_READ',
  'FIELD_SUBMIT',
]);

const field = new Set<Permission>([
  'PROJECTS_READ',
  'FIELD_SUBMIT',
]);

const viewer = new Set<Permission>([
  'PROJECTS_READ',
]);

export const PERMISSIONS: Matrix = {
  owner: own,
  admin,
  manager,
  member,
  field,
  viewer,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].has(permission);
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role '${role}' lacks permission '${permission}'`);
  }
}

export function isHigherPrivilege(a: Role, b: Role): boolean {
  return ROLES.indexOf(a) < ROLES.indexOf(b);
}

export const DASHBOARD_ROUTE_BY_ROLE: Readonly<Record<Role, string>> = {
  owner: '/dashboard/owner',
  admin: '/dashboard/owner',
  manager: '/dashboard/manager',
  member: '/dashboard/manager',
  field: '/dashboard/field',
  viewer: '/dashboard/owner',
};
