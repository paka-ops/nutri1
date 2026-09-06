CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- COUNTRY / TENANCY
CREATE TABLE countries(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 iso2 CHAR(2) UNIQUE NOT NULL, name TEXT NOT NULL,
 official_language_codes JSONB DEFAULT '[]',
 local_language_codes JSONB DEFAULT '[]',
 currency TEXT, status TEXT DEFAULT 'active',
 metadata JSONB DEFAULT '{}'
);
CREATE TABLE administrative_units(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 country_id UUID REFERENCES countries(id),
 parent_id UUID REFERENCES administrative_units(id),
 code TEXT NOT NULL,name TEXT NOT NULL,level TEXT NOT NULL,
 geometry_geojson JSONB
);
CREATE TABLE organizations(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 country_id UUID REFERENCES countries(id),
 type TEXT NOT NULL,name TEXT NOT NULL,status TEXT DEFAULT 'active'
);
CREATE TABLE tenants(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 country_id UUID REFERENCES countries(id),
 organization_id UUID REFERENCES organizations(id),
 type TEXT NOT NULL,name TEXT NOT NULL,status TEXT DEFAULT 'active'
);
CREATE TABLE users(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id UUID REFERENCES tenants(id),country_id UUID REFERENCES countries(id),
 email TEXT UNIQUE,phone TEXT,role TEXT,locale TEXT,status TEXT DEFAULT 'active',
 created_at TIMESTAMPTZ DEFAULT now()
);

-- CONSENT / AUDIT
CREATE TABLE consents(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 purpose TEXT,scope JSONB,granted BOOLEAN,granted_at TIMESTAMPTZ,revoked_at TIMESTAMPTZ
);
CREATE TABLE audit_log(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),actor_user_id UUID,tenant_id UUID,
 action TEXT,resource TEXT,metadata JSONB,created_at TIMESTAMPTZ DEFAULT now()
);

-- AFRICAN FOOD ONTOLOGY
CREATE TABLE foods(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 canonical_name TEXT NOT NULL,scientific_name TEXT,food_group TEXT,
 food_state TEXT,processing_method TEXT,origin_country_id UUID REFERENCES countries(id),
 parent_food_id UUID REFERENCES foods(id),ontology_code TEXT UNIQUE,
 verified BOOLEAN DEFAULT FALSE,version TEXT
);
CREATE TABLE food_names(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),food_id UUID REFERENCES foods(id),
 country_id UUID REFERENCES countries(id),language_code TEXT,
 local_name TEXT NOT NULL,phonetic_name TEXT,verified BOOLEAN DEFAULT FALSE
);
CREATE TABLE food_equivalences(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),food_id UUID REFERENCES foods(id),
 external_system TEXT,external_code TEXT,match_confidence NUMERIC
);

-- COMPOSITION
CREATE TABLE nutrients(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),code TEXT UNIQUE,name TEXT,unit TEXT,
 category TEXT
);
CREATE TABLE food_composition(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),food_id UUID REFERENCES foods(id),
 country_id UUID REFERENCES countries(id),nutrient_id UUID REFERENCES nutrients(id),
 value NUMERIC,unit TEXT,basis TEXT,method TEXT,lab TEXT,source TEXT,
 quality_score NUMERIC,status TEXT,version TEXT
);

-- RECIPES / MEALS
CREATE TABLE recipes(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),country_id UUID REFERENCES countries(id),
 region_id UUID REFERENCES administrative_units(id),name TEXT NOT NULL,
 local_names JSONB,meal_type TEXT,ingredients JSONB,
 preparation_method TEXT,portion_reference JSONB,
 nutrient_profile JSONB,source TEXT,validation_status TEXT,version TEXT
);
CREATE TABLE meal_observations(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 recipe_id UUID REFERENCES recipes(id),meal_image_uri TEXT,
 consumed_at TIMESTAMPTZ,portion_g NUMERIC,estimated_nutrients JSONB,
 scanner_confidence NUMERIC,review_status TEXT
);

-- CONSUMPTION / PRODUCTION
CREATE TABLE consumption_observations(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),country_id UUID REFERENCES countries(id),
 region_id UUID REFERENCES administrative_units(id),food_id UUID REFERENCES foods(id),
 period_start DATE,period_end DATE,frequency NUMERIC,portion_g NUMERIC,
 prevalence NUMERIC,source TEXT,methodology TEXT,quality_status TEXT
);
CREATE TABLE production_observations(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),country_id UUID REFERENCES countries(id),
 region_id UUID REFERENCES administrative_units(id),food_id UUID REFERENCES foods(id),
 year INT,production_tonnes NUMERIC,area_ha NUMERIC,yield_t_ha NUMERIC,
 source TEXT,quality_status TEXT
);
CREATE TABLE food_balance(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),country_id UUID REFERENCES countries(id),
 region_id UUID REFERENCES administrative_units(id),food_id UUID REFERENCES foods(id),
 period_start DATE,period_end DATE,production_tonnes NUMERIC,
 consumption_tonnes NUMERIC,imports_tonnes NUMERIC,exports_tonnes NUMERIC,
 estimated_need_tonnes NUMERIC,gap_tonnes NUMERIC,confidence NUMERIC,
 methodology TEXT,version TEXT
);

