-- AI Interaction Telemetry Table
-- Tracks AI response quality, normalization, and user interactions

CREATE TABLE IF NOT EXISTS ivy_ai_telemetry (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT,
  route TEXT NOT NULL,
  raw_text TEXT,
  normalized_text TEXT,
  parser_ok BOOLEAN,
  intent TEXT,
  time_preset TEXT,
  module_flags TEXT[],
  narrator_used BOOLEAN,
  result_count INT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ivy_ai_telemetry_route ON ivy_ai_telemetry(route);
CREATE INDEX IF NOT EXISTS idx_ivy_ai_telemetry_created_at ON ivy_ai_telemetry(created_at);
CREATE INDEX IF NOT EXISTS idx_ivy_ai_telemetry_parser_ok ON ivy_ai_telemetry(parser_ok);
CREATE INDEX IF NOT EXISTS idx_ivy_ai_telemetry_req ON ivy_ai_telemetry(request_id);
