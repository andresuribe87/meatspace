-- v0.2 request intake (POST /v1/requests): a gap report on your dataset (run by hand), a real-robot pilot
-- (waitlist) or evaluation on robots you own. The v0.1 waitlist table (0001) stays as it is.
CREATE TABLE IF NOT EXISTS requests (
  -- gr_ / pl_ / or_ + 16 hex: sha256 of kind, email and (gap reports) dataset, so a repeat maps to the same row.
  id          TEXT    PRIMARY KEY,
  kind        TEXT    NOT NULL CHECK (kind IN ('gap_report', 'pilot', 'own_robot')),
  email       TEXT    NOT NULL,
  -- gap_report only: Hub dataset id (owner/name).
  dataset     TEXT    CHECK ((kind = 'gap_report') = (dataset IS NOT NULL)),
  -- Every validated field except email and the honeypot, as JSON.
  payload     TEXT    NOT NULL CHECK (json_valid(payload)),
  source      TEXT,
  country     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- A repeat of the same request (same id) replaces payload and source: the latest answers win. NULL until then.
  updated_at  TEXT
);

CREATE INDEX IF NOT EXISTS requests_kind_created_at ON requests (kind, created_at);
