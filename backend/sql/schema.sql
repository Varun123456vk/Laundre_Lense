-- LaunderLens PostgreSQL Schema (Supabase)
-- Stores ONLY pipeline results: alerts, alert_accounts, alert_edges, metric_runs.
-- Raw transactions remain in Parquet.

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    alert_id VARCHAR(64) PRIMARY KEY,
    typology VARCHAR(32) NOT NULL CHECK (typology IN ('fan_out', 'fan_in', 'scatter_gather', 'cycle', 'pass_through')),
    risk_score DOUBLE PRECISION NOT NULL CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
    first_ts TIMESTAMPTZ NOT NULL,
    last_ts TIMESTAMPTZ NOT NULL,
    n_accounts INTEGER NOT NULL,
    n_transactions INTEGER NOT NULL,
    total_amount DOUBLE PRECISION NOT NULL,
    baseline_flagged BOOLEAN NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'dismissed')),
    is_redteam BOOLEAN NOT NULL DEFAULT FALSE,
    narrative TEXT,
    narrative_source VARCHAR(32) DEFAULT 'template' CHECK (narrative_source IN ('llm', 'template')),
    shap JSONB DEFAULT '[]'::jsonb,
    evidence JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Accounts associated with each alert and investigator roles
CREATE TABLE IF NOT EXISTS alert_accounts (
    alert_id VARCHAR(64) NOT NULL REFERENCES alerts(alert_id) ON DELETE CASCADE,
    account_id VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('entry', 'hub', 'mule', 'exit', 'other')),
    label VARCHAR(128) NOT NULL,
    PRIMARY KEY (alert_id, account_id)
);

-- Directed transaction edges belonging to an alert's subgraph
CREATE TABLE IF NOT EXISTS alert_edges (
    id VARCHAR(64) PRIMARY KEY,
    alert_id VARCHAR(64) NOT NULL REFERENCES alerts(alert_id) ON DELETE CASCADE,
    source VARCHAR(64) NOT NULL,
    target VARCHAR(64) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    hop_index INTEGER NOT NULL
);

-- Evaluation metrics comparing baseline vs LaunderLens
CREATE TABLE IF NOT EXISTS metric_runs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(64) NOT NULL,
    method VARCHAR(32) NOT NULL CHECK (method IN ('baseline', 'launderlens')),
    alerts_count INTEGER NOT NULL,
    true_positives INTEGER NOT NULL,
    false_positives INTEGER NOT NULL,
    precision DOUBLE PRECISION NOT NULL,
    recall DOUBLE PRECISION NOT NULL,
    f1 DOUBLE PRECISION NOT NULL,
    fpr DOUBLE PRECISION NOT NULL,
    per_typology JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast API lookups and ordering
CREATE INDEX IF NOT EXISTS idx_alerts_risk_score ON alerts(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_typology ON alerts(typology);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alert_accounts_alert_id ON alert_accounts(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_edges_alert_id ON alert_edges(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_edges_hop ON alert_edges(alert_id, hop_index);
CREATE INDEX IF NOT EXISTS idx_metric_runs_created_at ON metric_runs(created_at DESC);

