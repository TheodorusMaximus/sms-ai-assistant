const twilio = require('twilio');
const { generateResponse, getMoreResponse, moderateContent, getInappropriateContentResponse } = require('../lib/ai');
const { hashPhoneNumber, parseCommand, getHelpMessage, checkRateLimit, logInteraction, addComplianceMessage } = require('../lib/utils');

/**
 * Twilio SMS webhook handler
 * This function processes incoming SMS messages and generates AI responses
 */
module.exports = async function handler(req, res) {
  const startTime = Date.now();

  try {
    // Verify this is a POST request from Twilio
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract Twilio parameters
    const { Body, From, To } = req.body;

    if (!Body || !From) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Hash phone number for privacy
    const hashedPhone = hashPhoneNumber(From);

    // Check rate limiting
    if (!checkRateLimit(hashedPhone)) {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('You\'re sending messages too quickly. Please wait a moment before trying again.');

      res.setHeader('Content-Type', 'text/xml');
      return res.status(429).send(twiml.toString());
    }

    // Parse message for commands
    const { isCommand, command, args } = parseCommand(Body);

    let responseText;

    if (isCommand) {
      responseText = await handleCommand(command, args, hashedPhone);
      logInteraction(hashedPhone, `command:${command}`, Date.now() - startTime);
    } else {
      // Check content moderation
      const isContentSafe = await moderateContent(Body);

      if (!isContentSafe) {
        responseText = getInappropriateContentResponse();
        logInteraction(hashedPhone, 'moderated', Date.now() - startTime);
      } else {
        // Generate AI response
        responseText = await generateResponse(Body, hashedPhone);
        logInteraction(hashedPhone, 'query', Date.now() - startTime);
      }
    }

    // Add compliance message occasionally
    responseText = addComplianceMessage(responseText);

    // Create Twilio response
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(responseText);

    // Log successful interaction
    console.log(`SMS processed for user ${hashedPhone} in ${Date.now() - startTime}ms`);

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());

  } catch (error) {
    console.error('SMS handler error:', error);

    // Return error response to user
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, I\'m experiencing technical difficulties. Please try again in a moment! 🤖');

    res.setHeader('Content-Type', 'text/xml');
    return res.status(500).send(twiml.toString());
  }
};

/**
 * Handle command messages (HELP, STOP, MORE, etc.)
 * @param {string} command - Command type
 * @param {string} args - Command arguments
 * @param {string} hashedPhone - Hashed phone number
 * @returns {Promise<string>} - Command response
 */
async function handleCommand(command, args, hashedPhone) {
  switch (command) {
    case 'help':
      return getHelpMessage();

    case 'stop':
    case 'unsubscribe':
      // TODO: Implement unsubscribe logic
      return 'You have been unsubscribed. Text START to resume service. We\'re sorry to see you go! 👋';

    case 'start':
      // TODO: Implement resubscribe logic
      return 'Welcome back! I\'m here to help with questions, directions, recipes, and more. What can I help you with? 🤖';

    case 'more':
      return getMoreResponse(hashedPhone);

    case 'status':
      // TODO: Implement user status/usage info
      return 'Service is active. Text HELP for commands or just ask me anything! ✅';

    case 'config':
      // TODO: Implement persona configuration
      return 'Configuration coming soon! For now, I adapt my responses to your questions automatically. 🔧';

    default:
      return 'Unknown command. Text HELP for available commands. 💡';
  }
}