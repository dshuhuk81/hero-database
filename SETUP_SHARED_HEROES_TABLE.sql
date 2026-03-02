-- Create shared_hero_configs table for hero setup sharing feature
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS shared_hero_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id VARCHAR(8) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    heroes_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_share_id ON shared_hero_configs(share_id);
CREATE INDEX IF NOT EXISTS idx_user_id ON shared_hero_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON shared_hero_configs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE shared_hero_configs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view sharing data (public access via share_id)
CREATE POLICY "Allow public read by share_id" ON shared_hero_configs
    FOR SELECT
    USING (true);

-- Allow users to create their own share configs
CREATE POLICY "Allow users to insert their own shares" ON shared_hero_configs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own share configs
CREATE POLICY "Allow users to delete their own shares" ON shared_hero_configs
    FOR DELETE
    USING (auth.uid() = user_id);
