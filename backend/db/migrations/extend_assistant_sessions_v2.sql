-- Migration: Add agent mode support columns to assistant_chat_sessions
-- Purpose: Track agent mode enablement, step counts, tools used, and reasoning summaries
-- Version: 2.0

ALTER TABLE assistant_chat_sessions
ADD COLUMN IF NOT EXISTS agent_mode_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether this session supports agent mode (1=yes, 0=no)',
ADD COLUMN IF NOT EXISTS last_agent_step_count INT NOT NULL DEFAULT 0 COMMENT 'Number of reasoning steps from last agent request',
ADD COLUMN IF NOT EXISTS agent_tools_used JSON COMMENT 'JSON array of tool names called in this session, e.g. ["execute_query", "create_task"]',
ADD COLUMN IF NOT EXISTS reasoning_trace_summary TEXT COMMENT 'Cached summary of last agent reasoning trace for fast retrieval';

-- Create index for fast filtering of agent mode sessions by creation time
CREATE INDEX IF NOT EXISTS idx_agent_mode ON assistant_chat_sessions(agent_mode_enabled, created_at);

-- Create index for querying agent sessions by last update time (for analytics)
CREATE INDEX IF NOT EXISTS idx_agent_last_update ON assistant_chat_sessions(last_message_at) WHERE agent_mode_enabled = 1;
