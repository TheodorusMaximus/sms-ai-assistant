# SMS AI Assistant MVP

A serverless SMS-first AI assistant designed for underserved populations (elderly, rural users) with zero-friction access via text messaging.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Twilio account
- OpenAI API key
- Vercel account (for deployment)

### Local Development

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Start development server:**
```bash
npm run dev
```

4. **Test the webhook:**
```bash
curl -X POST http://localhost:3000/api/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Hello&From=%2B15551234567"
```

## 🔧 Configuration

### Required Environment Variables

```bash
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# OpenAI
OPENAI_API_KEY=your_openai_key

# Security
ENCRYPTION_KEY=your_32_char_encryption_key
```

### Twilio Setup

1. **Get a phone number** from Twilio Console
2. **Configure webhook** to point to your deployed URL:
   - Webhook URL: `https://your-app.vercel.app/api/sms`
   - HTTP Method: POST
3. **Enable SMS** on your Twilio phone number

## 📱 Features

### Core MVP Features
- ✅ SMS message processing
- ✅ AI responses via OpenAI GPT-4o-mini
- ✅ Persona system (Warm Grandma, Practical Contractor, General Assistant)
- ✅ Response truncation with "MORE" command
- ✅ Basic commands (HELP, STOP, START, MORE, STATUS)
- ✅ Content moderation
- ✅ TCPA compliance messaging
- ✅ Privacy-preserving phone number hashing

### Planned Features (Phase 2+)
- ⏳ Apple Messages for Business integration
- ⏳ User preference storage
- ⏳ Advanced persona configuration
- ⏳ Family sponsorship billing
- ⏳ Usage analytics dashboard

## 🎯 Target Users

### Primary Cohorts
1. **Grandparents** - Health questions, recipes, scam detection
2. **Rural Workers** - Directions, conversions, weather when apps fail
3. **Caregivers** - Adult children managing elderly parents' access

### Sample Interactions

**Warm Grandma Persona:**
```
User: "Recipe for chicken soup?"
Assistant: "Easy chicken soup: Boil chicken, add carrots, celery, noodles. Season with love! 🍲"
```

**Practical Contractor Persona:**
```
User: "Convert 10 feet to meters"
Assistant: "10 feet = 3.05 meters. Round to 3 meters for most jobs."
```

## 🏗 Architecture

### Serverless Stack
- **Frontend**: Static site (future)
- **Backend**: Vercel serverless functions
- **SMS**: Twilio Programmable Messaging
- **AI**: OpenAI GPT-4o-mini
- **Database**: In-memory cache (MVP), Redis (production)

### Request Flow
```
SMS → Twilio → Webhook → AI Processing → Response → SMS
```

### File Structure
```
├── api/
│   ├── sms.js          # Main SMS webhook handler
│   ├── imessage.js     # iMessage handler (placeholder)
│   └── health.js       # Health check endpoint
├── lib/
│   ├── ai.js           # OpenAI integration & response generation
│   ├── personas.js     # AI persona definitions
│   └── utils.js        # Utility functions
├── package.json
├── vercel.json         # Vercel configuration
└── .env.example        # Environment variables template
```

## 🚀 Deployment

### Deploy to Vercel

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel
```

3. **Set environment variables:**
```bash
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add OPENAI_API_KEY
vercel env add ENCRYPTION_KEY
```

4. **Update Twilio webhook URL** to your deployed endpoint

## 📊 Monitoring

### Health Check
```bash
curl https://your-app.vercel.app/api/health
```

### Log Monitoring
- Check Vercel dashboard for function logs
- Monitor response times and error rates
- Track user interaction patterns (privacy-preserving)

## 🛡 Privacy & Security

### Privacy Features
- Phone numbers are hashed with salt
- No message content stored permanently
- User interactions logged without personal data
- Content moderation for inappropriate messages

### TCPA Compliance
- STOP/START commands handled automatically
- Compliance messages added periodically
- Opt-out respected immediately

## 💰 Business Model (Future)

### Pricing Tiers
- **Free**: 10 messages/day trial
- **Basic**: $4.99/mo (300 messages)
- **Family Sponsor**: $7.99/mo per line
- **Unlimited**: $9.99/mo

### Revenue Projections
- Break-even: ~500 active users
- Target: $50K MRR by month 12

## 🧪 Testing

### Manual Testing
```bash
# Test SMS webhook locally
curl -X POST http://localhost:3000/api/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Weather today?&From=%2B15551234567"

# Test help command
curl -X POST http://localhost:3000/api/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=HELP&From=%2B15551234567"
```

### Test Cases
- Basic Q&A responses
- Command handling (HELP, STOP, MORE)
- Long response truncation
- Content moderation
- Error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
- Create an issue in this repository
- Check Vercel logs for deployment issues
- Verify Twilio webhook configuration

---

**"If you can text, you can get answers."** 📱🤖