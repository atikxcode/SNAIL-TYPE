-- PostgreSQL Weakness Profiles Table Schema

-- Weakness Profiles Table
CREATE TABLE IF NOT EXISTS weakness_profiles (
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    weak_keys JSONB, -- Array of { key, error_rate, total_attempts }
    weak_bigrams JSONB, -- Array of { bigram, error_rate }
    avg_accuracy_by_duration JSONB, -- { "0-15s": 98, "15-30s": 95, "30-60s": 92 }
    avg_key_latency JSONB, -- Per-finger avg latency { "left_pinky": 200, "right_index": 150, ... }
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_weakness_profiles_user_id ON weakness_profiles(user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW updated_at = CURRENT_TIMESTAMP;
    NEW last_calculated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_weakness_profiles_updated_at 
    BEFORE UPDATE ON weakness_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();