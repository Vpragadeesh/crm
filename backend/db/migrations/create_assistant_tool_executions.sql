-- Migration: Create assistant_tool_executions audit table
-- Purpose: Immutable audit trail for all agent tool executions
-- Version: 1.0
-- Notes: Append-only table, no delete/update operations allowed

CREATE TABLE IF NOT EXISTS assistant_tool_executions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id INT NOT NULL,
  emp_id INT NOT NULL,
  session_id VARCHAR(191) NOT NULL,
  tool_name VARCHAR(64) NOT NULL,
  tool_input JSON,
  tool_result JSON,
  status ENUM('success', 'failure') NOT NULL DEFAULT 'success',
  error_message TEXT,
  duration_ms INT DEFAULT 0 COMMENT 'Execution time in milliseconds',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  
  -- Foreign keys for referential integrity
  CONSTRAINT fk_tool_executions_company FOREIGN KEY (company_id) REFERENCES companies (company_id) ON DELETE CASCADE,
  CONSTRAINT fk_tool_executions_employee FOREIGN KEY (emp_id) REFERENCES employees (emp_id) ON DELETE CASCADE,
  
  -- Indexes for common queries
  INDEX idx_session (session_id) COMMENT 'Fast lookup by conversation session',
  INDEX idx_tool (tool_name, created_at) COMMENT 'Query by tool type and time range',
  INDEX idx_company_time (company_id, created_at) COMMENT 'Company-scoped audit queries',
  INDEX idx_status (status, created_at) COMMENT 'Filter by success/failure status',
  
  -- Composite index for comprehensive audit queries
  INDEX idx_company_tool_time (company_id, tool_name, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Immutable audit log for all agent tool executions - append-only table';

-- Add column comments for clarity
ALTER TABLE assistant_tool_executions
  MODIFY COLUMN company_id INT NOT NULL COMMENT 'Tenant/company ID for multi-tenancy',
  MODIFY COLUMN emp_id INT NOT NULL COMMENT 'Employee/user ID who triggered the action',
  MODIFY COLUMN session_id VARCHAR(191) NOT NULL COMMENT 'Support-chat session ID',
  MODIFY COLUMN tool_name VARCHAR(64) NOT NULL COMMENT 'Name of tool called: execute_query, create_task, update_contact, send_email, etc.',
  MODIFY COLUMN tool_input JSON COMMENT 'Full input parameters to the tool (before execution)',
  MODIFY COLUMN tool_result JSON COMMENT 'Full output/result from the tool',
  MODIFY COLUMN status ENUM('success', 'failure') NOT NULL DEFAULT 'success' COMMENT 'Execution status',
  MODIFY COLUMN error_message TEXT COMMENT 'Error message if status=failure';
