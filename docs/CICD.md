# CI/CD Pipeline Documentation

## Overview

This document provides a comprehensive guide to the CI/CD pipeline implemented for RouteTracker using GitHub Actions.

## Pipeline Architecture

```
┌─────────────────┐
│  Pull Request   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│   CI Workflow   │
│  (Lint + Test)  │
└────────┬────────┘
         │
         v
    ┌────┴────┐
    │  Merge  │
    └────┬────┘
         │
    ┌────┴──────────┐
    │               │
    v               v
┌────────┐    ┌─────────┐
│ Develop│    │  Main   │
│ Branch │    │ Branch  │
└───┬────┘    └────┬────┘
    │              │
    v              v
┌────────────┐ ┌──────────────┐
│  Staging   │ │ Production   │
│ Deployment │ │ Deployment   │
└────────────┘ └──────────────┘
```

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

**Jobs:**

#### Lint Job
- Checks code quality using ESLint
- Ensures code follows project standards
- Fails fast to prevent bad code from merging

#### Test Job
- Runs all unit tests with Vitest
- Validates functionality
- Runs in parallel with lint job

#### Build Job
- Depends on lint and test jobs
- Builds the application with Vite
- Uses environment-specific variables
- Uploads build artifacts for later use
- Validates that the application can be built successfully

**Usage:**
```yaml
# Automatically runs on PR creation/update
# No manual intervention needed
```

### 2. Deploy to Staging (`deploy-staging.yml`)

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch

**Process:**
1. Checkout code
2. Install dependencies
3. Build for development/staging
4. Deploy to staging environment
5. Comment on PR with staging URL (if applicable)

**Configuration:**
- Uses staging-specific environment variables
- Deploys to `staging` environment (requires configuration)
- Can be integrated with hosting providers

**Manual Trigger:**
```bash
# Via GitHub Actions UI
Actions > Deploy to Staging > Run workflow
```

### 3. Deploy to Production (`deploy-production.yml`)

**Triggers:**
- Push to `main` branch
- Push of version tags (`v*`)
- Manual workflow dispatch

**Process:**
1. Checkout code
2. Install dependencies
3. Run tests (safety check)
4. Build for production
5. Deploy to production environment
6. Create deployment notification

**Features:**
- Requires manual approval (when environment protection is configured)
- Runs tests before deployment
- Creates deployment records in GitHub

**Manual Trigger:**
```bash
# Via GitHub Actions UI
Actions > Deploy to Production > Run workflow > Select version
```

### 4. Release Workflow (`release.yml`)

**Triggers:**
- Manual workflow dispatch
- Commits containing `[release]` in message on `main` branch

**Process:**
1. Run tests and build
2. Determine version (manual input or auto-increment)
3. Update package.json version
4. Generate changelog from git commits
5. Create git tag
6. Create GitHub release with changelog
7. Upload build artifacts to release

**Version Management:**
- Supports semantic versioning
- Auto-increments patch version by default
- Manual control via workflow inputs

**Usage:**

**Option 1: Manual Release**
```bash
# Via GitHub Actions UI
Actions > Release > Run workflow
Version: v1.2.3
Release type: minor
```

**Option 2: Automatic Release**
```bash
git commit -m "feat: Add awesome feature [release]"
git push origin main
```

**Changelog Format:**
```markdown
## What's Changed
- feat: Add new feature (abc123)
- fix: Resolve bug (def456)

**Full Changelog**: https://github.com/org/repo/compare/v1.0.0...v1.1.0
```

### 5. Security Scan (`security.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Daily schedule at 2 AM UTC

**Jobs:**

#### Dependency Scan
- Runs `npm audit` to check for vulnerabilities
- Generates security report
- Uploads report as artifact

#### CodeQL Analysis
- Performs static code analysis
- Scans for security vulnerabilities
- Analyzes JavaScript/TypeScript code
- Results visible in Security tab

**Benefits:**
- Early detection of vulnerable dependencies
- Automated security monitoring
- Regular scheduled scans
- Integration with GitHub Security Advisory

## Environment Configuration

### GitHub Secrets

Navigate to: `Settings > Secrets and variables > Actions`

**Required Secrets:**

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VITE_SUPABASE_PROJECT_ID` | Production Supabase project ID | `abc123xyz` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production publishable API key | `eyJhbGc...` |
| `VITE_SUPABASE_URL` | Production Supabase URL | `https://xxx.supabase.co` |
| `STAGING_SUPABASE_PROJECT_ID` | Staging Supabase project ID | `staging123` |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | Staging publishable API key | `eyJhbGc...` |
| `STAGING_SUPABASE_URL` | Staging Supabase URL | `https://staging.supabase.co` |

**Hosting Provider Secrets (configure as needed):**

