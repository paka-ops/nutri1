
CREATE TABLE IF NOT EXISTS user_goals(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id), goal_code TEXT, title TEXT,
 target_value NUMERIC, unit TEXT, start_date DATE, target_date DATE,
 status TEXT DEFAULT 'active', metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS notifications(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id), type TEXT, title TEXT, message TEXT,
 severity TEXT DEFAULT 'info', read_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(),
 metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS data_sync_events(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id), source_type TEXT, source_name TEXT,
 external_id TEXT, payload JSONB, measured_at TIMESTAMPTZ,
 status TEXT DEFAULT 'received', created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_interactions(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id), interaction_type TEXT,
 input_summary TEXT, output_summary TEXT, model_version TEXT,
 confidence NUMERIC, evidence_refs JSONB, human_review_status TEXT,
 created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions_v15(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id),
 plan_code TEXT, status TEXT DEFAULT 'trial',
 start_date DATE, end_date DATE, country_code TEXT, currency TEXT,
 amount NUMERIC, payment_transaction_id UUID REFERENCES payment_transactions(id)
);

CREATE TABLE IF NOT EXISTS government_programs(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 country_id UUID REFERENCES countries(id), organization_id UUID REFERENCES organizations(id),
 name TEXT, domain TEXT, start_date DATE, end_date DATE, status TEXT,
 metadata JSONB DEFAULT '{}'
);