-- INDIVIDUAL HEALTH/NUTRITION
CREATE TABLE anthropometry(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 sex TEXT,age_years NUMERIC,weight_kg NUMERIC,height_cm NUMERIC,
 waist_cm NUMERIC,hip_cm NUMERIC,bmi NUMERIC,whtr NUMERIC,whr NUMERIC,
 measured_at TIMESTAMPTZ,source TEXT
);
CREATE TABLE metabolic_measurements(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 type TEXT,value NUMERIC,secondary_value NUMERIC,unit TEXT,
 measured_at TIMESTAMPTZ,source TEXT,entry_mode TEXT,device_id TEXT
);
CREATE TABLE clinical_context(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 condition_code TEXT,condition_name TEXT,status TEXT,recorded_on DATE,
 source TEXT,notes TEXT
);
CREATE TABLE activity_sleep(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 activity_minutes INT,steps INT,sleep_hours NUMERIC,recorded_at TIMESTAMPTZ,source TEXT
);
CREATE TABLE nutrition_entries(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 food_id UUID REFERENCES foods(id),recipe_id UUID REFERENCES recipes(id),
 meal_type TEXT,portion_g NUMERIC,consumed_at TIMESTAMPTZ,source TEXT
);

-- SCREENING / PREVENTION
CREATE TABLE nutrition_screenings(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 age_group TEXT,sex TEXT,wasting_status TEXT,stunting_status TEXT,
 underweight_status TEXT,overweight_status TEXT,obesity_status TEXT,
 anemia_status TEXT,screening_date DATE,protocol_version TEXT
);
CREATE TABLE risk_signals(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 domain TEXT,signal_code TEXT,level TEXT,evidence_refs JSONB,
 model_version TEXT,generated_at TIMESTAMPTZ
);
CREATE TABLE recommendations(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 type TEXT,content JSONB,evidence_refs JSONB,country_code TEXT,
 model_version TEXT,professional_review BOOLEAN,created_at TIMESTAMPTZ DEFAULT now()
);

-- AI SCANNERS
CREATE TABLE scanner_events(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),
 scanner_type TEXT,image_uri TEXT,detected_items JSONB,
 portion_estimate JSONB,nutrient_estimate JSONB,confidence NUMERIC,
 model_version TEXT,created_at TIMESTAMPTZ DEFAULT now()
);

-- EVIDENCE GRAPH
CREATE TABLE evidence_nodes(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),node_type TEXT,label TEXT,
 country_scope JSONB,metadata JSONB
);
CREATE TABLE evidence_edges(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),source_node UUID REFERENCES evidence_nodes(id),
 target_node UUID REFERENCES evidence_nodes(id),relation TEXT,
 evidence_level TEXT,source TEXT,population_scope TEXT,metadata JSONB
);

-- PROFESSIONAL NETWORK
CREATE TABLE practitioners(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),country_id UUID REFERENCES countries(id),
 name TEXT,profession TEXT,organization TEXT,license_reference TEXT,
 languages JSONB,expertise JSONB,verified BOOLEAN DEFAULT FALSE
);
CREATE TABLE practitioner_reviews(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),practitioner_id UUID REFERENCES practitioners(id),
 recommendation_id UUID REFERENCES recommendations(id),decision TEXT,comments TEXT,
 reviewed_at TIMESTAMPTZ
);

-- GOVERNMENT INDICATORS
CREATE TABLE indicators(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),code TEXT UNIQUE,name TEXT,domain TEXT,
 definition TEXT,unit TEXT,population TEXT,frequency TEXT,methodology TEXT,
 source_standard TEXT,version TEXT,status TEXT
);
CREATE TABLE indicator_values(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),indicator_id UUID REFERENCES indicators(id),
 country_id UUID REFERENCES countries(id),admin_unit_id UUID REFERENCES administrative_units(id),
 period_start DATE,period_end DATE,numerator NUMERIC,denominator NUMERIC,value NUMERIC,
 confidence_low NUMERIC,confidence_high NUMERIC,sample_size INT,source TEXT,
 quality_status TEXT,version TEXT
);

-- MARKETPLACE / API / CONTRACTS
CREATE TABLE data_products(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),country_id UUID REFERENCES countries(id),
 code TEXT UNIQUE,name TEXT,description TEXT,classification TEXT,
 granularity TEXT,license_type TEXT,version TEXT,status TEXT
);
CREATE TABLE api_keys(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID REFERENCES tenants(id),
 key_hash TEXT,scopes JSONB,expires_at TIMESTAMPTZ,status TEXT
);
CREATE TABLE subscriptions(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID REFERENCES tenants(id),
 product_id UUID REFERENCES data_products(id),start_date DATE,end_date DATE,
 price NUMERIC,currency TEXT,status TEXT
);
CREATE TABLE contracts(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),country_id UUID REFERENCES countries(id),
 organization_id UUID REFERENCES organizations(id),contract_number TEXT UNIQUE,
 contract_type TEXT,scope JSONB,license_scope JSONB,start_date DATE,end_date DATE,
 value_amount NUMERIC,currency TEXT,status TEXT DEFAULT 'draft'
);
