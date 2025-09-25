# Production Technology Stack & Package Recommendations 2025

## Database & Storage Solutions

### Primary Database: PostgreSQL
**Recommended Package**: `pg` (node-postgres) with built-in pooling
```bash
npm install pg
```

**Why**: Most established and widely-used PostgreSQL client for Node.js. Built-in connection pooling with automatic error handling. The pool has a convenience method to run queries on any available client in the pool.

**Alternative**: `postgres` (Postgres.js) for modern high-performance applications
```bash
npm install postgres
```

**Enterprise Stack**: NestJS + TypeORM + PostgreSQL provides structured code, solid ORM support, and production-ready features like connection pooling, transaction management, and schema validation.

### Cache Layer: Redis
**Recommended Package**: `ioredis` for production
```bash
npm install ioredis
```

**Configuration**:
```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});
```

### Time-Series Database: InfluxDB
**Recommended Package**: `@influxdata/influxdb3-client` (latest for InfluxDB 3.x)
```bash
npm install @influxdata/influxdb3-client
```

**Note**: InfluxDB 3 Core is GA as of April 2025! Key enhancements in InfluxDB 3.4 include offline token generation and configurable license selection.

**Alternative**: `@influxdata/influxdb-client` for InfluxDB v2

## Message Queue & Job Processing

### Queue System: BullMQ (2025 Recommended)
**Recommended Package**: `bullmq`
```bash
npm install bullmq
```

**Why**: BullMQ is the modern rewrite of Bull by the same authors, with TypeScript support, better performance, and active development. Features include:
- Multiple concurrent jobs with horizontal scaling
- Job retrying and prioritization
- Rate limiting per queue
- Reliability through Redis persistence

**Legacy Option**: `bull` (maintenance mode, only bug fixes)

**Configuration**:
```javascript
import { Queue, Worker } from 'bullmq';

const messageQueue = new Queue('sms-processing', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

const worker = new Worker('sms-processing', async (job) => {
  // Process job
}, {
  connection: {
    host: 'localhost',
    port: 6379,
  },
  concurrency: 5, // Adjust based on workload
});
```

## Event Sourcing & CQRS

### Event Store: EventStoreDB
**Recommended Package**: `@eventstore/db-client`
```bash
npm install @eventstore/db-client
```

**Alternative**: Custom implementation with PostgreSQL + `oskardudycz/EventSourcing.NodeJS`

