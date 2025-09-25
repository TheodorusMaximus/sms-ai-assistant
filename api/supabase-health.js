const { healthCheck, getDashboardMetrics } = require('../lib/supabase');

/**
 * Supabase health check and metrics endpoint
 */
module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const [health, metrics] = await Promise.all([
            healthCheck(),
            getDashboardMetrics()
        ]);

        const statusCode = health.status === 'healthy' ? 200 : 503;

        return res.status(statusCode).json({
            service: 'SMS AI Supabase',
            database: health,
            metrics,
            environment: process.env.NODE_ENV || 'unknown',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Supabase health check failed:', error);

        return res.status(503).json({
            service: 'SMS AI Supabase',
            status: 'error',
            error: error.message,
            environment: process.env.NODE_ENV || 'unknown',
            timestamp: new Date().toISOString()
        });
    }
};