For **Vercel**:
```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

For **Netlify**:
```
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
```

### GitHub Environments

Navigate to: `Settings > Environments`

#### Staging Environment
1. Click "New environment"
2. Name: `staging`
3. Add environment secrets (staging-specific)
4. Optional: Add deployment branch restrictions

#### Production Environment
1. Click "New environment"
2. Name: `production`
3. Enable "Required reviewers" (recommended)
4. Add reviewers who can approve deployments
5. Add environment secrets (production-specific)
6. Optional: Set "Wait timer" for deployment delay
7. Optional: Restrict to `main` branch only

### Branch Protection Rules

Navigate to: `Settings > Branches`

**For `main` branch:**
```yaml
Require pull request reviews: ✓
  Required approvals: 1-2
Require status checks: ✓
  CI / lint
  CI / test
  CI / build
Require branches to be up to date: ✓
Include administrators: ✓
```

**For `develop` branch:**
```yaml
Require pull request reviews: ✓
  Required approvals: 1
Require status checks: ✓
  CI / lint
  CI / test
```

## Deployment Integration

### Vercel Integration

**Setup:**
1. Install Vercel GitHub App
2. Link repository
3. Add Vercel secrets to GitHub
4. Uncomment Vercel action in deploy workflows

```yaml
# In deploy-production.yml
- uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    vercel-args: '--prod'
```

### Netlify Integration

**Setup:**
1. Create Netlify site
2. Get authentication token and site ID
3. Add secrets to GitHub
4. Use Netlify CLI in workflow

```yaml
# In deploy-production.yml
- name: Deploy to Netlify
  run: |
    npm install -g netlify-cli
    netlify deploy --prod --dir=dist
  env:
    NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
    NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### AWS S3 + CloudFront

**Setup:**
1. Create S3 bucket for static hosting
2. Set up CloudFront distribution
3. Add AWS credentials to GitHub secrets
4. Use AWS CLI in workflow

```yaml
# In deploy-production.yml
- name: Deploy to AWS S3
  run: |
    aws s3 sync dist/ s3://your-bucket-name --delete
    aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_REGION: us-east-1
```

## Monitoring and Notifications

### Slack Integration

Add Slack notification to workflows:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment completed'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Email Notifications

GitHub sends email notifications by default for:
- Workflow failures
- Deployment approvals needed
- Security alerts

Configure in: `Settings > Notifications`

### Status Badges

Add to README.md:

```markdown
![CI](https://github.com/AmbitiousWays16/routetracker/workflows/CI/badge.svg)
![Deploy to Production](https://github.com/AmbitiousWays16/routetracker/workflows/Deploy%20to%20Production/badge.svg)
![Security Scan](https://github.com/AmbitiousWays16/routetracker/workflows/Security%20Scan/badge.svg)
```

## Troubleshooting

### Common Issues

**Problem: Workflow fails with "Resource not accessible by integration"**
```yaml
# Solution: Add appropriate permissions to job
jobs:
  deploy:
    permissions:
      contents: write
      deployments: write
```

**Problem: Build fails with environment variable errors**
```bash
# Solution: Verify secrets are set in GitHub
Settings > Secrets and variables > Actions
```

**Problem: Deployment times out**
```yaml
# Solution: Increase timeout
jobs:
  deploy:
    timeout-minutes: 30  # Default is 360
```

**Problem: Tests fail only in CI**
```bash
# Possible causes:
1. Different Node.js version
2. Missing environment variables
3. Timezone differences
4. File system case sensitivity

# Solutions:
- Match Node version exactly
- Check required env vars
- Use UTC for tests
- Ensure consistent file naming
```

### Debugging Workflows

**View detailed logs:**
1. Go to Actions tab
2. Click on failed workflow run
3. Click on failed job
4. Expand step to see details

**Enable debug logging:**
```bash
# Set repository secrets:
ACTIONS_RUNNER_DEBUG=true
ACTIONS_STEP_DEBUG=true
```

**Re-run with debug:**
1. Go to failed workflow run
2. Click "Re-run jobs"
3. Select "Re-run failed jobs" or "Re-run all jobs"

## Best Practices

1. **Keep workflows simple**
   - One responsibility per workflow
   - Reuse actions from marketplace
   - Use composite actions for repeated steps

2. **Fail fast**
   - Run quick checks first (lint before test)
   - Use job dependencies appropriately
   - Set reasonable timeouts

3. **Secure secrets**
   - Never log secrets
   - Use environment-specific secrets
   - Rotate secrets regularly
   - Use least privilege principle

4. **Optimize workflow runs**
   - Cache dependencies (`cache: 'npm'`)
   - Run jobs in parallel when possible
   - Skip unnecessary workflows with path filters

5. **Monitor and maintain**
   - Review workflow runs regularly
   - Keep actions up to date
   - Clean up old artifacts
   - Document changes to workflows

## Advanced Patterns

### Matrix Testing

Test across multiple Node versions:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 21]
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### Conditional Deployments

Deploy only on specific conditions:

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

### Artifact Promotion

Promote artifacts between environments:

```yaml
- name: Download staging artifact
  uses: actions/download-artifact@v4
  with:
    name: staging-build
- name: Deploy to production
  run: ./deploy.sh
```

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Security Hardening Guide](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

## Support

For issues or questions about the CI/CD pipeline:
1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Check DEPLOYMENT.md for operational procedures
4. Create an issue in the repository
