import { db } from "../../config/db.js";

const MAX_RESULT_ROWS = 200;

const WRITE_KEYWORDS = new Set([
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "REPLACE",
  "GRANT",
  "REVOKE",
]);

const SQL_CLAUSE_KEYWORDS = new Set([
  "ON",
  "WHERE",
  "GROUP",
  "ORDER",
  "LIMIT",
  "HAVING",
  "INNER",
  "LEFT",
  "RIGHT",
  "OUTER",
  "CROSS",
  "JOIN",
  "AND",
  "OR",
  "UNION",
  "SET",
]);

/** Tables that include a company_id column (safe to filter directly). */
const COMPANY_ID_TABLES = new Set([
  "contacts",
  "employees",
  "tasks",
  "notifications",
  "automations",
  "automation_logs",
  "sequences",
  "sequence_enrollments",
  "sequence_executions",
  "outreach_documents",
  "outreach_pages",
  "outreach_page_components",
  "outreach_form_responses",
  "discuss_channels",
  "discuss_call_logs",
  "call_logs",
  "ab_tests",
  "email_templates",
]);

/** Tables scoped via joins when company_id is not on the table itself. */
const TENANT_SCOPED_TABLES = [
  "contacts",
  "employees",
  "opportunities",
  "deals",
  "sessions",
  "tasks",
  "feedback",
  "emails",
  "email_templates",
  "automations",
  "sequences",
  "notifications",
  "outreach_pages",
  "ab_tests",
  "call_logs",
];

