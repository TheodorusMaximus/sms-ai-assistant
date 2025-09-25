# Product Roadmap

## Vision Statement
Build a text-first AI assistant that serves underserved populations through the universal interface of SMS, evolving from basic queries to rich, personalized experiences while maintaining zero-friction access.

## Product Philosophy
- **Medium over Model**: Innovation is in SMS delivery, not AI sophistication
- **Simplicity First**: Every feature must maintain ease of use
- **Inclusive Access**: Works on any phone, any network condition
- **Family-Centered**: Designed for gifting and sponsorship

## Phase 0: Barebones MVP (Weeks 1-4)
**User Story**: "As a user, I want to text a question and get an answer back when I don't have bandwidth."

### Core Features
✅ SMS support via Twilio number
✅ Stateless query → AI answer flow
✅ Short text responses with "MORE" paging
✅ Basic error fallback messages
❌ No personalization
❌ No payments
❌ No app UI

### Technical Implementation
- Basic webhook: SMS → LLM → SMS response
- Simple prompt templates for different query types
- Response truncation with pagination
- Compliance messaging (STOP/HELP)

### Success Metrics
- 100 beta users from local community
- <10 second response time
- >90% message delivery rate
- 70% positive feedback on usefulness

### Launch Checklist
- [ ] Buy Twilio number and configure webhook
- [ ] Build basic LLM integration (OpenAI/Mistral)
- [ ] Test SMS functionality on multiple carriers
- [ ] Deploy to production environment
- [ ] Run 10-person family/friends beta test

## Phase 1: iMessage Layer (Weeks 5-6)
**User Story**: "As an iPhone user, I want to use iMessage so replies look natural, not just SMS."

### New Features
- Apple Messages for Business integration
- Enhanced message formatting for iMessage users
- Rich text capabilities where supported
- Seamless fallback to SMS for non-iPhone users

### Technical Implementation
- Apple Business Connect setup
- iMessage API integration
- Device detection and routing logic
- Message format optimization per platform

### Success Metrics
- 30% of users are iPhone/iMessage users
- Higher engagement rates on iMessage vs SMS
- Maintained response times across both platforms
- No increase in support tickets

## Phase 2: Payments + Monetization (Weeks 7-10)
**User Story**: "As a user, I want unlimited queries so I can use this daily."

### New Features
- **Free Tier**: 10 messages/day for trials
- **Paid Tiers**: Basic ($4.99) and Unlimited ($9.99)
- **Family Sponsorship**: Adult children can pay for elderly parents
- **Prepaid System**: Gift cards and scratch-off codes
- **Usage Tracking**: Per-phone-number limits and overages

### Technical Implementation
- Stripe integration for subscription billing
- Phone number authentication and tracking
- Usage counters and billing logic
- Prepaid code generation and validation system
- Family account linking and management

### Business Metrics
- 15% free-to-paid conversion rate
- 40% family sponsorship adoption
- $10 ARPU (average revenue per user)
- <5% monthly churn rate

### Monetization Features
- Automatic upgrade prompts after free tier exhaustion
- Gift card distribution through pharmacy partnerships
- Family dashboard for sponsors (text-based)

## Phase 3: Configurable Agents (Text-First) (Weeks 11-16)
**User Story**: "As a user, I want to tell my assistant how to behave, just by texting it."

### New Features
- **Text Configuration**: "CONFIG: You are my health advisor, warm and encouraging"
- **Persona Switching**: Multiple saved configurations per user
- **Context Memory**: Remember user preferences and past conversations
- **Agent Templates**: Pre-built personas for common use cases

### Technical Implementation
- SillyTavern/Tavern AI integration for rich personas
- Redis-based user preference storage
- Dynamic prompt generation based on configurations
- Configuration command parsing and validation

### User Experience
```
User: "CONFIG: Be my rural contractor buddy, short answers only"
System: "Got it! I'm now your contractor buddy. Ask me anything about tools, materials, or job sites."

User: "How much concrete for 10x10 pad?"
System: "About 1.3 yards of concrete. Add 10% extra - so 1.5 yards total. 4-inch thick assumed."

User: "Switch to grandma mode"
System: "Switching to Grandma Helper. I'm here to help with recipes, health tips, and daily questions, dear."
```

### Advanced Features
- **Agent Sharing**: Text-based import/export of configurations
- **Sponsor Configuration**: Adult children can set up agents for parents
- **Context Persistence**: Remember conversation threads for better responses

