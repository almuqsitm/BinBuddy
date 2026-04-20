ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location text;

CREATE TABLE IF NOT EXISTS subtasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  completed   boolean     NOT NULL DEFAULT false,
  order_index integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subtasks_task_id_idx ON subtasks(task_id);
