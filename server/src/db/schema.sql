-- Smart House Design & Cost Recommendation System
-- PostgreSQL schema. Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(120)  NOT NULL,
  email         VARCHAR(254)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(10)   NOT NULL DEFAULT 'client'
                CHECK (role IN ('client', 'admin')),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS house_plans (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(120)  NOT NULL,
  description      TEXT          NOT NULL DEFAULT '',
  bedrooms         SMALLINT      NOT NULL CHECK (bedrooms BETWEEN 0 AND 20),
  bathrooms        NUMERIC(3,1)  NOT NULL CHECK (bathrooms >= 0),
  floors           SMALLINT      NOT NULL CHECK (floors BETWEEN 1 AND 5),
  floor_area_m2    NUMERIC(8,2)  NOT NULL CHECK (floor_area_m2 > 0),
  footprint_m2     NUMERIC(8,2)  NOT NULL CHECK (footprint_m2 > 0),
  min_plot_size_m2 NUMERIC(8,2)  NOT NULL CHECK (min_plot_size_m2 > 0),
  style            VARCHAR(60)   NOT NULL,
  image_url        TEXT          NOT NULL DEFAULT '',
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by       INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_house_plans_active   ON house_plans (is_active);
CREATE INDEX IF NOT EXISTS idx_house_plans_bedrooms ON house_plans (bedrooms);

CREATE TABLE IF NOT EXISTS cost_rates (
  id           SERIAL PRIMARY KEY,
  finish_level VARCHAR(10)   NOT NULL UNIQUE
               CHECK (finish_level IN ('basic', 'standard', 'premium')),
  rate_per_m2  NUMERIC(10,2) NOT NULL CHECK (rate_per_m2 > 0),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_searches (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plot_size_m2 NUMERIC(10,2) NOT NULL CHECK (plot_size_m2 > 0),
  budget       NUMERIC(14,2) NOT NULL CHECK (budget > 0),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_searches_user ON user_searches (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS saved_plans (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id    INTEGER     NOT NULL REFERENCES house_plans(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, plan_id)
);

-- Additive consultation foundation: existing catalogue records are preserved.
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS consultation_drafts (
  project_id INTEGER PRIMARY KEY REFERENCES projects(id),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  answers JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS design_briefs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  version INTEGER NOT NULL CHECK (version > 0),
  draft_revision INTEGER NOT NULL,
  brief JSONB NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, version),
  UNIQUE(project_id, draft_revision)
);
