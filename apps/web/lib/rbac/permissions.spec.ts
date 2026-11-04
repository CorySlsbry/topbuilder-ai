import { describe, expect, test } from 'vitest';
import { hasPermission, PERMISSIONS, ROLES, isHigherPrivilege } from './permissions';

describe('hasPermission', () => {
  test('owner has every permission', () => {
    const allPermissions = new Set<string>();
    for (const role of ROLES) {
      for (const p of PERMISSIONS[role]) allPermissions.add(p);
    }
    for (const p of allPermissions) {
      expect(hasPermission('owner', p as never)).toBe(true);
    }
  });

  test('admin can see financials but not manage billing', () => {
    expect(hasPermission('admin', 'FINANCIAL_VIEW')).toBe(true);
    expect(hasPermission('admin', 'BILLING_VIEW')).toBe(true);
    expect(hasPermission('admin', 'BILLING_MANAGE')).toBe(false);
  });

  test('manager cannot see company-wide financials', () => {
    expect(hasPermission('manager', 'FINANCIAL_VIEW')).toBe(false);
    expect(hasPermission('manager', 'MANAGER_WRITE')).toBe(true);
  });

  test('manager can trigger agents but not configure them', () => {
    expect(hasPermission('manager', 'AGENTS_TRIGGER')).toBe(true);
    expect(hasPermission('manager', 'AGENTS_CONFIGURE')).toBe(false);
  });

  test('field can submit but not approve drafts', () => {
    expect(hasPermission('field', 'FIELD_SUBMIT')).toBe(true);
    expect(hasPermission('field', 'MANAGER_WRITE')).toBe(false);
  });

  test('viewer is read-only', () => {
    expect(hasPermission('viewer', 'PROJECTS_READ')).toBe(true);
    expect(hasPermission('viewer', 'FIELD_SUBMIT')).toBe(false);
    expect(hasPermission('viewer', 'MANAGER_WRITE')).toBe(false);
    expect(hasPermission('viewer', 'FINANCIAL_VIEW')).toBe(false);
  });
});

describe('isHigherPrivilege', () => {
  test('owner outranks every other role', () => {
    expect(isHigherPrivilege('owner', 'admin')).toBe(true);
    expect(isHigherPrivilege('owner', 'manager')).toBe(true);
    expect(isHigherPrivilege('owner', 'viewer')).toBe(true);
  });

  test('admin outranks manager', () => {
    expect(isHigherPrivilege('admin', 'manager')).toBe(true);
  });

  test('manager does not outrank admin', () => {
    expect(isHigherPrivilege('manager', 'admin')).toBe(false);
  });
});
