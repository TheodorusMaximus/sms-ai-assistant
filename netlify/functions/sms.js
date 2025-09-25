const twilio = require('twilio');
const path = require('path');

// Import our existing modules
const { generateResponse, getMoreResponse, moderateContent, getInappropriateContentResponse } = require('../../lib/ai');
const { hashPhoneNumber, parseCommand, getHelpMessage, checkRateLimit, logInteraction, addComplianceMessage } = require('../../lib/utils');

/**
 * Netlify function handler for SMS webhooks
 */
exports.handler = async (event, context) => {
  const startTime = Date.now();

  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse the form data from Twilio
    const params = new URLSearchParams(event.body);
    const Body = params.get('Body');
    const From = params.get('From');
    const To = params.get('To');

    if (!Body || !From) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    console.log(`SMS received from ${From}: ${Body.substring(0, 50)}...`);

    // Hash phone number for privacy
    const hashedPhone = hashPhoneNumber(From);

    // Check rate limiting
    if (!checkRateLimit(hashedPhone)) {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('You\'re sending messages too quickly. Please wait a moment before trying again.');

      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'text/xml'
        },
        body: twiml.toString()
      };
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/xml'
      },
      body: twiml.toString()
    };

  } catch (error) {
    console.error('SMS handler error:', error);

    // Return error response to user
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, I\'m experiencing technical difficulties. Please try again in a moment! 🤖');

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/xml'
      },
      body: twiml.toString()
    };
  }
};

/**
 * Handle command messages (HELP, STOP, MORE, etc.)
 */
async function handleCommand(command, args, hashedPhone) {
  switch (command) {
    case 'help':
      return getHelpMessage();

    case 'stop':
    case 'unsubscribe':
      return 'You have been unsubscribed. Text START to resume service. We\'re sorry to see you go! 👋';

    case 'start':
      return 'Welcome back! I\'m here to help with questions, directions, recipes, and more. What can I help you with? 🤖';

    case 'more':
      return getMoreResponse(hashedPhone);

    case 'status':
      return 'Service is active. Text HELP for commands or just ask me anything! ✅';

    case 'config':
      return 'Configuration coming soon! For now, I adapt my responses to your questions automatically. 🔧';

    default:
      return 'Unknown command. Text HELP for available commands. 💡';
  }
}