-- Waitlist for [ API KEYS ] and [ CONNECT HARDWARE (meatspaced) ].
CREATE TABLE IF NOT EXISTS waitlist (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT    NOT NULL CHECK (kind IN ('api_keys', 'hardware')),
  email       TEXT    NOT NULL,
  handle      TEXT,
  detail      TEXT,
  protocol    TEXT    CHECK (protocol IS NULL OR protocol IN ('mavlink', 'ros2', 'vda5050', 'opcua')),
  fleet_size  TEXT    CHECK (fleet_size IS NULL OR fleet_size IN ('1', '2-10', '11-50', '51-250', '250+')),
  country     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (kind, email)
);

CREATE INDEX IF NOT EXISTS waitlist_created_at ON waitlist (created_at);