**Best Resource**: [EventSourcing.NodeJS](https://github.com/oskardudycz/EventSourcing.NodeJS) - Most comprehensive examples and tutorials for Event Sourcing in Node.js with TypeScript patterns.

**Modern Alternative**: KurrentDB with `kurrent-io/KurrentDB-Client-NodeJS` - purpose-built for event sourcing with individually indexed streams.

## OpenAI Integration & Token Management

### Token Counting & Cost Tracking
**Recommended Package**: `gpt-tokenizer`
```bash
npm install gpt-tokenizer
```

**Why**: Fastest tokenizer implementation on NPM (as of v2.4.0), supports all current OpenAI models, built-in cost estimation.

**Alternative**: `js-tiktoken` for official OpenAI implementation
```bash
npm install js-tiktoken
```

**Usage**:
```javascript
import { encode, decode } from 'gpt-tokenizer';

const tokens = encode('Hello, world!');
console.log('Token count:', tokens.length);

// Cost estimation
import { estimateCost } from 'gpt-tokenizer';
const cost = estimateCost(tokens.length, 'gpt-4o-mini');
```

### Current Model Encodings (2025):
- `o200k_base`: gpt-4o, gpt-4o-mini
- `cl100k_base`: gpt-4-turbo, gpt-4, gpt-3.5-turbo
- `p50k_base`: Codex models, text-davinci-002/003

## Monitoring & Alerting

### Application Monitoring
**Top Choice**: Better Stack
- ClickHouse-based log management
- Real-time monitoring for Node.js
- Slack, PagerDuty integration
- Quick setup for both backend and frontend

**Alternative**: PM2 for process management
```bash
npm install -g pm2
```

### Incident Management & Alerting
**Recommended**: PagerDuty + Slack Integration
- Dedicated incident channels
- Automated workflow triggers
- Real-time notifications

**Cost-Effective Alternative**: Zenduty
- 60% improvement in MTTA/MTTR
- Native Slack/Teams integration
- End-to-end incident management

**Open Source Option**: Prometheus + Alertmanager
- Flexible monitoring foundation
- Integrates with Slack, PagerDuty, Gmail
- Full customization control

### Node.js Specific Monitoring
**Recommended Package**: `prom-client` for Prometheus metrics
```bash
npm install prom-client
```

## Security & Authentication

### Phone Number Hashing
**Recommended**: Built-in Node.js crypto module
```javascript
const crypto = require('crypto');

function hashPhoneNumber(phone) {
  return crypto
    .createHmac('sha256', process.env.PHONE_HASH_SALT)
    .update(phone)
    .digest('hex');
}
```

### Environment Configuration
**Recommended Package**: `dotenv`
```bash
npm install dotenv
```

### Rate Limiting
**Recommended Package**: `express-rate-limit`
```bash
npm install express-rate-limit
```

## External API Integrations

### Twilio SDK
**Official Package**: `twilio`
```bash
npm install twilio
```

### HTTP Client for External APIs
**Recommended Package**: `axios`
```bash
npm install axios
```

**Modern Alternative**: `fetch` (built into Node.js 18+)

## Development & Testing

### Testing Framework
**Recommended**: Jest
```bash
npm install --save-dev jest
```

### Type Checking
**Recommended**: TypeScript
```bash
npm install --save-dev typescript @types/node
```

### Process Management
**Production**: PM2
```bash
npm install -g pm2
```

**Development**: nodemon
```bash
npm install --save-dev nodemon
```

## Container & Deployment

### Container Runtime
**Recommended**: Docker with Node.js 18+ Alpine base image

### Container Orchestration
**Cloud**: Kubernetes or Docker Swarm
**Simple**: Docker Compose

### Hosting Platforms (Current Setup)
- **Netlify**: Current deployment (Serverless functions)
- **Production Alternatives**: Railway, Render, Fly.io for full-stack apps

## Infrastructure as Code

### Cloud Infrastructure
**AWS**: CDK (Cloud Development Kit)
**Multi-cloud**: Terraform

### Monitoring Stack
**Complete Solution**: Grafana + Prometheus + InfluxDB
**Managed Alternative**: DataDog, New Relic

## Database Migrations & Schema Management

### PostgreSQL Migrations
**Recommended Package**: `node-pg-migrate`
```bash
npm install node-pg-migrate
```

**Alternative**: `knex` for query building + migrations

## Cost Optimization Tools

### OpenAI Cost Tracking
- Built-in cost estimation with `gpt-tokenizer`
- Monitor token usage per user/conversation
- Set spending limits and alerts

### Database Query Optimization
**Recommended Package**: `pg-query-stream` for large result sets
```bash
npm install pg-query-stream
```

## Production Deployment Checklist

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
INFLUXDB_URL=https://...

# External APIs
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
OPENAI_API_KEY=...

# Security
PHONE_HASH_SALT=...
ENCRYPTION_KEY=...

# Monitoring
SLACK_WEBHOOK_URL=...
PAGERDUTY_API_KEY=...
```

### Production Package.json Example
```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "ioredis": "^5.3.2",
    "bullmq": "^5.0.0",
    "@influxdata/influxdb3-client": "^0.9.0",
    "gpt-tokenizer": "^2.4.0",
    "twilio": "^4.20.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "dotenv": "^16.3.1",
    "prom-client": "^15.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.2"
  }
}
```

## Architecture Evolution Path

### Phase 1: Current (Serverless)
- Netlify Functions
- In-memory caching
- File-based configuration

### Phase 2: Managed Services
- Railway/Render deployment
- Managed PostgreSQL (Neon, Supabase)
- Managed Redis (Upstash, Redis Cloud)

### Phase 3: Full Infrastructure
- Kubernetes deployment
- Self-managed databases
- Complete monitoring stack

### Phase 4: Multi-Region
- Global load balancing
- Regional data stores
- Edge caching

This technology stack provides a solid foundation for scaling from MVP to enterprise-level SMS AI platform while maintaining cost efficiency and operational excellence.