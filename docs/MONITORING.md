# Monitoring and Logging Guide

This guide covers monitoring, logging, and alerting strategies for RouteTracker.

## Table of Contents

- [Application Health Monitoring](#application-health-monitoring)
- [Performance Monitoring](#performance-monitoring)
- [Error Tracking](#error-tracking)
- [Logging Strategy](#logging-strategy)
- [Alerting Setup](#alerting-setup)
- [Dashboards](#dashboards)

## Application Health Monitoring

### Health Check Script

Use the included health check script to verify application status:

```bash
# Check local development
./scripts/healthcheck.sh http://localhost:8080

# Check staging
./scripts/healthcheck.sh https://staging.routetracker.example.com

# Check production
./scripts/healthcheck.sh https://routetracker.example.com
```

### Automated Health Checks

#### Using GitHub Actions

Add scheduled health checks to your workflows:

```yaml
name: Production Health Check

on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run health check
        run: ./scripts/healthcheck.sh https://your-production-url.com
      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Production Health Check Failed',
              labels: ['alert', 'production'],
              body: 'Production health check failed. See workflow run for details.'
            })
```

#### Using External Services

**UptimeRobot:**
- Free tier: 50 monitors, 5-minute intervals
- Monitor your production URL
- Alert via email, SMS, Slack

**Pingdom:**
- Monitor uptime and performance
- Geographic checks from multiple locations
- Response time tracking

**StatusCake:**
- Free and paid tiers
- Page speed monitoring
- Server monitoring

## Performance Monitoring

### Key Metrics to Track

1. **Core Web Vitals**
   - Largest Contentful Paint (LCP): < 2.5s
   - First Input Delay (FID): < 100ms
   - Cumulative Layout Shift (CLS): < 0.1

2. **Custom Metrics**
   - Time to Interactive (TTI)
   - First Contentful Paint (FCP)
   - Page Load Time
   - API Response Times

3. **Business Metrics**
   - Trip creation success rate
   - Voucher submission rate
   - Approval workflow completion time
   - User session duration

### Implementation

#### Using Web Vitals API

Add to your application:

```javascript
// src/utils/monitoring.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to your analytics endpoint
  const body = JSON.stringify(metric);
  
  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true });
  }
}

export function initMonitoring() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
}
```

#### Using Google Analytics

```javascript
// Add to index.html or use react-ga
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

#### Using Vercel Analytics

```bash
npm install @vercel/analytics
```

```javascript
// src/main.tsx
import { Analytics } from '@vercel/analytics/react';

// In your root component
<>
  <App />
  <Analytics />
</>
```

## Error Tracking

### Recommended Services

#### 1. Sentry (Recommended)

**Installation:**
```bash
npm install @sentry/react @sentry/vite-plugin
```

**Configuration:**
```javascript
// src/utils/sentry.ts
import * as Sentry from "@sentry/react";

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
}

// src/main.tsx
import { initSentry } from './utils/sentry';

if (import.meta.env.PROD) {
  initSentry();
}
```

**Error Boundary:**
```javascript
import * as Sentry from "@sentry/react";

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <Routes />
    </Sentry.ErrorBoundary>
  );
}
```

#### 2. LogRocket

**Features:**
- Session replay
- User tracking
- Performance monitoring
- Console logs

**Installation:**
```bash
npm install logrocket
```

**Usage:**
```javascript
import LogRocket from 'logrocket';

LogRocket.init('your-app-id/project-name');

// Identify users
LogRocket.identify('user-id', {
  name: 'John Doe',
  email: 'john@example.com',
});
```

### Custom Error Logging

```javascript
// src/utils/errorLogger.ts
export class ErrorLogger {
  static log(error: Error, context?: Record<string, any>) {
    console.error('Error:', error);
    console.error('Context:', context);
    
    // Send to monitoring service
    if (import.meta.env.PROD) {
      this.sendToMonitoring(error, context);
    }
  }

  private static sendToMonitoring(error: Error, context?: Record<string, any>) {
    // Implement your logging service integration
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}
```

## Logging Strategy

### Application Logs

#### Development Logging
```javascript
// src/utils/logger.ts
const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) console.debug(...args);
  },
  info: (...args: any[]) => {
    console.info(...args);
  },
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
    // Send to error tracking service in production
  },
};
```

#### Structured Logging
```javascript
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
}

