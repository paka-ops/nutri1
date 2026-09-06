
-- NUTRI.N°1 V14 — individual dashboard, multilingual, payments, appointments

CREATE TABLE IF NOT EXISTS user_profiles(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id) UNIQUE,
 country_id UUID REFERENCES countries(id),
 preferred_language TEXT,
 timezone TEXT,
 goals JSONB DEFAULT '{}',
 updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS anthropometry_measurements(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id),
 measured_at TIMESTAMPTZ NOT NULL,
 sex TEXT,
 age_years NUMERIC,
 weight_kg NUMERIC,
 height_cm NUMERIC,
 waist_cm NUMERIC,
 hip_cm NUMERIC,
 bmi NUMERIC,
 waist_hip_ratio NUMERIC,
 waist_height_ratio NUMERIC,
 body_fat_pct NUMERIC,
 source TEXT DEFAULT 'manual',
 notes TEXT
);

CREATE TABLE IF NOT EXISTS metabolic_measurements_v14(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id),
 measured_at TIMESTAMPTZ NOT NULL,
 metric TEXT NOT NULL,
 value NUMERIC,
 secondary_value NUMERIC,
 unit TEXT,
 fasting BOOLEAN,
 source TEXT DEFAULT 'manual',
 device_id TEXT,
 notes TEXT
);

CREATE TABLE IF NOT EXISTS clinical_records(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id),
 recorded_at TIMESTAMPTZ NOT NULL,
 condition_code TEXT,
 condition_name TEXT,
 status TEXT,
 diagnosis_date DATE,
 medication_context JSONB,
 allergies JSONB,
 family_history JSONB,
 notes TEXT
);

CREATE TABLE IF NOT EXISTS dashboard_metric_snapshots(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id),
 metric_code TEXT NOT NULL,
 measured_at TIMESTAMPTZ NOT NULL,
 value NUMERIC,
 unit TEXT,
 source TEXT,
 quality_status TEXT
);

CREATE TABLE IF NOT EXISTS language_packs(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 country_id UUID REFERENCES countries(id),
 language_code TEXT NOT NULL,
 language_name TEXT NOT NULL,
 language_type TEXT,
 coverage_pct NUMERIC DEFAULT 0,
 reviewed BOOLEAN DEFAULT FALSE,
 active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS payment_methods(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 country_id UUID REFERENCES countries(id),
 provider_code TEXT NOT NULL,
 provider_name TEXT NOT NULL,
 method_type TEXT NOT NULL,
 currency TEXT,
 active BOOLEAN DEFAULT TRUE,
 metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS payment_transactions(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id),
 payment_method_id UUID REFERENCES payment_methods(id),
 provider_reference TEXT,
 amount NUMERIC NOT NULL,
 currency TEXT NOT NULL,
 product_code TEXT,
 status TEXT DEFAULT 'initiated',
 created_at TIMESTAMPTZ DEFAULT now(),
 paid_at TIMESTAMPTZ,
 metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS nutritionist_profiles(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 practitioner_id UUID REFERENCES practitioners(id),
 country_id UUID REFERENCES countries(id),
 languages JSONB,
 specialties JSONB,
 consultation_modes JSONB,
 consultation_fee NUMERIC,
 currency TEXT,
 availability_status TEXT DEFAULT 'available',
 verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS appointments(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id),
 nutritionist_id UUID REFERENCES practitioners(id),
 scheduled_start TIMESTAMPTZ NOT NULL,
 scheduled_end TIMESTAMPTZ NOT NULL,
 mode TEXT,
 status TEXT DEFAULT 'requested',
 topic TEXT,
 notes TEXT,
 payment_transaction_id UUID REFERENCES payment_transactions(id),
 created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_threads(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES users(id),
 nutritionist_id UUID REFERENCES practitioners(id),
 appointment_id UUID REFERENCES appointments(id),
 status TEXT DEFAULT 'open',
 created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 thread_id UUID REFERENCES chat_threads(id),
 sender_type TEXT NOT NULL,
 sender_id UUID,
 message TEXT NOT NULL,
 attachment_uri TEXT,
 created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO payment_methods(country_id,provider_code,provider_name,method_type,currency,active)
SELECT c.id,'CARD','Bank Card','card',c.currency,TRUE FROM countries c
ON CONFLICT DO NOTHING;

INSERT INTO payment_methods(country_id,provider_code,provider_name,method_type,currency,active)
SELECT c.id,'MIXX_BY_YAS','Mixx by Yas','mobile_money',c.currency,TRUE FROM countries c WHERE c.iso2='TG'
ON CONFLICT DO NOTHING;

INSERT INTO payment_methods(country_id,provider_code,provider_name,method_type,currency,active)
SELECT c.id,'FLOOZ','Flooz','mobile_money',c.currency,TRUE FROM countries c WHERE c.iso2='TG'
ON CONFLICT DO NOTHING;
