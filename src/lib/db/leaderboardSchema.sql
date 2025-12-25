-- PostgreSQL Leaderboard Tables Schema

-- Leaderboard Entries Table
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL,  -- 'daily', 'weekly', 'monthly', 'all_time'
    mode VARCHAR(20) NOT NULL,    -- 'time_15s', 'time_60s', 'words_10', 'words_50', etc.
    category VARCHAR(50) NOT NULL, -- 'random_words', 'code', 'quotes', etc.
    best_wpm DECIMAL(5,2) NOT NULL,
    best_accuracy DECIMAL(5,2) NOT NULL,
    tests_count INTEGER DEFAULT 1,
    rank INTEGER,                 -- Calculated rank
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_period ON leaderboard_entries(period);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user_id ON leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_mode ON leaderboard_entries(mode);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_category ON leaderboard_entries(category);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_wpm ON leaderboard_entries(best_wpm DESC);

-- Friends System Tables
-- Friendship Relations Table
CREATE TABLE IF NOT EXISTS friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)  -- Prevent duplicate friendships
);

-- Constraints to prevent user from friending themselves
ALTER TABLE friendships 
ADD CONSTRAINT chk_different_users 
CHECK (user_id != friend_id);

-- Index for friend lookup
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Friend Requests Activity Table (to track recent friend activity)
CREATE TABLE IF NOT EXISTS friend_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,  -- 'test_completed', 'achievement_unlocked', 'level_up', 'streak_milestone'
    activity_data JSONB,                 -- Additional data about the activity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for friend activity
CREATE INDEX IF NOT EXISTS idx_friend_activity_user_id ON friend_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_activity_friend_id ON friend_activity(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_activity_created_at ON friend_activity(created_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update the updated_at column
CREATE TRIGGER update_leaderboard_entries_updated_at 
    BEFORE UPDATE ON leaderboard_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at 
    BEFORE UPDATE ON friendships 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();