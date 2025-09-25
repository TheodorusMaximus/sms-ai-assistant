/**
 * Apple Messages for Business webhook handler
 * This will be implemented in Phase 2 after SMS MVP is working
 * For now, this is a placeholder that redirects to SMS handler
 */

const smsHandler = require('./sms');

module.exports = async function handler(req, res) {
  // For MVP, route iMessage requests to SMS handler
  // In Phase 2, this will be replaced with proper Apple Messages for Business integration

  console.log('iMessage request received, routing to SMS handler');

  // Add a header to identify this as an iMessage request
  req.isIMessage = true;

  // Route to SMS handler for now
  return await smsHandler(req, res);
};