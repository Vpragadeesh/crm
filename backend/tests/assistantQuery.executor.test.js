import test from "node:test";
import assert from "node:assert/strict";
import { ensureTenantScope } from "../src/modules/support-chat/assistantQuery.executor.js";

test("injects company_id on contacts alias when missing", () => {
  const sql = `
    SELECT c.name, c.email
    FROM contacts c
    WHERE c.assigned_emp_id = 4 AND c.status = 'LEAD'
  `;

  const scoped = ensureTenantScope(sql, 2);
  assert.match(scoped, /c\.company_id\s*=\s*2/i);
  assert.match(scoped, /assigned_emp_id\s*=\s*4/i);
});

test("does not duplicate filter when already present", () => {
  const sql = "SELECT * FROM contacts c WHERE c.company_id = 2 AND c.status = 'LEAD'";
  const scoped = ensureTenantScope(sql, 2);
  assert.equal(scoped, sql.trim());
});

test("adds WHERE when query has no WHERE clause", () => {
  const sql = "SELECT name FROM contacts";
  const scoped = ensureTenantScope(sql, 5);
  assert.match(scoped, /WHERE\s+contacts\.company_id\s*=\s*5/i);
});
