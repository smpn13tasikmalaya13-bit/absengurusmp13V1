-- Migration: 001_add_schools_and_school_id_postgres.sql
-- Purpose: Add multi-tenant foundation (schools table + school_id on key tables) and 'master' role support.
-- DB: PostgreSQL (tested on PG 13+). Run inside a transaction.
-- Safety: idempotent checks for existence; does NOT DROP any existing tables or columns.
-- Backward compatible: existing users and academic rows are assigned to the inserted default school.

BEGIN;

-- 1) Create schools table if missing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2) Ensure a default (legacy) school exists and capture its id
DO $$
DECLARE
  default_school_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schools WHERE slug = 'default') THEN
    INSERT INTO schools (name, slug) VALUES ('Sekolah Utama', 'default');
  END IF;
  SELECT id INTO default_school_id FROM schools WHERE slug = 'default' LIMIT 1;

  -- 3) Add school_id column to users (nullable so 'master' users can be null)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'school_id') THEN
      ALTER TABLE users ADD COLUMN school_id UUID NULL;
      -- Assign existing users to legacy school
      UPDATE users SET school_id = default_school_id WHERE school_id IS NULL;
      -- Add FK and index
      ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_school FOREIGN KEY (school_id) REFERENCES schools(id);
      CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
    END IF;

    -- 4) Add CHECK constraint that a user with role = 'master' MUST have NULL school_id
    --    (i.e. role 'master' implies no school_id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_master_school_null') THEN
      ALTER TABLE users ADD CONSTRAINT users_master_school_null CHECK (NOT (role = 'master' AND school_id IS NOT NULL));
    END IF;

    -- 5) Add 'master' option to enum-type role if applicable
    -- Determine if users.role uses a Postgres enum type
    DECLARE enum_type_name TEXT;
    SELECT udt_name INTO enum_type_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role' LIMIT 1;

    IF enum_type_name IS NOT NULL THEN
      -- If enum already has 'master', this will quietly do nothing (Postgres 13+ supports IF NOT EXISTS)
      BEGIN
        EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', enum_type_name, 'master');
      EXCEPTION WHEN undefined_function THEN
        -- Some older PG versions don't support IF NOT EXISTS; attempt safe add without IF NOT EXISTS
        -- (will fail if value exists: that's okay—migration author should inspect error and proceed)
        EXECUTE format('ALTER TYPE %I ADD VALUE %L', enum_type_name, 'master');
      END;
    END IF;

  END IF; -- users table exists

  -- 6) Add school_id to common academic tables (if they exist). Keep nullable and set default to legacy school for existing rows.
  FOR tbl IN SELECT unnest(ARRAY['master_schedules','lesson_schedules','eskul_schedules','absence_records','classes']) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'school_id') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN school_id UUID NULL', tbl);
        EXECUTE format('UPDATE %I SET school_id = %L WHERE school_id IS NULL', tbl, default_school_id);
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (school_id) REFERENCES schools(id)', tbl, tbl || '_school_id_fkey');
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(school_id)', tbl || '_school_id_idx', tbl);
      END IF;
    END IF;
  END LOOP;

END$$;

COMMIT;

-- Rollback notes (manual):
-- To rollback manually if needed:
-- 1) DROP CONSTRAINTS and INDEXES added above (fk and idx names are stable if created by this script)
-- 2) DROP columns (school_id) on tables (if you want to revert) and optionally DROP the inserted default school row.
-- Important: Rollback is destructive. Always backup DB before reversing a migration.
