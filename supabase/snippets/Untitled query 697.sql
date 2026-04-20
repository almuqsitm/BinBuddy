CREATE TABLE IF NOT EXISTS tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  assigned_to uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_type    text        NOT NULL CHECK (due_type IN ('day', 'week')),
  due_date    date        NOT NULL,
  completed   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