export const isReadOnlyQuery = (query) => {
  const upper = String(query || "").toUpperCase().trim();
  const firstWord = upper.split(/\s+/)[0] || "";
  if (WRITE_KEYWORDS.has(firstWord)) return false;
  if (/;/.test(upper.slice(0, -1))) return false;
  for (const kw of WRITE_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`).test(upper)) return false;
  }
  return true;
};

export const mentionsTenantTable = (query) => {
  const upper = String(query || "").toUpperCase();
  return TENANT_SCOPED_TABLES.some((table) => new RegExp(`\\b${table.toUpperCase()}\\b`).test(upper));
};

export const hasCompanyScope = (query, companyId) => {
  const id = String(companyId);
  const patterns = [
    new RegExp(`\\bcompany_id\\b\\s*=\\s*['"]?${id}['"]?`, "i"),
    new RegExp(`\\bcompany_id\\b\\s+IN\\s*\\(\\s*['"]?${id}['"]?\\s*\\)`, "i"),
  ];
  return patterns.some((pattern) => pattern.test(String(query || "")));
};

const resolveAlias = (table, maybeAlias) => {
  if (!maybeAlias) return table;
  if (SQL_CLAUSE_KEYWORDS.has(maybeAlias.toUpperCase())) return table;
  return maybeAlias;
};

const parseTableReferences = (query) => {
  const references = [];
  const regex = /\b(?:FROM|JOIN)\s+`?(\w+)`?(?:\s+(?:AS\s+)?`?(\w+)`?)?/gi;
  let match = regex.exec(query);
  while (match) {
    const table = String(match[1] || "").toLowerCase();
    const alias = resolveAlias(table, match[2]);
    if (table) references.push({ table, alias });
    match = regex.exec(query);
  }
  return references;
};

const aliasHasCompanyFilter = (query, alias, companyId) => {
  const id = String(companyId);
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\.company_id\\b\\s*=\\s*['"]?${id}['"]?`, "i").test(query);
};

const appendTenantFilters = (query, filters) => {
  if (!filters.length) return query;

  const clause = filters.join(" AND ");
  const trimmed = query.trim().replace(/;\s*$/, "");
  const tailMatch = trimmed.match(/\b(GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT)\b/i);

  if (/\bWHERE\b/i.test(trimmed)) {
    if (tailMatch) {
      const idx = tailMatch.index;
      return `${trimmed.slice(0, idx)} AND (${clause}) ${trimmed.slice(idx)}`;
    }
    return `${trimmed} AND (${clause})`;
  }

  if (tailMatch) {
    const idx = tailMatch.index;
    return `${trimmed.slice(0, idx)} WHERE ${clause} ${trimmed.slice(idx)}`;
  }

  return `${trimmed} WHERE ${clause}`;
};

/**
 * Ensure tenant isolation by injecting company_id filters when the LLM omitted them.
 */
export const ensureTenantScope = (query, companyId) => {
  const normalized = String(query || "").trim();
  if (!normalized || hasCompanyScope(normalized, companyId)) {
    return normalized;
  }

  if (!mentionsTenantTable(normalized)) {
    return normalized;
  }

  const references = parseTableReferences(normalized);
  const filters = [];

  for (const { table, alias } of references) {
    if (!COMPANY_ID_TABLES.has(table)) continue;
    if (aliasHasCompanyFilter(normalized, alias, companyId)) continue;
    filters.push(`${alias}.company_id = ${companyId}`);
  }

  if (filters.length > 0) {
    return appendTenantFilters(normalized, filters);
  }

  const contactsRef = references.find((ref) => ref.table === "contacts");
  if (contactsRef && !aliasHasCompanyFilter(normalized, contactsRef.alias, companyId)) {
    return appendTenantFilters(normalized, [`${contactsRef.alias}.company_id = ${companyId}`]);
  }

  return normalized;
};

const ensureLimit = (query) => {
  const trimmed = String(query || "").trim().replace(/;\s*$/, "");
  if (/\bLIMIT\s+\d+/i.test(trimmed)) return trimmed;
  return `${trimmed} LIMIT ${MAX_RESULT_ROWS}`;
};

const serializeRow = (value) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  if (typeof value === "object" && value.toString) {
    const asString = value.toString();
    if (asString !== "[object Object]") return asString;
  }
  return value;
};

export const executeReadOnlyQuery = async (query, { companyId }) => {
  const normalized = String(query || "").trim();
  if (!normalized) {
    const error = new Error("No SQL query was generated.");
    error.statusCode = 400;
    throw error;
  }

  if (!isReadOnlyQuery(normalized)) {
    const error = new Error("Only read-only SELECT-style queries are allowed.");
    error.statusCode = 403;
    throw error;
  }

  const scopedQuery = ensureTenantScope(normalized, companyId);

  if (mentionsTenantTable(scopedQuery) && !hasCompanyScope(scopedQuery, companyId)) {
    const error = new Error(
      `Could not apply tenant filter automatically. Include company_id = ${companyId} (e.g. on contacts).`
    );
    error.statusCode = 403;
    throw error;
  }

  const boundedQuery = ensureLimit(scopedQuery);
  const [rows] = await db.query(boundedQuery);

  const serializedRows = (rows || []).map((row) => {
    const next = {};
    for (const [key, value] of Object.entries(row)) {
      next[key] = serializeRow(value);
    }
    return next;
  });

  return {
    rows: serializedRows,
    executedQuery: boundedQuery,
    wasScoped: boundedQuery !== normalized.replace(/;\s*$/, "").trim(),
  };
};

/**
 * Defense-in-depth guard for queries that were executed by the support-chat
 * microservice (VISUALIZE / AGENT modes). The microservice already enforces
 * tenant isolation from the forwarded JWT, but the CRM independently validates
 * any query it reports back before trusting the returned rows.
 *
 * Returns { ok, reason }. A failing guard means the CRM should NOT surface the
 * rows to the user (potential cross-tenant leak or a non-read-only statement).
 */
export const validateExecutedQuery = (query, companyId) => {
  const normalized = String(query || "").trim();
  if (!normalized) return { ok: true, reason: null };

  if (!isReadOnlyQuery(normalized)) {
    return { ok: false, reason: "Executed query was not read-only (write/DDL detected)." };
  }

  if (mentionsTenantTable(normalized) && !hasCompanyScope(normalized, companyId)) {
    return {
      ok: false,
      reason: `Executed query is missing tenant scope (expected company_id = ${companyId}).`,
    };
  }

  return { ok: true, reason: null };
};
