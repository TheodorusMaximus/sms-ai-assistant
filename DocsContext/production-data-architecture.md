# Production Data Architecture for SMS AI Platform

## Overview
This document outlines the real data architecture, storage systems, APIs, and services required to support a production-grade SMS AI management platform at scale.

## 1. Database Architecture

### Primary Database (PostgreSQL)
Production-grade relational database for core business logic and structured data.

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    message_count_today INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    persona_config JSONB,
    billing_customer_id VARCHAR(100)
);

-- Messages table (partitioned by date for performance)
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    direction message_direction NOT NULL,
    content TEXT,
    content_hash VARCHAR(64),
    persona_used VARCHAR(50),
    tokens_used INTEGER,
    response_time_ms INTEGER,
    cost_cents INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    twilio_sid VARCHAR(50),
    error_message TEXT,
    ai_model VARCHAR(50)
) PARTITION BY RANGE (created_at);

-- System metrics (time-series aggregations)
CREATE TABLE metrics_hourly (
    hour_bucket TIMESTAMP,
    metric_name VARCHAR(50),
    value NUMERIC,
    tags JSONB,
    PRIMARY KEY (hour_bucket, metric_name, tags)
);

-- Admin actions audit log
CREATE TABLE admin_actions (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- System configuration
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by INTEGER
);
```

### Redis Cache Layer
High-performance in-memory storage for:
- Rate limiting counters
- Session data
- Real-time metrics
- Response caching
- Queue management

```javascript
// Redis key patterns
const redisSchema = {
    // Rate limiting
    'rate_limit:{phone_hash}': 'SET EX 60',

    // Real-time counters
    'metrics:today': 'HASH', // {messages: 1234, active_users: 567}
    'costs:today': 'HASH',   // {openai_cents: 1234, twilio_cents: 5678}

    // Response caching
    'cache:{content_hash}': 'STRING EX 3600',

    // User sessions
    'session:{phone_hash}': 'STRING EX 1800', // JSON context

    // System state
    'system:kill_switch': 'STRING',
    'system:paused_until': 'STRING',
    'system:blocked_numbers': 'SET'
};
```

### Time-Series Database (InfluxDB)
High-frequency metrics and performance data.

```javascript
// InfluxDB measurements
const influxSchema = {
    'response_times': {
        tags: ['persona', 'region', 'model'],
        fields: ['duration_ms', 'tokens_used']
    },
    'costs': {
        tags: ['service', 'model', 'user_tier'],
        fields: ['cost_cents', 'tokens']
    },
    'system_health': {
        tags: ['service', 'endpoint'],
        fields: ['cpu_percent', 'memory_mb', 'error_count']
    }
};
```

## 2. Real-Time Data Pipeline

### Message Processing Pipeline
```javascript
class MessageProcessor {
    async processIncomingMessage(event) {
        const { phoneNumber, message, timestamp, metadata } = event;

        // 1. Immediate validation and security checks
        await this.validateMessage(phoneNumber, message);

        // 2. Enqueue for async processing
        await messageQueue.add('process-message', {
            phoneHash: hashPhone(phoneNumber),
            message,
            timestamp,
            metadata
        }, {
            priority: this.getPriority(phoneNumber),
            attempts: 3,
            backoff: 'exponential'
        });

        // 3. Update real-time counters
        await this.updateRealTimeMetrics(phoneNumber);

        // 4. Return immediately for low latency
        return { status: 'queued', messageId: generateId() };
    }

