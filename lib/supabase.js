const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseKey && !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Create client for public operations (with RLS)
const supabase = createClient(supabaseUrl, supabaseKey || supabaseServiceKey);

// Create admin client for service operations (bypass RLS)
const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : supabase;

// Helper functions for common operations

/**
 * Get or create user by phone hash
 */
async function getOrCreateUser(phoneHash) {
    try {
        const { data, error } = await supabaseAdmin
            .rpc('get_or_create_user', { phone_hash_param: phoneHash });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting/creating user:', error);
        throw error;
    }
}

/**
 * Record a message in the database
 */
async function recordMessage({
    userId,
    direction,
    content = null,
    contentHash = null,
    personaUsed = null,
    tokensUsed = null,
    responseTimeMs = null,
    costCents = null,
    twilioSid = null,
    errorMessage = null,
    aiModel = 'gpt-4o-mini'
}) {
    try {
        const { data, error } = await supabaseAdmin
            .from('messages')
            .insert({
                user_id: userId,
                direction,
                content,
                content_hash: contentHash,
                persona_used: personaUsed,
                tokens_used: tokensUsed,
                response_time_ms: responseTimeMs,
                cost_cents: costCents,
                twilio_sid: twilioSid,
                error_message: errorMessage,
                ai_model: aiModel
            })
            .select('id')
            .single();

        if (error) throw error;

        // Update user message counts
        await supabaseAdmin
            .from('users')
            .update({
                total_messages: supabaseAdmin.sql`total_messages + 1`,
                message_count_today: supabaseAdmin.sql`
                    CASE
                        WHEN DATE(last_active) = CURRENT_DATE THEN message_count_today + 1
                        ELSE 1
                    END
                `
            })
            .eq('id', userId);

        return data.id;
    } catch (error) {
        console.error('Error recording message:', error);
        throw error;
    }
}

/**
 * Update hourly metrics
 */
async function updateHourlyMetric(metricName, value, tags = {}) {
    try {
        const hourBucket = new Date();
        hourBucket.setMinutes(0, 0, 0); // Round to hour

        const { error } = await supabaseAdmin
            .from('metrics_hourly')
            .upsert({
                hour_bucket: hourBucket.toISOString(),
                metric_name: metricName,
                value,
                tags
            }, {
                onConflict: 'hour_bucket,metric_name,tags',
                ignoreDuplicates: false
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error updating hourly metric:', error);
        throw error;
    }
}

/**
 * Check if phone number is blocked
 */
async function isPhoneBlocked(phoneHash) {
    try {
        const { data, error } = await supabaseAdmin
            .from('blocked_numbers')
            .select('id')
            .eq('phone_hash', phoneHash)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return !!data;
    } catch (error) {
        console.error('Error checking blocked phone:', error);
        return false;
    }
}

/**
 * Get system configuration
 */
async function getSystemConfig(key = null) {
    try {
        let query = supabaseAdmin.from('system_config').select('key, value');

        if (key) {
            query = query.eq('key', key).single();
        }

        const { data, error } = await query;
        if (error) throw error;

        if (key) {
            return data ? data.value : null;
        }

        // Return as object for multiple configs
        const config = {};
        data.forEach(item => {
            config[item.key] = item.value;
        });
        return config;
    } catch (error) {
        console.error('Error getting system config:', error);
        return key ? null : {};
    }
}

/**
 * Update system configuration
 */
async function updateSystemConfig(key, value) {
    try {
        const { error } = await supabaseAdmin
            .from('system_config')
            .upsert({
                key,
                value,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error updating system config:', error);
        throw error;
    }
}

/**
 * Log admin action
 */
async function logAdminAction(adminUserId, action, resource, metadata = {}, ipAddress = null) {
    try {
        const { error } = await supabaseAdmin
            .from('admin_actions')
            .insert({
                admin_user_id: adminUserId,
                action,
                resource,
                metadata,
                ip_address: ipAddress
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
}

/**
 * Get metrics for dashboard
 */
async function getDashboardMetrics() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Get active users (last 24 hours)
        const { count: activeUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('last_active', last24Hours);

        // Get messages today
        const { count: messagesToday } = await supabaseAdmin
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today + 'T00:00:00.000Z');

        // Get costs today
        const { data: costData } = await supabaseAdmin
            .from('messages')
            .select('cost_cents')
            .gte('created_at', today + 'T00:00:00.000Z')
            .not('cost_cents', 'is', null);

        const totalCostCents = costData?.reduce((sum, msg) => sum + (msg.cost_cents || 0), 0) || 0;

        // Get average response time
        const { data: responseData } = await supabaseAdmin
            .from('messages')
            .select('response_time_ms')
            .gte('created_at', last24Hours)
            .not('response_time_ms', 'is', null)
            .limit(1000);

        const avgResponseTime = responseData?.length > 0
            ? responseData.reduce((sum, msg) => sum + msg.response_time_ms, 0) / responseData.length
            : 0;

        return {
            activeUsers: activeUsers || 0,
            messagesToday: messagesToday || 0,
            costToday: (totalCostCents / 100).toFixed(2),
            avgResponseTime: Math.round(avgResponseTime)
        };

    } catch (error) {
        console.error('Error getting dashboard metrics:', error);
        return {
            activeUsers: 0,
            messagesToday: 0,
            costToday: '0.00',
            avgResponseTime: 0
        };
    }
}

/**
 * Health check for database
 */
async function healthCheck() {
    try {
        const { data, error } = await supabase
            .from('system_config')
            .select('count')
            .limit(1);

        if (error) throw error;

        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'supabase'
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
            service: 'supabase'
        };
    }
}

module.exports = {
    supabase,
    supabaseAdmin,
    getOrCreateUser,
    recordMessage,
    updateHourlyMetric,
    isPhoneBlocked,
    getSystemConfig,
    updateSystemConfig,
    logAdminAction,
    getDashboardMetrics,
    healthCheck
};