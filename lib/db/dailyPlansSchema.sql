-- PostgreSQL Daily Plans Table Schema

-- Daily Plans Table
CREATE TABLE IF NOT EXISTS daily_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    components JSONB NOT NULL, -- Array of plan components with details
    total_duration INTEGER NOT NULL, -- Total expected duration in seconds
    completed_components TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of completed component IDs
    completed_at TIMESTAMP WITH TIME ZONE, -- When the entire plan was completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, plan_date) -- Each user can only have one plan per day
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_id ON daily_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plans_plan_date ON daily_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, plan_date);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_daily_plans_updated_at 
    BEFORE UPDATE ON daily_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Example structure for components JSONB:
-- [
--   {
--     "id": "warmup",
--     "name": "Warmup",
--     "description": "Start with some easy typing to warm up your fingers",
--     "category": "random_words",
--     "difficulty": "easy",
--     "duration": 60,
--     "target": "Relaxed typing, focus on accuracy",
--     "customText": null
--   },
--   {
--     "id": "weakness_drill",
--     "name": "Focus: S Key",
--     "description": "Practice words with the 's' key",
--     "category": "custom",
--     "difficulty": "medium",
--     "duration": 120,
--     "target": "Maintain 90% accuracy on this key",
--     "customText": "this is sample text with lots of s characters..."
--   }
-- ]