    async updateRealTimeMetrics(phoneNumber) {
        const phoneHash = hashPhone(phoneNumber);
        const now = new Date();
        const hour = now.getHours();

        await redis.multi()
            .hincrby('metrics:today', 'total_messages', 1)
            .sadd('active_users:today', phoneHash)
            .hincrby(`metrics:hour:${hour}`, 'messages', 1)
            .expire(`metrics:hour:${hour}`, 86400) // 24 hour TTL
            .exec();
    }
}
```

### Event Sourcing System
```javascript
class EventStore {
    async appendEvent(streamId, event) {
        const eventData = {
            streamId,
            eventType: event.type,
            eventData: event.data,
            eventVersion: await this.getNextVersion(streamId),
            timestamp: new Date(),
            correlationId: event.correlationId
        };

        await db.query(`
            INSERT INTO events (stream_id, event_type, event_data,
                              event_version, created_at, correlation_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            eventData.streamId,
            eventData.eventType,
            JSON.stringify(eventData.eventData),
            eventData.eventVersion,
            eventData.timestamp,
            eventData.correlationId
        ]);

        // Publish to subscribers
        await this.publishEvent(eventData);
    }

    async replayEvents(streamId, fromVersion = 0) {
        const events = await db.query(`
            SELECT event_type, event_data, event_version, created_at
            FROM events
            WHERE stream_id = $1 AND event_version > $2
            ORDER BY event_version
        `, [streamId, fromVersion]);

        return events.rows.map(row => ({
            type: row.event_type,
            data: JSON.parse(row.event_data),
            version: row.event_version,
            timestamp: row.created_at
        }));
    }
}
```

## 3. External API Integrations

### Twilio Integration Layer
```javascript
class TwilioMetricsCollector {
    constructor() {
        this.client = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
    }

    async getUsageMetrics(startDate = new Date(Date.now() - 24*60*60*1000)) {
        try {
            const [messages, usage] = await Promise.all([
                this.client.messages.list({
                    dateSentAfter: startDate,
                    limit: 1000
                }),
                this.client.usage.records.list({
                    category: 'sms',
                    startDate: startDate
                })
            ]);

            return {
                messagesSent: messages.filter(m => m.direction === 'outbound-api').length,
                messagesReceived: messages.filter(m => m.direction === 'inbound').length,
                totalCost: usage.reduce((sum, record) => sum + parseFloat(record.price), 0),
                failedMessages: messages.filter(m => m.errorCode).length
            };
        } catch (error) {
            console.error('Twilio metrics collection failed:', error);
            throw error;
        }
    }

    async getDetailedMessageInfo(messageSid) {
        const message = await this.client.messages(messageSid).fetch();
        return {
            sid: message.sid,
            status: message.status,
            direction: message.direction,
            price: message.price,
            priceUnit: message.priceUnit,
            errorCode: message.errorCode,
            errorMessage: message.errorMessage,
            dateCreated: message.dateCreated
        };
    }
}
```

### OpenAI Cost Tracking
```javascript
class OpenAIMetricsCollector {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.tokenizer = require('gpt-3-encoder');
    }

    async createCompletionWithMetrics(prompt, options = {}) {
        const startTime = Date.now();
        const promptTokens = this.tokenizer.encode(prompt).length;

        try {
            const completion = await this.openai.chat.completions.create({
                model: options.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: options.maxTokens || 150,
                temperature: options.temperature || 0.7
            });

            const responseTime = Date.now() - startTime;
            const completionTokens = completion.usage.completion_tokens;
            const totalTokens = completion.usage.total_tokens;

            const cost = this.calculateCost(promptTokens, completionTokens, options.model);

            // Log metrics
            await this.logMetrics({
                model: options.model || 'gpt-4o-mini',
                promptTokens,
                completionTokens,
                totalTokens,
                responseTime,
                cost
            });

            return {
                response: completion.choices[0].message.content,
                metrics: {
                    promptTokens,
                    completionTokens,
                    totalTokens,
                    responseTime,
                    cost
                }
            };
        } catch (error) {
            await this.logError(error, { prompt: prompt.substring(0, 100) });
            throw error;
        }
    }

    calculateCost(promptTokens, completionTokens, model = 'gpt-4o-mini') {
        const rates = {
            'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
            'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
            'claude-instant': { input: 0.0008, output: 0.0024 }
        };

        const rate = rates[model] || rates['gpt-4o-mini'];
        return (promptTokens * rate.input + completionTokens * rate.output) / 1000;
    }
}
```

## 4. Monitoring and Alerting

### Alert System
```javascript
class AlertManager {
    constructor() {
        this.thresholds = {
            cost_per_hour: 50, // $50/hour
            error_rate: 0.05,  // 5% error rate
            response_time_p95: 10000, // 10 seconds
            active_users_spike: 2.0 // 2x normal traffic
        };
    }

    async checkAlerts() {
        const metrics = await this.getCurrentMetrics();

        for (const [metric, threshold] of Object.entries(this.thresholds)) {
            const currentValue = metrics[metric];

            if (this.shouldAlert(metric, currentValue, threshold)) {
                await this.sendAlert({
                    metric,
                    currentValue,
                    threshold,
                    severity: this.getSeverity(metric, currentValue, threshold),
                    timestamp: new Date()
                });
            }
        }
    }

    async sendAlert(alert) {
        const channels = this.getAlertChannels(alert.severity);

        await Promise.all(channels.map(channel => {
            switch (channel) {
                case 'email':
                    return this.sendEmail(alert);
                case 'slack':
                    return this.sendSlack(alert);
                case 'pagerduty':
                    return this.sendPagerDuty(alert);
                case 'sms':
                    return this.sendSMS(alert);
            }
        }));
    }

    async sendSlack(alert) {
        const webhook = process.env.SLACK_WEBHOOK_URL;
        const message = {
            text: `🚨 SMS AI Alert: ${alert.metric}`,
            attachments: [{
                color: alert.severity === 'critical' ? 'danger' : 'warning',
                fields: [
                    { title: 'Metric', value: alert.metric, short: true },
                    { title: 'Current', value: alert.currentValue, short: true },
                    { title: 'Threshold', value: alert.threshold, short: true },
                    { title: 'Time', value: alert.timestamp.toISOString(), short: true }
                ]
            }]
        };

        await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
    }
}
```

## 5. Dashboard API Endpoints

### Real-Time Metrics API
```javascript
// GET /api/admin/metrics/realtime
async function getRealtimeMetrics() {
    const [redisMetrics, dbMetrics, twilioHealth, openaiHealth] = await Promise.all([
        redis.hmget('metrics:today', 'total_messages', 'active_users', 'errors'),
        getDbMetrics(),
        checkTwilioHealth(),
        checkOpenAIHealth()
    ]);

    return {
        activeUsers: parseInt(redisMetrics[1]) || 0,
        messagesToday: parseInt(redisMetrics[0]) || 0,
        errorsToday: parseInt(redisMetrics[2]) || 0,
        systemHealth: {
            twilio: twilioHealth,
            openai: openaiHealth,
            database: dbMetrics.health
        },
        costs: await getCostBreakdown(),
        responseTime: await getAverageResponseTime()
    };
}

// GET /api/admin/metrics/timeseries
async function getTimeSeriesMetrics(metric, period = '24h') {
    const query = `
        SELECT time_bucket('1 hour', created_at) as hour,
               COUNT(*) as messages,
               AVG(response_time_ms) as avg_response_time,
               SUM(cost_cents) as total_cost
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '${period}'
        GROUP BY hour
        ORDER BY hour
    `;

    const result = await db.query(query);
    return result.rows;
}
```

## 6. Security and Compliance

### Data Privacy Layer
```javascript
class PrivacyManager {
    constructor() {
        this.encryptionKey = process.env.ENCRYPTION_KEY;
        this.hashSalt = process.env.PHONE_HASH_SALT;
    }

    hashPhoneNumber(phoneNumber) {
        return crypto
            .createHmac('sha256', this.hashSalt)
            .update(phoneNumber)
            .digest('hex');
    }

    encryptPII(data) {
        const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        return {
            encrypted,
            authTag: authTag.toString('hex')
        };
    }

    async anonymizeOldData() {
        // Remove PII from messages older than 90 days
        await db.query(`
            UPDATE messages
            SET content = '[ANONYMIZED]',
                content_hash = NULL
            WHERE created_at < NOW() - INTERVAL '90 days'
            AND content != '[ANONYMIZED]'
        `);
    }
}
```

### Audit Logging
```javascript
class AuditLogger {
    async logAdminAction(adminUserId, action, resource, metadata = {}) {
        await db.query(`
            INSERT INTO admin_actions
            (admin_user_id, action, resource, metadata, ip_address)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            adminUserId,
            action,
            resource,
            JSON.stringify(metadata),
            metadata.ipAddress
        ]);

