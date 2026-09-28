-- Patterns: the core content of the site
CREATE TABLE IF NOT EXISTS patterns (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  title        TEXT    NOT NULL,
  excerpt      TEXT    NOT NULL DEFAULT '',
  category     TEXT    NOT NULL,
  difficulty   TEXT    NOT NULL DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  image        TEXT    NOT NULL DEFAULT '',
  image_alt    TEXT    NOT NULL DEFAULT '',
  yarn_weight  TEXT    NOT NULL DEFAULT '',
  hook_size    TEXT    NOT NULL DEFAULT '',
  time_needed  TEXT    NOT NULL DEFAULT '',
  materials    TEXT    NOT NULL DEFAULT '',  -- one item per line
  content      TEXT    NOT NULL DEFAULT '',  -- markdown
  published    INTEGER NOT NULL DEFAULT 1,
  published_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patterns_feed     ON patterns (published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns (category, published, published_at DESC);

-- Newsletter sign-ups
CREATE TABLE IF NOT EXISTS subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contact form messages
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