export function log(entry: Omit<LogEntry, 'timestamp'>) {
  const logEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  
  console.log(JSON.stringify(logEntry));
  
  // Send to logging service in production
  if (import.meta.env.PROD) {
    sendToLoggingService(logEntry);
  }
}
```

### Supabase Logs

Access logs in Supabase dashboard:
- **API Logs**: Monitor API requests and response times
- **Database Logs**: Track slow queries and errors
- **Auth Logs**: Monitor authentication events

### GitHub Actions Logs

- Workflow logs retained for 90 days
- Download logs for offline analysis
- Set up log forwarding for long-term storage

## Alerting Setup

### Alert Types

1. **Critical Alerts** (Immediate Response)
   - Production down
   - Database connection failures
   - High error rates (>5%)
   - Authentication service down

2. **Warning Alerts** (Review within hours)
   - Slow response times (>3s)
   - Elevated error rates (>1%)
   - High memory/CPU usage
   - Failed deployments

3. **Info Alerts** (Review daily)
   - Dependency updates available
   - Security advisories
   - Usage pattern changes

### Alert Channels

#### Email Alerts
Configure in GitHub:
- Settings > Notifications
- Enable workflow failure notifications

#### Slack Integration

Create Slack webhook and add to workflows:

```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Production deployment failed!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
    fields: repo,message,commit,author,eventName,workflow
```

#### Discord Integration

```yaml
- name: Notify Discord
  if: failure()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
    title: "Deployment Status"
    description: "Production deployment failed"
```

### PagerDuty Integration

For critical production alerts:

```yaml
- name: Trigger PagerDuty
  if: failure()
  uses: Entle/action-pagerduty-alert@0.2.0
  with:
    pagerduty-integration-key: ${{ secrets.PAGERDUTY_KEY }}
    pagerduty-dedup-key: deployment-failure
```

## Dashboards

### GitHub Actions Dashboard

Built-in GitHub features:
- Actions tab shows all workflow runs
- Insights tab for analytics
- Security tab for vulnerability alerts

### Custom Monitoring Dashboard

Create a simple dashboard using:

#### Option 1: Grafana + Prometheus

**Setup:**
1. Deploy Prometheus to collect metrics
2. Configure Grafana for visualization
3. Add application metrics exporters

**Example Metrics:**
- Request rate
- Error rate
- Response time (p50, p95, p99)
- Active users
- Database connections

#### Option 2: Datadog

**Features:**
- APM (Application Performance Monitoring)
- Real User Monitoring (RUM)
- Log Management
- Alerts and notifications

**Integration:**
```javascript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
    applicationId: '<APP_ID>',
    clientToken: '<CLIENT_TOKEN>',
    site: 'datadoghq.com',
    service: 'routetracker',
    env: import.meta.env.MODE,
    version: '1.0.0',
    sessionSampleRate: 100,
    trackInteractions: true,
    trackResources: true,
    trackLongTasks: true,
});
```

### Simple Status Page

Create a public status page:

**Using Statuspage.io:**
- Free for small teams
- Shows system status
- Incident management
- Subscriber notifications

**Using Cachet:**
- Open-source status page
- Self-hosted option
- Component status tracking

## Monitoring Checklist

### Daily
- [ ] Review error rates in production
- [ ] Check for failed deployments
- [ ] Review security alerts
- [ ] Check Supabase usage metrics

### Weekly
- [ ] Review performance metrics
- [ ] Analyze user behavior patterns
- [ ] Review and close resolved alerts
- [ ] Check dependency update PRs
- [ ] Review workflow efficiency

### Monthly
- [ ] Audit alert configurations
- [ ] Review monitoring costs
- [ ] Analyze long-term trends
- [ ] Update monitoring documentation
- [ ] Test alert channels

## Best Practices

1. **Set Meaningful Thresholds**
   - Base on historical data
   - Account for traffic patterns
   - Adjust for growth

2. **Avoid Alert Fatigue**
   - Don't alert on every error
   - Group related alerts
   - Use appropriate severity levels
   - Set up proper escalation

3. **Make Alerts Actionable**
   - Include context in alerts
   - Link to runbooks
   - Provide quick remediation steps

4. **Test Monitoring**
   - Verify alerts fire correctly
   - Test during low-traffic periods
   - Simulate failures in staging

5. **Document Everything**
   - Maintain runbooks
   - Document alert meanings
   - Keep contact lists updated
   - Document escalation procedures

## Troubleshooting

### High False Positive Rate
- Review and adjust thresholds
- Add more context to conditions
- Use anomaly detection instead of static thresholds

### Missing Critical Alerts
- Verify alert configurations
- Check notification channel settings
- Test with synthetic events
- Review monitoring coverage

### Dashboard Performance Issues
- Reduce query complexity
- Increase caching
- Limit time ranges
- Use data aggregation

## Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/metrics)
- [GitHub Actions Monitoring](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows)
