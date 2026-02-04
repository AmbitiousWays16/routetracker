# Deployment Guide

This document outlines the deployment process, rollback procedures, and monitoring guidelines for RouteTracker.

## Table of Contents

- [CI/CD Pipeline Overview](#cicd-pipeline-overview)
- [Environment Setup](#environment-setup)
- [Deployment Process](#deployment-process)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## CI/CD Pipeline Overview

RouteTracker uses GitHub Actions for continuous integration and deployment:

### Workflows

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Runs on every push and pull request to `main` and `develop` branches
   - Executes linting, testing, and build validation
   - Uploads build artifacts for deployment

2. **Deploy to Staging** (`.github/workflows/deploy-staging.yml`)
   - Triggers on push to `develop` branch
   - Deploys to staging environment for testing
   - Can be manually triggered via workflow_dispatch

3. **Deploy to Production** (`.github/workflows/deploy-production.yml`)
   - Triggers on push to `main` branch or version tags
   - Deploys to production after successful tests
   - Requires manual approval (configured in GitHub environment settings)

4. **Release Workflow** (`.github/workflows/release.yml`)
   - Creates versioned releases with changelog
   - Can be triggered manually or by commit messages containing `[release]`
   - Supports semantic versioning (major, minor, patch)

## Environment Setup

### GitHub Secrets

Configure the following secrets in your GitHub repository settings:

#### Production Environment
- `VITE_SUPABASE_PROJECT_ID` - Production Supabase project ID
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Production Supabase publishable key
- `VITE_SUPABASE_URL` - Production Supabase URL

#### Staging Environment (Optional)
- `STAGING_SUPABASE_PROJECT_ID` - Staging Supabase project ID
- `STAGING_SUPABASE_PUBLISHABLE_KEY` - Staging Supabase publishable key
- `STAGING_SUPABASE_URL` - Staging Supabase URL

#### Deployment Provider Secrets (Configure based on your hosting provider)
- For Vercel: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- For Netlify: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
- For AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### GitHub Environments

1. **Create Staging Environment**
   - Go to Settings > Environments
   - Create "staging" environment
   - Add environment-specific secrets
   - Optional: Add protection rules

2. **Create Production Environment**
   - Create "production" environment
   - Enable "Required reviewers" for manual approval
   - Add environment-specific secrets
   - Optional: Add deployment branches rule (e.g., only `main`)

## Deployment Process

### Automatic Deployments

#### To Staging
1. Merge changes to `develop` branch
2. CI workflow runs automatically
3. If tests pass, staging deployment triggers
4. Application is deployed to staging environment
5. Team can test changes in staging

#### To Production
1. Merge `develop` into `main` branch (or create a release tag)
2. CI workflow runs on `main` branch
3. Production deployment workflow triggers
4. Manual approval may be required (if configured)
5. Application is deployed to production

### Manual Deployments

#### Trigger Manual Deployment
```bash
# Via GitHub Actions UI
1. Go to Actions tab in GitHub
2. Select "Deploy to Production" or "Deploy to Staging"
3. Click "Run workflow"
4. Select branch and click "Run workflow"
```

#### Using Git Tags for Production
```bash
# Create a version tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# This will trigger production deployment
```

### Release Process

#### Automatic Release (on commit)
```bash
# Include [release] in commit message on main branch
git commit -m "feat: Add new feature [release]"
git push origin main
```

#### Manual Release
```bash
# Via GitHub Actions UI
1. Go to Actions > Release workflow
2. Click "Run workflow"
3. Enter version (e.g., v1.2.3)
4. Select release type (major/minor/patch)
5. Click "Run workflow"
```

## Rollback Procedures

### Quick Rollback Methods

#### Method 1: Revert to Previous Release (Recommended)

```bash
# 1. Find the previous working release tag
git tag --sort=-creatordate | head -5

# 2. Deploy the previous release
# Via GitHub UI:
# - Go to Actions > Deploy to Production
# - Run workflow on the previous release tag

# Or via command line:
git checkout v1.0.0  # previous working version
git push origin v1.0.0 --force
```

#### Method 2: Revert the Breaking Commit

```bash
# 1. Identify the breaking commit
git log --oneline -10

# 2. Create a revert commit
git revert <commit-hash>
git push origin main

# 3. This will trigger automatic deployment
```

#### Method 3: Rollback via Hosting Provider

Most hosting providers (Vercel, Netlify, etc.) have built-in rollback features:

**Vercel:**
```bash
# List recent deployments
vercel list

# Promote a previous deployment to production
vercel promote <deployment-url>
```

**Netlify:**
- Go to Deploys tab in Netlify dashboard
- Find the previous working deployment
- Click "Publish deploy" to rollback

### Post-Rollback Steps

1. **Verify rollback success**
   - Check application URL
   - Test critical functionality
   - Monitor error logs

2. **Investigate the issue**
   - Review failed deployment logs
   - Identify root cause
   - Document the incident

3. **Fix and redeploy**
   - Fix the issue in a separate branch
   - Test thoroughly in staging
   - Deploy fix to production

## Monitoring and Logging

### Application Monitoring

#### Health Checks
Monitor these key endpoints/features:
- Application loads successfully
- Authentication works
- Supabase connection is healthy
- Core features (trip creation, voucher submission) work

#### Performance Metrics
- Page load times
- API response times
- Build sizes
- Error rates

### Logging

#### GitHub Actions Logs
- All workflow runs are logged in GitHub Actions
- Logs are retained for 90 days
- Access via: Repository > Actions > Workflow run

#### Application Logs
Configure logging based on your hosting provider:

**Vercel:**
- Real-time logs: `vercel logs <deployment-url> --follow`
- Runtime logs in Vercel dashboard

**Netlify:**
- Function logs in Netlify dashboard
- Deploy logs in Deploys tab

#### Supabase Logs
- Database logs available in Supabase dashboard
- API logs show request patterns
- Real-time monitoring via Supabase metrics

### Alerts and Notifications

#### GitHub Actions Notifications
- Enable email notifications for workflow failures
- Set up Slack/Discord webhooks for deployment notifications

#### Application Monitoring Services
Consider integrating:
- **Sentry** - Error tracking and performance monitoring
- **LogRocket** - Session replay and debugging
- **Datadog** - Full-stack monitoring
- **New Relic** - Application performance monitoring

### Setting Up Alerts

1. **GitHub Actions Alerts**
   ```yaml
   # Add to workflow after deployment
   - name: Notify on failure
     if: failure()
     uses: actions/github-script@v7
     with:
       script: |
         github.rest.issues.create({
           owner: context.repo.owner,
           repo: context.repo.repo,
           title: 'Deployment Failed',
           body: 'Check the logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}'
         })
   ```

2. **Supabase Alerts**
   - Set up alerts in Supabase dashboard
   - Configure database performance alerts
   - Monitor API usage limits

## Troubleshooting

### Common Issues

#### Build Failures

**Issue:** Build fails with missing dependencies
```bash
# Solution: Clear cache and reinstall
npm ci
```

**Issue:** Environment variables not set
```bash
# Solution: Verify secrets are configured in GitHub
# Settings > Secrets and variables > Actions
```

#### Deployment Failures

**Issue:** Deployment workflow times out
```bash
# Solution: Check hosting provider status
# Increase timeout in workflow if needed
```

**Issue:** Application fails to start after deployment
```bash
# Solution: 
1. Check environment variables are set
2. Verify Supabase connection
3. Review deployment logs
4. Rollback if necessary
```

#### Test Failures

**Issue:** Tests pass locally but fail in CI
```bash
# Solution:
1. Check Node version matches (should be 20)
2. Ensure all dependencies are in package.json
3. Review test logs in GitHub Actions
```

### Getting Help

- **GitHub Issues:** Create an issue with deployment logs
- **Team Communication:** Contact DevOps team
- **Documentation:** Review README and workflow files

## Best Practices

1. **Always test in staging first**
   - Never deploy directly to production without staging validation
   - Use staging to test database migrations

2. **Use semantic versioning**
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

3. **Monitor after deployment**
   - Watch logs for 10-15 minutes after production deployment
   - Check error rates and performance metrics

4. **Keep rollback plan ready**
   - Know the previous working version
   - Have rollback commands documented
   - Practice rollback procedures in staging

5. **Maintain changelog**
   - Document all changes in release notes
   - Include breaking changes prominently
   - Link to relevant issues/PRs

## Security Considerations

1. **Secrets Management**
   - Never commit secrets to repository
   - Rotate secrets regularly
   - Use GitHub secrets for CI/CD
   - Use environment-specific secrets

2. **Access Control**
   - Limit who can approve production deployments
   - Use branch protection rules
   - Require pull request reviews
   - Enable 2FA for all team members

3. **Dependency Security**
   - Run `npm audit` regularly
   - Keep dependencies updated
   - Review security advisories
   - Use Dependabot for automatic updates

## Maintenance

### Regular Tasks

**Weekly:**
- Review deployment logs
- Check for failed workflows
- Update dependencies with security patches

**Monthly:**
- Review and update documentation
- Audit GitHub secrets
- Test rollback procedures in staging
- Review monitoring alerts configuration

**Quarterly:**
- Review and optimize workflows
- Update Node.js version if needed
- Audit team access permissions
- Review hosting provider costs and limits
