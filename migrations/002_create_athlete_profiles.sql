CREATE TABLE IF NOT EXISTS athlete_profiles (
    athlete_id BIGINT PRIMARY KEY REFERENCES athletes(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    sport VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    academic_context VARCHAR(300),
    gpa NUMERIC(3,2),
    graduation_year SMALLINT NOT NULL,
    highlight_url VARCHAR(2048),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
