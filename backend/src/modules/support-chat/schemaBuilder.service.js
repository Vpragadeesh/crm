import { db } from "../../config/db.js";

// CRM table descriptions for schema context
const CRM_TABLE_DESCRIPTIONS = {
  companies: "Company accounts and organization metadata",
  employees: "Internal users with roles and department details",
  contacts: "Core CRM contacts/leads and pipeline stages",
  opportunities: "Potential deals before closure",
  deals: "Closed-won or closed-lost outcomes and revenue",
  sessions: "Sales/marketing interaction sessions with ratings",
  tasks: "Action items and follow-ups assigned to employees",
  feedback: "Customer satisfaction and feedback data",
  emails: "Outbound and tracked email records",
  email_templates: "Reusable templates for email campaigns",
  automations: "Automation definitions and trigger configurations",
  sequences: "Email sequence definitions and performance counters",
  sequence_steps: "Step-by-step templates and schedule delays",
  sequence_enrollments: "Contacts enrolled in active sequences",
  sequence_executions: "Execution logs for each sent/failed step",
  notifications: "In-app notifications for users",
  discuss_channels: "Team chat channels",
  discuss_messages: "Team chat message history",
  discuss_mentions: "Mentions in chat messages",
  outreach_pages: "Public campaign/landing pages",
  outreach_page_components: "Page builder components and layouts",
  outreach_form_responses: "Captured responses from public forms",
  ab_tests: "A/B test experiments and variants",
  ab_test_metrics: "A/B test performance statistics",
  call_logs: "Telephony/call records",
  discuss_call_logs: "Video/voice call logs",
  discuss_call_participants: "Call participants metadata",
  contact_availability: "Contact availability and timezone info",
  contact_status_history: "Historical status changes for contacts",
};

const PRIORITY_SCHEMA_TABLES = Object.keys(CRM_TABLE_DESCRIPTIONS);
const MAX_TABLES_IN_SCHEMA_CONTEXT = 40;
const MAX_FIELDS_PER_TABLE = 120;
const SCHEMA_CACHE_TTL_MS = 3600000; // 1 hour

// Tables to exclude from schema context (sensitive/internal)
const EXCLUDED_TABLE_PATTERNS = [
  /^password_reset_tokens/i,
  /^oauth_/i,
  /^refresh_tokens/i,
  /^api_keys/i,
  /^secrets/i,
  /^audit_/i,
  /^_/i, // Tables starting with underscore
];

/**
 * Check if a table should be excluded from schema context
 */
const shouldExcludeTable = (tableName) => {
  return EXCLUDED_TABLE_PATTERNS.some((pattern) => pattern.test(tableName));
};

/**
 * Map MySQL type to support-chat schema type
 */
const mapDbTypeToSchemaType = (dbType = "") => {
  const normalized = String(dbType).toLowerCase();

  if (normalized.includes("int") || normalized.includes("bigint")) return "INT";
  if (
    normalized.includes("decimal") ||
    normalized.includes("numeric") ||
    normalized.includes("float") ||
    normalized.includes("double")
  )
    return "DECIMAL";
  if (normalized.includes("bool") || normalized === "tinyint(1)") return "BOOLEAN";
  if (
    normalized.includes("date") ||
    normalized.includes("time") ||
    normalized.includes("year") ||
    normalized.includes("timestamp")
  )
    return "DATE";
  if (normalized.includes("json")) return "JSON";
  if (
    normalized.includes("text") ||
    normalized.includes("char") ||
    normalized.includes("enum") ||
    normalized.includes("set")
  )
    return "VARCHAR(255)";

  return "TEXT";
};

/**
 * SchemaBuilder Service - Auto-discovers CRM schema from database
 * Implements caching and limit enforcement for support-chat compatibility
 */