        // Also log to external audit system
        await this.sendToAuditService({
            adminUserId,
            action,
            resource,
            metadata,
            timestamp: new Date()
        });
    }

    async getAuditTrail(filters = {}) {
        let query = `
            SELECT * FROM admin_actions
            WHERE created_at >= $1
        `;
        const params = [filters.startDate || new Date(Date.now() - 30*24*60*60*1000)];

        if (filters.adminUserId) {
            query += ` AND admin_user_id = $${params.length + 1}`;
            params.push(filters.adminUserId);
        }

        if (filters.action) {
            query += ` AND action = $${params.length + 1}`;
            params.push(filters.action);
        }

        query += ` ORDER BY created_at DESC LIMIT 1000`;

        const result = await db.query(query, params);
        return result.rows;
    }
}
```

## 7. Performance Optimization

### Caching Strategy
```javascript
class CacheManager {
    constructor() {
        this.redis = new Redis(process.env.REDIS_URL);
        this.ttl = {
            responses: 3600,    // 1 hour
            userSessions: 1800, // 30 minutes
            metrics: 300,       // 5 minutes
            config: 86400      // 24 hours
        };
    }

    async getCachedResponse(messageHash) {
        return await this.redis.get(`cache:response:${messageHash}`);
    }

    async setCachedResponse(messageHash, response) {
        await this.redis.setex(
            `cache:response:${messageHash}`,
            this.ttl.responses,
            JSON.stringify(response)
        );
    }