## Phase 4: Ecosystem Expansion (Weeks 17-24)
**User Story**: "As a power user, I want advanced agent management while keeping everything text-based."

### Option A: Minimal App Approach
- Simple companion app for complex agent creation
- All engagement still through SMS/iMessage
- App is optional enhancement, not requirement

### Option B: Pure Text Interface (Preferred)
- Advanced text commands for agent management
- "AGENTS" to list available personas
- "SWITCH TO finance-bot" for quick switching
- "SHARE agent-name" to export configurations
- "IMPORT code-123" to add community-created agents

### Ecosystem Features
- **Community Agents**: Library of user-created personas
- **Professional Integrations**: Doctor-approved health agents, financial advisors
- **API Access**: Third-party integrations while maintaining text interface
- **Bulk Management**: Tools for managing multiple family lines

### Business Model Evolution
- **Agent Slots**: Premium users get more concurrent personas
- **Professional Agents**: Certified personas with subscription fees
- **White Label**: B2B offering for healthcare, financial services
- **API Revenue**: Partner integrations and data licensing

## Phase 5: Rich iMessage Experience (Weeks 25-28)
**User Story**: "As an iPhone user, I want my AI to use the full richness of iMessage features."

### Rich Features
- **iMessage Stickers**: Custom AI-generated stickers based on conversation
- **Text Effects**: Emphasis, animations for important information
- **Quick Replies**: Suggested response buttons
- **Location Sharing**: Context-aware responses with location data
- **Voice Messages**: Text-to-speech for elderly users with vision issues

### Advanced Capabilities
- **Digital Touch**: Haptic feedback for important alerts
- **Handwritten Text**: Support for Apple Pencil input
- **App Integrations**: Weather, calendar, photos within iMessage
- **Group Conversations**: Multi-person AI assistance

### Accessibility Features
- **Large Text Support**: Automatic formatting for accessibility settings
- **Voice Control**: Siri integration for hands-free operation
- **Screen Reader**: Optimized responses for VoiceOver users
- **Contrast Options**: High-contrast mode for low-vision users

## Off-Grid Wilderness Safety Extension

### Wilderness Guardian AI
Parallel product for off-grid users with satellite messaging (InReach, SPOT devices).

#### Core Features
- **Satellite SMS Integration**: Via Garmin InReach API
- **Safety-Focused Personas**: "Wilderness Ranger", "Survival Expert", "First Aid Helper"
- **Emergency Protocols**: Clear escalation to human help/SOS
- **Location Context**: GPS-aware responses for regional safety info

#### Key Differences from Main Product
- **Higher Cost Tolerance**: Safety is premium value proposition
- **Professional Content**: Vetted survival and safety information
- **Family Monitoring**: Real-time updates to emergency contacts
- **Seasonal Configs**: Automatic winter/summer safety adjustments

## Long-Term Vision (12+ Months)

### Platform Evolution
- **Multi-Modal**: Voice, image, video support while keeping text primary
- **Global Expansion**: International SMS networks and languages
- **Healthcare Integration**: HIPAA-compliant health assistance
- **Financial Services**: Simple banking and bill-pay assistance
- **Smart Home**: Text-based home automation for elderly users

### Business Scale
- **100K+ Users**: Multi-state coverage with local community partnerships
- **B2B Expansion**: Healthcare systems, senior living facilities
- **Government Partnerships**: Medicare Advantage plans, rural broadband initiatives
- **International Markets**: Canada, UK, Australia with similar demographics

### Technology Advancement
- **Edge Computing**: Local processing for faster responses
- **Federated Learning**: Personalization without privacy compromise
- **Predictive Assistance**: Proactive helpful messages
- **Cross-Platform Sync**: Seamless experience across all devices

## Risk Mitigation & Contingencies

### Technical Risks
- **Carrier Blocking**: Multiple SMS provider relationships
- **LLM Costs**: Open-source model optimization and caching
- **Scalability**: Auto-scaling infrastructure and cost monitoring

### Business Risks
- **Market Education**: Heavy investment in user education materials
- **Regulatory Changes**: TCPA compliance and privacy law adaptation
- **Competition**: First-mover advantage and community moat building

### Operational Risks
- **Support Scaling**: Human support tier and self-service tools
- **Quality Control**: Content moderation and response accuracy monitoring
- **Fraud Prevention**: Usage pattern analysis and abuse detection