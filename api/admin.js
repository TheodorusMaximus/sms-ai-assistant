const crypto = require('crypto');

// In-memory store for admin settings and metrics (use Redis in production)
let systemConfig = {
    killSwitch: false,
    fallbackMode: false,
    rateLimit: 10,
    moderationEnabled: true,
    aiModel: 'gpt-4o-mini',
    maxTokens: 150,
    blockedNumbers: new Set(),
    pausedUntil: null
};

let metrics = {
    messagestoday: 0,
    activeUsers: new Set(),
    totalCost: 0,
    openAICost: 0,
    twilioCost: 0,
    messageLog: [],
    hourlyVolume: new Array(24).fill(0),
    errors: []
};

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
            systemConfig.killSwitch = !systemConfig.killSwitch;
            console.log(`EMERGENCY: Kill switch ${systemConfig.killSwitch ? 'ACTIVATED' : 'DEACTIVATED'}`);
            return res.status(200).json({
                status: systemConfig.killSwitch ? 'stopped' : 'operational',
                message: `Kill switch ${systemConfig.killSwitch ? 'activated' : 'deactivated'}`
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
            // Calculate real-time metrics
            const now = new Date();
            const hour = now.getHours();

            return res.status(200).json({
                activeUsers: metrics.activeUsers.size,
                messagesToday: metrics.messagestoday,
                costToday: metrics.totalCost.toFixed(2),
                openAICost: metrics.openAICost.toFixed(2),
                twilioCost: metrics.twilioCost.toFixed(2),
                burnRate: (metrics.totalCost / (hour + 1)).toFixed(2),
                monthlyProjection: (metrics.totalCost * 30).toFixed(2),
                avgResponseTime: Math.floor(Math.random() * 2000) + 500, // Placeholder
                hourlyVolume: metrics.hourlyVolume,
                recentMessages: metrics.messageLog.slice(-20),
                systemStatus: systemConfig.killSwitch ? 'stopped' :
                             systemConfig.pausedUntil > Date.now() ? 'paused' :
                             systemConfig.fallbackMode ? 'fallback' : 'operational',
                errors: metrics.errors.slice(-10)
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