-- SMS AI Assistant - Supabase Database Schema
-- Initial migration for production SMS AI platform

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create custom types
CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'basic', 'unlimited', 'family');

-- Users table
CREATE TABLE public.users (
    id BIGSERIAL PRIMARY KEY,
    phone_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ,
    subscription_tier public.subscription_tier DEFAULT 'free',
    message_count_today INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    persona_config JSONB DEFAULT '{}',
    billing_customer_id TEXT,
    family_sponsor_id BIGINT REFERENCES public.users(id)
);

-- Messages table (optimized for time-series data)
CREATE TABLE public.messages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id),
    direction public.message_direction NOT NULL,
    content TEXT,
    content_hash TEXT,
    persona_used TEXT,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    cost_cents INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    twilio_sid TEXT,
    error_message TEXT,
    ai_model TEXT DEFAULT 'gpt-4o-mini'
);

-- System metrics (hourly aggregations)
CREATE TABLE public.metrics_hourly (
    id BIGSERIAL PRIMARY KEY,
    hour_bucket TIMESTAMPTZ NOT NULL,
    metric_name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hour_bucket, metric_name, tags)
);

-- Admin actions audit log
CREATE TABLE public.admin_actions (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id BIGINT,
    action TEXT NOT NULL,
    resource TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System configuration
CREATE TABLE public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by BIGINT
);

-- Blocked phone numbers (for quick lookups)
CREATE TABLE public.blocked_numbers (
    id BIGSERIAL PRIMARY KEY,
    phone_hash TEXT UNIQUE NOT NULL,
    reason TEXT,
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    blocked_by BIGINT
);

-- User sessions (for context tracking)
CREATE TABLE public.user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id),
    session_data JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
-- Users table indexes
CREATE INDEX idx_users_phone_hash ON public.users(phone_hash);
CREATE INDEX idx_users_last_active ON public.users(last_active);
CREATE INDEX idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX idx_users_family_sponsor ON public.users(family_sponsor_id) WHERE family_sponsor_id IS NOT NULL;

-- Messages table indexes
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_direction ON public.messages(direction);
CREATE INDEX idx_messages_content_hash ON public.messages(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_messages_twilio_sid ON public.messages(twilio_sid) WHERE twilio_sid IS NOT NULL;
CREATE INDEX idx_messages_cost_tracking ON public.messages(user_id, created_at, cost_cents) WHERE cost_cents > 0;

-- Metrics table indexes
CREATE INDEX idx_metrics_hourly_bucket ON public.metrics_hourly(hour_bucket DESC);
CREATE INDEX idx_metrics_hourly_name ON public.metrics_hourly(metric_name);
CREATE INDEX idx_metrics_hourly_lookup ON public.metrics_hourly(hour_bucket, metric_name);

-- Admin actions indexes
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_admin_user ON public.admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_action ON public.admin_actions(action);

-- Blocked numbers indexes
CREATE INDEX idx_blocked_numbers_phone_hash ON public.blocked_numbers(phone_hash);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Insert default system configuration
INSERT INTO public.system_config (key, value) VALUES
    ('kill_switch', 'false'),
    ('fallback_mode', 'false'),
    ('rate_limit', '10'),
    ('moderation_enabled', 'true'),
    ('ai_model', '"gpt-4o-mini"'),
    ('max_tokens', '150'),
    ('paused_until', 'null');

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_or_create_user(phone_hash_param TEXT)
RETURNS BIGINT AS $$
DECLARE
    user_id BIGINT;
BEGIN
    -- Try to get existing user
    SELECT id INTO user_id FROM public.users WHERE phone_hash = phone_hash_param;

    -- If not found, create new user
    IF user_id IS NULL THEN
        INSERT INTO public.users (phone_hash)
        VALUES (phone_hash_param)
        RETURNING id INTO user_id;
    END IF;

    -- Update last_active
    UPDATE public.users
    SET last_active = NOW()
    WHERE id = user_id;

    RETURN user_id;
END;
$$ LANGUAGE plpgsql;