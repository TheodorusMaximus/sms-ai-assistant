const OpenAI = require('openai');
const { selectPersona } = require('./personas');
const { truncateForSMS } = require('./utils');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Simple in-memory cache for responses (replace with Redis in production)
 */
const responseCache = new Map();

/**
 * Generate AI response based on user message and persona
 * @param {string} userMessage - The user's message
 * @param {string} hashedPhone - Hashed phone number for context
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - AI response
 */
async function generateResponse(userMessage, hashedPhone, options = {}) {
  const startTime = Date.now();

  try {
    // Check cache for common queries
    const cacheKey = `${userMessage.toLowerCase().trim()}`;
    if (responseCache.has(cacheKey)) {
      console.log('Cache hit for query:', cacheKey.substring(0, 20));
      return responseCache.get(cacheKey);
    }

    // Select appropriate persona
    const persona = selectPersona(hashedPhone, userMessage);

    // Prepare conversation context
    const messages = [
      {
        role: "system",
        content: persona.system_prompt
      },
      {
        role: "user",
        content: userMessage
      }
    ];

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective choice
      messages: messages,
      max_tokens: 150, // Keep responses concise
      temperature: 0.7, // Slightly creative but consistent
      frequency_penalty: 0.2, // Reduce repetition
    });

    let aiResponse = completion.choices[0].message.content;

    // Truncate for SMS if needed
    const { text: truncatedText, needsMore } = truncateForSMS(aiResponse, 150);

    if (needsMore) {
      // Store full response for "MORE" command
      responseCache.set(`MORE:${hashedPhone}`, aiResponse);
    }

    // Cache response for common queries
    if (userMessage.length < 50 && !needsMore) {
      responseCache.set(cacheKey, truncatedText);

      // Clean cache periodically (simple LRU)
      if (responseCache.size > 1000) {
        const firstKey = responseCache.keys().next().value;
        responseCache.delete(firstKey);
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`AI response generated in ${responseTime}ms`);

    return truncatedText;

  } catch (error) {
    console.error('AI response generation failed:', error.message);

    // Fallback response
    return getFallbackResponse(userMessage);
  }
}

/**
 * Handle "MORE" command to get full response
 * @param {string} hashedPhone - Hashed phone number
 * @returns {string} - Full response or error message
 */
function getMoreResponse(hashedPhone) {
  const fullResponse = responseCache.get(`MORE:${hashedPhone}`);

  if (fullResponse) {
    // Clean up the cache entry
    responseCache.delete(`MORE:${hashedPhone}`);
    return fullResponse;
  }

  return "Sorry, I don't have a longer response available. Please ask your question again! 🤖";
}

/**
 * Fallback response when AI fails
 * @param {string} userMessage - Original user message
 * @returns {string} - Fallback response
 */
function getFallbackResponse(userMessage) {
  const fallbacks = [
    "I'm having trouble right now. Could you try asking again in a moment? 🤖",
    "Sorry, I couldn't process that. Could you rephrase your question? 💭",
    "I'm experiencing technical difficulties. Please try again shortly! ⚙️"
  ];

  // Simple keyword-based fallbacks
  const msg = userMessage.toLowerCase();

  if (msg.includes('weather')) {
    return "I can't check weather right now. Try a local weather app or website! ☀️";
  }

  if (msg.includes('recipe')) {
    return "I can't access recipes right now. Try googling '[food name] recipe'! 🍳";
  }

  if (msg.includes('scam')) {
    return "When in doubt, don't click links or share personal info. Trust your instincts! 🛡️";
  }

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Moderate content for safety
 * @param {string} message - User message
 * @returns {Promise<boolean>} - True if content is safe
 */
async function moderateContent(message) {
  try {
    const moderation = await openai.moderations.create({
      input: message
    });

    return !moderation.results[0].flagged;
  } catch (error) {
    console.error('Content moderation failed:', error.message);
    // If moderation fails, err on side of caution but allow message
    return true;
  }
}

/**
 * Get inappropriate content response
 * @returns {string} - Response for inappropriate content
 */
function getInappropriateContentResponse() {
  return "I can't help with that request. Please ask me something else I can assist with! 😊";
}

module.exports = {
  generateResponse,
  getMoreResponse,
  moderateContent,
  getInappropriateContentResponse
};