export class SchemaBuilderService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Build schema context from database with caching
   * Returns array of SchemaTable objects compatible with support-chat API
   */
  async buildSchemaContext(companyId, maxTables = MAX_TABLES_IN_SCHEMA_CONTEXT) {
    // Check cache first
    const cacheKey = `schema:${companyId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.context;
    }

    // Build fresh schema context
    const schemaContext = await this._discoverSchemaContext(maxTables);

    // Cache result
    this.cache.set(cacheKey, {
      context: schemaContext,
      expiresAt: Date.now() + SCHEMA_CACHE_TTL_MS,
    });

    return schemaContext;
  }

  /**
   * Clear cache for a specific company
   */
  clearCache(companyId) {
    this.cache.delete(`schema:${companyId}`);
  }

  /**
   * Clear all caches
   */
  clearAllCache() {
    this.cache.clear();
  }

  /**
   * Discover schema from INFORMATION_SCHEMA
   * @private
   */
  async _discoverSchemaContext(maxTables) {
    try {
      // Get all tables in database
      const [tables] = await db.query(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC
        `,
        []
      );

      // Get all columns metadata
      const [columns] = await db.query(
        `
        SELECT
          table_name,
          column_name,
          column_type,
          column_key,
          is_nullable,
          column_comment,
          ordinal_position
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        ORDER BY table_name ASC, ordinal_position ASC
        `,
        []
      );

      // Group columns by table
      const columnsByTable = columns.reduce((acc, col) => {
        if (!acc[col.table_name]) acc[col.table_name] = [];
        acc[col.table_name].push(col);
        return acc;
      }, {});

      // Build schema context respecting limits
      const schemaContext = [];

      // First, add priority tables (CRM core tables)
      for (const tableName of PRIORITY_SCHEMA_TABLES) {
        if (schemaContext.length >= maxTables) break;
        if (!columnsByTable[tableName]) continue;
        if (shouldExcludeTable(tableName)) continue;

        const table = this._buildTableSchema(tableName, columnsByTable[tableName]);
        if (table.fields.length > 0) {
          schemaContext.push(table);
        }
      }

      // Then add any remaining tables (non-priority)
      for (const { table_name: tableName } of tables) {
        if (schemaContext.length >= maxTables) break;
        if (PRIORITY_SCHEMA_TABLES.includes(tableName)) continue; // Already added
        if (!columnsByTable[tableName]) continue;
        if (shouldExcludeTable(tableName)) continue;

        const table = this._buildTableSchema(tableName, columnsByTable[tableName]);
        if (table.fields.length > 0) {
          schemaContext.push(table);
        }
      }

      return schemaContext;
    } catch (error) {
      // Log error but return safe fallback schema
      console.error("Error discovering schema:", error.message);
      return this._getFallbackSchema();
    }
  }

  /**
   * Build single table schema
   * @private
   */
  _buildTableSchema(tableName, columns) {
    const fields = [];

    for (const col of columns) {
      if (fields.length >= MAX_FIELDS_PER_TABLE) break;

      const fieldName = String(col.column_name || "").trim();
      const fieldType = mapDbTypeToSchemaType(col.column_type);

      if (!fieldName || !fieldType) continue;

      fields.push({
        name: fieldName,
        type: fieldType,
        description: col.column_comment || `${fieldName} column in ${tableName}`,
        is_primary_key: col.column_key === "PRI",
      });
    }

    return {
      name: tableName,
      description:
        CRM_TABLE_DESCRIPTIONS[tableName] ||
        `${tableName} table - contact support for documentation`,
      fields,
    };
  }

  /**
   * Fallback minimal schema when auto-discovery fails
   * Ensures agent can still reason with basic table structure
   * @private
   */
  _getFallbackSchema() {
    return [
      {
        name: "contacts",
        description: "Core CRM contacts/leads and pipeline stages",
        fields: [
          { name: "id", type: "INT", description: "Contact ID", is_primary_key: true },
          { name: "company_id", type: "INT", description: "Tenant/company ID" },
          { name: "name", type: "VARCHAR(255)", description: "Contact full name" },
          { name: "email", type: "VARCHAR(255)", description: "Contact email address" },
          { name: "phone", type: "VARCHAR(255)", description: "Contact phone number" },
          { name: "status", type: "VARCHAR(50)", description: "Pipeline status" },
          { name: "score", type: "INT", description: "Lead scoring" },
          { name: "created_at", type: "DATE", description: "Record creation timestamp" },
        ],
      },
      {
        name: "deals",
        description: "Sales pipeline deals",
        fields: [
          { name: "id", type: "INT", description: "Deal ID", is_primary_key: true },
          { name: "company_id", type: "INT", description: "Tenant/company ID" },
          { name: "opportunity_id", type: "INT", description: "Related opportunity" },
          { name: "deal_value", type: "DECIMAL", description: "Deal amount in currency" },
          { name: "stage", type: "VARCHAR(50)", description: "Deal stage in pipeline" },
          { name: "closed_at", type: "DATE", description: "Deal closure date" },
        ],
      },
      {
        name: "tasks",
        description: "Action items and follow-ups",
        fields: [
          { name: "id", type: "INT", description: "Task ID", is_primary_key: true },
          { name: "company_id", type: "INT", description: "Tenant/company ID" },
          { name: "emp_id", type: "INT", description: "Assigned employee" },
          { name: "title", type: "VARCHAR(255)", description: "Task title" },
          { name: "status", type: "VARCHAR(50)", description: "Task status" },
          { name: "due_date", type: "DATE", description: "Due date for completion" },
        ],
      },
    ];
  }

  /**
   * Get list of available tables (for debugging)
   */
  async getAvailableTables() {
    try {
      const [tables] = await db.query(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC
        `,
        []
      );

      return tables.map((t) => t.table_name).filter((t) => !shouldExcludeTable(t));
    } catch (error) {
      console.error("Error fetching table list:", error.message);
      return Object.keys(CRM_TABLE_DESCRIPTIONS);
    }
  }
}

// Export singleton instance
export default new SchemaBuilderService();
