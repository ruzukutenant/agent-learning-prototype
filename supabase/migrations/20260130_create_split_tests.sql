-- Split test configurations (managed via admin UI)
CREATE TABLE split_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT UNIQUE NOT NULL,
  location TEXT NOT NULL DEFAULT 'landing',
  variants JSONB NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  winner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
