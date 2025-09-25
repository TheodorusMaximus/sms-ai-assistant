/**
 * Health check endpoint for monitoring
 */
exports.handler = async (event, context) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NETLIFY_DEPLOY_ID || 'development',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
      twilio: (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ? 'configured' : 'missing'
    }
  };

  // Check if critical environment variables are set
  const criticalEnvVars = ['OPENAI_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
  const missingVars = criticalEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    health.status = 'degraded';
    health.missing_config = missingVars;
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(health, null, 2)
  };
};