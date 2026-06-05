import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  const { db } = await import("../src/config/db.js");
  try {
    console.log("Checking and executing migrations...");

    // 1. Create assistant_tool_executions if it doesn't exist
    const [tables] = await db.query("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);

    if (!tableNames.includes("assistant_tool_executions")) {
      console.log("Creating assistant_tool_executions table...");
      await db.query(`
        CREATE TABLE assistant_tool_executions (
          id BIGINT NOT NULL AUTO_INCREMENT,
          company_id INT NOT NULL COMMENT 'Tenant/company ID for multi-tenancy',
          emp_id INT NOT NULL COMMENT 'Employee/user ID who triggered the action',
          session_id VARCHAR(191) NOT NULL COMMENT 'Support-chat session ID',
          tool_name VARCHAR(64) NOT NULL COMMENT 'Name of tool called: execute_query, create_task, update_contact, send_email, etc.',
          tool_input JSON COMMENT 'Full input parameters to the tool (before execution)',
          tool_result JSON COMMENT 'Full output/result from the tool',
          status ENUM('success', 'failure') NOT NULL DEFAULT 'success' COMMENT 'Execution status',
          error_message TEXT COMMENT 'Error message if status=failure',
          duration_ms INT DEFAULT 0 COMMENT 'Execution time in milliseconds',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT fk_tool_executions_company FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE,
          CONSTRAINT fk_tool_executions_employee FOREIGN KEY (emp_id) REFERENCES employees (emp_id) ON DELETE CASCADE,
          INDEX idx_session (session_id) COMMENT 'Fast lookup by conversation session',
          INDEX idx_tool (tool_name, created_at) COMMENT 'Query by tool type and time range',
          INDEX idx_company_time (company_id, created_at) COMMENT 'Company-scoped audit queries',
          INDEX idx_status (status, created_at) COMMENT 'Filter by success/failure status',
          INDEX idx_company_tool_time (company_id, tool_name, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Immutable audit log for all agent tool executions - append-only table'
      `);
      console.log("✅ Created assistant_tool_executions table successfully.");
    } else {
      console.log("✔ assistant_tool_executions table already exists.");
    }

    // 2. Add columns to assistant_chat_sessions if missing
    const [columns] = await db.query("DESCRIBE assistant_chat_sessions");
    const existingColumns = columns.map(c => c.Field);

    const columnsToAdd = [
      {
        name: "agent_mode_enabled",
        sql: "ALTER TABLE assistant_chat_sessions ADD COLUMN agent_mode_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this session supports agent mode (1=yes, 0=no)'"
      },
      {
        name: "last_agent_step_count",
        sql: "ALTER TABLE assistant_chat_sessions ADD COLUMN last_agent_step_count INT NOT NULL DEFAULT 0 COMMENT 'Number of reasoning steps from last agent request'"
      },
      {
        name: "agent_tools_used",
        sql: "ALTER TABLE assistant_chat_sessions ADD COLUMN agent_tools_used JSON COMMENT 'JSON array of tool names called in this session, e.g. [\"execute_query\", \"create_task\"]'"
      },
      {
        name: "reasoning_trace_summary",
        sql: "ALTER TABLE assistant_chat_sessions ADD COLUMN reasoning_trace_summary TEXT COMMENT 'Cached summary of last agent reasoning trace for fast retrieval'"
      }
    ];

    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Adding column ${col.name} to assistant_chat_sessions...`);
        await db.query(col.sql);
        console.log(`✅ Added column ${col.name} successfully.`);
      } else {
        console.log(`✔ Column ${col.name} already exists.`);
      }
    }

    // 3. Create indexes on assistant_chat_sessions if missing
    // To check indexes, we can run SHOW INDEX FROM assistant_chat_sessions
    const [indexes] = await db.query("SHOW INDEX FROM assistant_chat_sessions");
    const indexNames = indexes.map(i => i.Key_name);

    if (!indexNames.includes("idx_agent_mode")) {
      console.log("Creating index idx_agent_mode...");
      await db.query("CREATE INDEX idx_agent_mode ON assistant_chat_sessions(agent_mode_enabled, created_at)");
      console.log("✅ Created index idx_agent_mode successfully.");
    } else {
      console.log("✔ Index idx_agent_mode already exists.");
    }

    if (!indexNames.includes("idx_agent_last_update")) {
      console.log("Creating index idx_agent_last_update...");
      // Standard MySQL does not support partial indexes (WHERE clause), so we create a standard index.
      await db.query("CREATE INDEX idx_agent_last_update ON assistant_chat_sessions(last_message_at)");
      console.log("✅ Created index idx_agent_last_update successfully.");
    } else {
      console.log("✔ Index idx_agent_last_update already exists.");
    }

    console.log("🎉 All migrations completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

run();