    async invalidateUserCache(phoneHash) {
        const pattern = `*:${phoneHash}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
}
```

### Database Connection Pooling
```javascript
const { Pool } = require('pg');

const dbPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,                    // Maximum number of clients in pool
    idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection fails
    maxUses: 7500,              // Close connection after 7500 queries
});
```

## 8. Deployment and Infrastructure

### Container Configuration (Docker)
```dockerfile
# Dockerfile for API service
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

# Run with proper signal handling
CMD ["node", "server.js"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sms-ai-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sms-ai-api
  template:
    metadata:
      labels:
        app: sms-ai-api
    spec:
      containers:
      - name: api
        image: sms-ai-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

## 9. Backup and Disaster Recovery

### Automated Backups
```javascript
class BackupManager {
    async createDatabaseBackup() {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `sms-ai-backup-${timestamp}.sql`;

        await exec(`pg_dump ${process.env.DATABASE_URL} > /backups/${filename}`);

        // Upload to cloud storage
        await this.uploadToS3(filename, `/backups/${filename}`);

        // Clean up local file
        await fs.unlink(`/backups/${filename}`);

        // Log backup completion
        console.log(`Database backup completed: ${filename}`);
    }

    async scheduleBackups() {
        // Daily database backups
        cron.schedule('0 2 * * *', () => this.createDatabaseBackup());

        // Hourly Redis snapshots
        cron.schedule('0 * * * *', () => this.createRedisSnapshot());

        // Weekly full system backup
        cron.schedule('0 3 * * 0', () => this.createFullBackup());
    }
}
```

This production architecture provides:
- **Scalable data storage** with proper indexing and partitioning
- **Real-time metrics** collection and processing
- **Comprehensive monitoring** with alerting
- **Security and compliance** features
- **High availability** through redundancy
- **Performance optimization** with caching and connection pooling
- **Disaster recovery** capabilities

The next step would be to research and select the best packages and services to implement each component.