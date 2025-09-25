const crypto = require('crypto');
const {
    getDashboardMetrics,
    getSystemConfig,
    updateSystemConfig,
    logAdminAction,
    supabaseAdmin
} = require('../lib/supabase');

// Admin authentication middleware
function requireAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    const token = authHeader.substring(7);
    const validToken = crypto.createHash('sha256').update('smsadmin2025').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(validToken));
}

// Main admin handler
module.exports = async function handler(req, res) {
    const path = req.url.replace('/api/admin', '');

    // CORS headers for dashboard
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Check authentication for non-metrics endpoints
    if (!path.startsWith('/metrics') && !requireAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Route handlers
        if (path === '/killswitch' && req.method === 'POST') {
            const currentKillSwitch = await getSystemConfig('kill_switch');
            const newKillSwitch = !currentKillSwitch;

            await updateSystemConfig('kill_switch', newKillSwitch);
            await logAdminAction(1, 'KILL_SWITCH_TOGGLE', 'system', { newValue: newKillSwitch });

            console.log(`EMERGENCY: Kill switch ${newKillSwitch ? 'ACTIVATED' : 'DEACTIVATED'}`);
            return res.status(200).json({
                status: newKillSwitch ? 'stopped' : 'operational',
                message: `Kill switch ${newKillSwitch ? 'activated' : 'deactivated'}`
            });
        }

        if (path === '/pause' && req.method === 'POST') {
            systemConfig.pausedUntil = Date.now() + (5 * 60 * 1000); // 5 minutes
            console.log('Service paused for 5 minutes');
            return res.status(200).json({ pausedUntil: systemConfig.pausedUntil });
        }

        if (path === '/fallback' && req.method === 'POST') {
            systemConfig.fallbackMode = !systemConfig.fallbackMode;
            return res.status(200).json({ fallbackMode: systemConfig.fallbackMode });
        }

        if (path === '/cache/clear' && req.method === 'POST') {
            // Clear cache logic would go here
            console.log('Response cache cleared');
            return res.status(200).json({ message: 'Cache cleared' });
        }

        if (path === '/ratelimit' && req.method === 'POST') {
            const { limit } = req.body;
            if (limit && limit > 0 && limit <= 100) {
                systemConfig.rateLimit = limit;
                return res.status(200).json({ rateLimit: systemConfig.rateLimit });
            }
            return res.status(400).json({ error: 'Invalid rate limit' });
        }

        if (path === '/block' && req.method === 'POST') {
            const { number } = req.body;
            if (number) {
                systemConfig.blockedNumbers.add(number);
                return res.status(200).json({ blocked: number });
            }
            return res.status(400).json({ error: 'Number required' });
        }

        if (path === '/unblock' && req.method === 'POST') {
            const { number } = req.body;
            if (number) {
                systemConfig.blockedNumbers.delete(number);
                return res.status(200).json({ unblocked: number });
            }
            return res.status(400).json({ error: 'Number required' });
        }

        if (path === '/config' && req.method === 'GET') {
            return res.status(200).json(systemConfig);
        }

        if (path === '/config' && req.method === 'POST') {
            const updates = req.body;
            Object.assign(systemConfig, updates);
            return res.status(200).json(systemConfig);
        }

        if (path === '/metrics' && req.method === 'GET') {
            const dashboardMetrics = await getDashboardMetrics();
            const config = await getSystemConfig();

            // Get recent messages
            const { data: recentMessages } = await supabaseAdmin
                .from('messages')
                .select('id, direction, content, created_at, user_id')
                .order('created_at', { ascending: false })
                .limit(20);

            // Format recent messages for display
            const formattedMessages = recentMessages?.map(msg => ({
                time: new Date(msg.created_at).toLocaleTimeString(),
                phone: `user_${msg.user_id}`,
                text: msg.content ? msg.content.substring(0, 50) + '...' : '[no content]',
                direction: msg.direction
            })) || [];

            return res.status(200).json({
                ...dashboardMetrics,
                burnRate: (parseFloat(dashboardMetrics.costToday) / 24).toFixed(2),
                monthlyProjection: (parseFloat(dashboardMetrics.costToday) * 30).toFixed(2),
                recentMessages: formattedMessages,
                systemStatus: config.kill_switch ? 'stopped' :
                             config.paused_until && new Date(config.paused_until) > new Date() ? 'paused' :
                             config.fallback_mode ? 'fallback' : 'operational',
                config
            });
        }

        if (path === '/messages' && req.method === 'GET') {
            return res.status(200).json({
                messages: metrics.messageLog.slice(-100)
            });
        }

        if (path === '/log' && req.method === 'POST') {
            // Internal endpoint for logging messages
            const { phone, message, cost, type } = req.body;
            const hour = new Date().getHours();

            metrics.messageLog.push({
                time: new Date().toISOString(),
                phone: phone.substr(0, 7) + '****',
                message: message.substring(0, 50),
                type
            });

            if (metrics.messageLog.length > 1000) {
                metrics.messageLog = metrics.messageLog.slice(-500);
            }

            metrics.activeUsers.add(phone);
            metrics.messagestoday++;
            metrics.hourlyVolume[hour]++;

            if (cost) {
                metrics.totalCost += cost.openai || 0;
                metrics.openAICost += cost.openai || 0;
                metrics.twilioCost += cost.twilio || 0;
            }

            return res.status(200).json({ logged: true });
        }

        // 404 for unknown routes
        return res.status(404).json({ error: 'Not found' });

    } catch (error) {
        console.error('Admin API error:', error);
        metrics.errors.push({
            time: new Date().toISOString(),
            error: error.message
        });
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Export config for use by other modules
module.exports.getConfig = () => systemConfig;
module.exports.isBlocked = (phoneNumber) => systemConfig.blockedNumbers.has(phoneNumber);
module.exports.isKillSwitchActive = () => systemConfig.killSwitch;
module.exports.isPaused = () => systemConfig.pausedUntil && systemConfig.pausedUntil > Date.now();
module.exports.isFallbackMode = () => systemConfig.fallbackMode;