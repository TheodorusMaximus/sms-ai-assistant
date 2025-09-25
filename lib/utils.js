const crypto = require('crypto');

/**
 * Hash phone number for privacy while maintaining uniqueness
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} - Hashed phone number
 */
function hashPhoneNumber(phoneNumber) {
  const salt = process.env.ENCRYPTION_KEY || 'default-salt-change-in-production';
  return crypto
    .createHash('sha256')
    .update(phoneNumber + salt)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Truncate response to SMS-friendly length
 * @param {string} text - Full response text
 * @param {number} maxLength - Maximum characters (default 160)
 * @returns {Object} - {text, needsMore}
 */
function truncateForSMS(text, maxLength = 150) {
  if (text.length <= maxLength) {
    return { text, needsMore: false };
  }

  // Try to break at sentence boundary
  const sentences = text.split('. ');
  let truncated = '';

  for (const sentence of sentences) {
    if ((truncated + sentence + '. ').length <= maxLength - 15) { // Reserve space for "...send MORE"
      truncated += sentence + '. ';
    } else {
      break;
    }
  }

  if (truncated.length === 0) {
    // If even first sentence is too long, hard truncate
    truncated = text.substring(0, maxLength - 15);
  }

  return {
    text: truncated.trim() + '...(send MORE)',
    needsMore: true
  };
}

/**
 * Add TCPA compliance message
 * @param {string} response - AI response
 * @returns {string} - Response with compliance
 */
function addComplianceMessage(response) {
  // Only add compliance message occasionally to avoid spam
  const shouldAddCompliance = Math.random() < 0.1; // 10% of messages

  if (shouldAddCompliance) {
    return response + '\n\nReply STOP to end. Msg&data rates may apply.';
  }

  return response;
}

/**
 * Check if message is a command (HELP, STOP, MORE, etc.)
 * @param {string} message - User message
 * @returns {Object} - {isCommand, command, args}
 */
function parseCommand(message) {
  const cleanMessage = message.trim().toUpperCase();

  const commands = {
    'STOP': 'unsubscribe',
    'HELP': 'help',
    'MORE': 'more',
    'START': 'start',
    'STATUS': 'status',
    'CONFIG': 'config'
  };

  for (const [cmd, action] of Object.entries(commands)) {
    if (cleanMessage.startsWith(cmd)) {
      return {
        isCommand: true,
        command: action,
        args: cleanMessage.substring(cmd.length).trim()
      };
    }
  }

  return { isCommand: false, command: null, args: null };
}

/**
 * Generate help message
 * @returns {string} - Help message
 */
function getHelpMessage() {
  return `Hi! I'm your AI text assistant. Just text me questions like:
• "Weather today?"
• "Recipe for soup?"
• "Is this email a scam?"

Commands:
• HELP - This message
• STOP - End service
• MORE - Get full answer

Text any question to get started! 🤖`;
}

/**
 * Simple rate limiting check
 * @param {string} phoneNumber - Hashed phone number
 * @returns {boolean} - Whether request is allowed
 */
function checkRateLimit(phoneNumber) {
  // TODO: Implement proper rate limiting with Redis or similar
  // For MVP, allow all requests
  return true;
}

/**
 * Log interaction for analytics (privacy-preserving)
 * @param {string} hashedPhone - Hashed phone number
 * @param {string} messageType - Type of message (query, command, etc.)
 * @param {number} responseTime - Response time in ms
 */
function logInteraction(hashedPhone, messageType, responseTime) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user: hashedPhone,
    type: messageType,
    responseTime: responseTime,
    // Don't log actual message content for privacy
  };

  console.log('Interaction:', JSON.stringify(logEntry));
}

module.exports = {
  hashPhoneNumber,
  truncateForSMS,
  addComplianceMessage,
  parseCommand,
  getHelpMessage,
  checkRateLimit,
  logInteraction
};