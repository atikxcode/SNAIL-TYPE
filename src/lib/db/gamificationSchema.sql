-- PostgreSQL Gamification Tables Schema

-- Extend user_stats table with gamification fields (these should be added to the existing table)
-- ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
-- ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
-- ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS streak_freezes_available INTEGER DEFAULT 1;
-- ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS current_tier VARCHAR(20) DEFAULT 'Bronze';

-- Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL, -- unique identifier like "first_test"
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    xp_reward INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Achievements Table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 0, -- for multi-step achievements
    UNIQUE(user_id, achievement_id) -- prevent duplicate unlocks
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- Function to calculate required XP for a level
-- Level N requires: 100 * N XP 
-- Level 1 needs 100 XP, Level 2 needs 200 XP, Level 3 needs 300 XP, etc.
-- This would normally be handled in application logic, not in SQL

-- Insert default achievements
INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('first_test', 'First Steps', 'Complete your first test', '🏆', 10)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('five_tests', 'Getting Started', 'Complete 5 tests', '🏁', 25)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('twenty_five_tests', 'Dedicated', 'Complete 25 tests', '🎯', 50)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('one_hundred_tests', 'Century Club', 'Complete 100 tests', '💯', 100)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('one_hundred_wpm', 'Speed Demon', 'Reach 100 WPM', '⚡', 75)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('perfect_accuracy', 'Perfectionist', '100% accuracy on any test', '💯', 50)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('week_streak', 'Week Warrior', '7-day streak', '🔥', 100)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('month_streak', 'Month Master', '30-day streak', '👑', 200)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('early_bird', 'Early Bird', 'Complete test before 8 AM', '🌅', 25)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('night_owl', 'Night Owl', 'Complete test after 10 PM', '🦉', 25)
ON CONFLICT (key) DO NOTHING;

INSERT INTO achievements (key, name, description, icon_url, xp_reward) VALUES
('code_ninja', 'Code Ninja', 'Complete 20 code-mode tests', '⌨️', 75)
ON CONFLICT (key) DO NOTHING;