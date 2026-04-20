ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'standard'
  CHECK (task_type IN ('standard', 'garbage_collection'));

CREATE TABLE IF NOT EXISTS garbage_points (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label        text        NOT NULL,
  x_percent    real        NOT NULL,
  y_percent    real        NOT NULL,
  collected    boolean     NOT NULL DEFAULT false,
  collected_by uuid        REFERENCES users(id),
  collected_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS garbage_points_task_id_idx ON garbage_points(task_id);
