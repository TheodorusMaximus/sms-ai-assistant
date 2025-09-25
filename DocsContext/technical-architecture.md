# Technical Architecture

## System Overview
SMS-first AI assistant using open-source LLM personas integrated with Twilio for message handling.

## Core Technology Stack

### SMS Infrastructure
- **Primary**: Twilio SMS API
  - Reliability across rural carriers
  - 95% delivery rates
  - Built-in compliance tools (TCPA/10DLC)
- **Backup**: Plivo or other SMS gateways for redundancy

### LLM Backend Options
- **Open Source**: Mistral 7B, Llama 3.1 (via Hugging Face)
- **Commercial**: OpenAI GPT-4o-mini, Anthropic Claude
- **Cost target**: $0.001-0.005 per SMS exchange

### Persona Framework
- **Primary**: SillyTavern/Tavern AI (open-source Character.AI alternative)
- **Integration**: LangChain for agent orchestration
- **Customization**: Prompt templates for different user cohorts
  - "Warm Grandma" for elderly users
  - "Practical Contractor" for rural workers

### Hosting & Deployment
- **MVP**: Vercel/Heroku free tier
- **Scale**: AWS Lightsail ($3.50/mo VPS)
- **Database**: Redis for user context/preferences
- **Monitoring**: Twilio Analytics + Google Analytics

## Data Flow Architecture

```
Incoming SMS → Twilio → Webhook → LLM Processing → Response Generation → Outbound SMS
```

### Detailed Flow
1. User sends SMS to short code/phone number
2. Twilio receives message, triggers webhook
3. Python/Node.js server processes:
   - Parse message content
   - Identify user (phone number)
   - Apply appropriate persona prompt
   - Query LLM with context
   - Format response (<160 chars preferred)
4. Send response back via Twilio
5. Handle "MORE" requests for longer responses

## Compliance & Privacy

### Regulatory Compliance
- **TCPA**: Express written consent required
- **10DLC Registration**: Business SMS registration ($4-15 one-time)
- **CTIA Guidelines**: Include STOP/HELP in messages
- **Content Restrictions**: Avoid SHAFT (Sex, Hate, Alcohol, Firearms, Tobacco)

### Privacy Design
- **Data Minimization**: No PII storage beyond operational needs
- **Anonymization**: Hash phone numbers for analytics
- **Retention**: Message content not stored permanently
- **Security**: HTTPS for webhooks, encrypted database connections

## Cost Structure (10K Users, 300 msgs/mo each)

### SMS Costs
- Twilio: $0.0075/outbound message (US)
- Inbound: $0.0075/message
- Total: ~$22K/mo for 3M messages (plus 10-20% carrier surcharges)

### AI Processing
- OpenAI: $0.002/1K tokens for short responses
- Open source: $0.001-0.003/query via APIs
- Monthly: ~$1-3K for LLM processing

### Infrastructure
- Short code rental: $1K-1.5K/mo
- Hosting: $100-500/mo
- Database: $50-200/mo

### Total Monthly Costs at Scale: ~$25-30K

## Scalability Considerations

### Performance Targets
- Response time: <10 seconds
- Delivery rate: >95% (rural areas)
- Uptime: 99.9%

### Scaling Bottlenecks
1. **SMS Rate Limits**: Carrier-imposed limits on message volume
2. **LLM Processing**: Need caching and response optimization
3. **Cost Scaling**: SMS costs scale linearly with usage

### Optimization Strategies
- **Caching**: Common queries cached for instant responses
- **Fallback**: Rule-based responses for LLM failures
- **Load Balancing**: Multiple LLM providers for redundancy
- **Message Optimization**: Smart truncation and "MORE" handling

## Development Phases

### Phase 0: MVP (2-4 weeks)
- Basic Twilio SMS webhook
- Simple LLM integration (OpenAI/Mistral)
- Static persona prompts
- No user accounts or billing

### Phase 1: Enhanced Messaging (1-2 weeks)
- iMessage integration (Apple Messages for Business)
- Improved message formatting
- Error handling and fallbacks

### Phase 2: Monetization (2-3 weeks)
- Stripe payment integration
- Usage tracking and billing
- User preference storage (Redis)
- Family sponsorship system

### Phase 3: Configurable Agents (3-4 weeks)
- Text-based configuration ("CONFIG: You are my...")
- Multiple persona switching
- User-specific memory and context
- SillyTavern integration for rich personas

### Phase 4: Ecosystem Expansion (4-6 weeks)
- API for third-party integrations
- Advanced agent management
- Multi-channel support (SMS + iMessage + future)

### Phase 5: Rich Experience (2-3 weeks)
- iMessage-specific features (stickers, effects)
- Voice integration (Twilio Voice API)
- Media handling (images, locations)

## Integration Points

### External APIs
- **Weather**: OpenWeatherMap (free tier)
- **Maps**: Google Maps API (text directions)
- **Scam Detection**: FTC data + LLM prompts
- **Health Info**: WebMD summaries (non-medical advice)

### Payment Processing
- **Primary**: Stripe for subscriptions
- **Prepaid**: Custom code generation system
- **Family Plans**: Multi-user billing management

### Analytics & Monitoring
- **Usage**: Twilio Analytics dashboard
- **Business**: Google Analytics for conversion tracking
- **Performance**: Custom logging for response times
- **Errors**: Sentry or similar for error tracking

## Security Considerations

### Input Validation
- SMS content sanitization
- Rate limiting per phone number
- Abuse detection and blocking

### Data Protection
- Phone number hashing
- No sensitive data storage
- Regular security audits

### Operational Security
- Secure webhook endpoints (HTTPS only)
- API key rotation policies
- Access logging and monitoring