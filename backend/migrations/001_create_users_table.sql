CREATE TABLE IF NOT EXISTS users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  text        NOT NULL,
  last_name   text        NOT NULL,
  email       text        NOT NULL UNIQUE,
  role        text        NOT NULL CHECK (role IN ('janitor', 'supervisor')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
