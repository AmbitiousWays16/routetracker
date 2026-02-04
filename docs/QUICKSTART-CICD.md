# CI/CD Quick Start Guide

This guide will help you get the CI/CD pipeline up and running quickly.

## Prerequisites

- GitHub repository access with admin permissions
- Hosting provider account (Vercel, Netlify, AWS, etc.)
- Supabase project (production and optionally staging)

## Step-by-Step Setup

### 1. Configure GitHub Secrets

Navigate to: `Settings > Secrets and variables > Actions > New repository secret`

Add the following secrets:

#### Required for Production
```
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

#### Optional for Staging
```
STAGING_SUPABASE_PROJECT_ID=staging_project_id
STAGING_SUPABASE_PUBLISHABLE_KEY=staging_publishable_key
STAGING_SUPABASE_URL=https://staging-project.supabase.co
```

#### Hosting Provider (Choose one)

**For Vercel:**
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

**For Netlify:**
```
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id
```

**For AWS:**
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 2. Create GitHub Environments

Navigate to: `Settings > Environments > New environment`

#### Create "staging" environment:
1. Name: `staging`
2. Add environment secrets (if different from repo secrets)
3. Optional: Add deployment branch rule (e.g., `develop` only)

#### Create "production" environment:
1. Name: `production`
2. Enable "Required reviewers"
3. Add reviewers (people who can approve deployments)
4. Optional: Add wait timer (e.g., 5 minutes)
5. Optional: Add deployment branch rule (e.g., `main` and tags only)

### 3. Configure Branch Protection

Navigate to: `Settings > Branches > Add rule`

#### For `main` branch:
- Branch name pattern: `main`
- ✅ Require pull request reviews before merging
  - Required approvals: 1-2
- ✅ Require status checks to pass before merging
  - Select: `lint`, `test`, `build` (from CI workflow)
- ✅ Require branches to be up to date before merging
- ✅ Include administrators

#### For `develop` branch:
- Branch name pattern: `develop`
- ✅ Require pull request reviews before merging
  - Required approvals: 1
- ✅ Require status checks to pass before merging
  - Select: `lint`, `test`

### 4. Enable Dependabot

Navigate to: `Settings > Code security and analysis`

- ✅ Enable Dependabot alerts
- ✅ Enable Dependabot security updates

The `.github/dependabot.yml` file is already configured and will automatically create PRs for dependency updates.

### 5. Configure Deployment Integration

Choose your hosting provider and uncomment the relevant deployment step in the workflow files.

#### For Vercel:

Edit `.github/workflows/deploy-production.yml` and `.github/workflows/deploy-staging.yml`:

```yaml
# Uncomment this section
- uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    vercel-args: '--prod'  # Remove --prod for staging
```

#### For Netlify:

Add to deployment step:

```yaml
- name: Deploy to Netlify
  run: |
    npm install -g netlify-cli
    netlify deploy --prod --dir=dist
  env:
    NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
    NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### 6. Test the Pipeline

#### Test CI Workflow:
1. Create a new branch: `git checkout -b test-ci`
2. Make a small change (e.g., update README)
3. Commit and push: `git push origin test-ci`
4. Create a pull request
5. Check that CI workflow runs automatically
6. Verify all checks pass (lint, test, build)

#### Test Deployment to Staging:
1. Merge PR to `develop` branch
2. Check Actions tab for "Deploy to Staging" workflow
3. Verify deployment succeeds
4. Check staging URL

#### Test Production Deployment:
1. Create PR from `develop` to `main`
2. Get it reviewed and approved
3. Merge to `main`
4. Check Actions tab for "Deploy to Production" workflow
5. Approve deployment if required reviewers is enabled
6. Verify deployment succeeds
7. Check production URL

#### Test Release Workflow:
1. Go to Actions tab
2. Select "Release" workflow
3. Click "Run workflow"
4. Enter version (e.g., `v1.0.0`)
5. Select release type (patch/minor/major)
6. Click "Run workflow"
7. Check Releases page for new release

### 7. Set Up Monitoring (Optional but Recommended)

#### Enable GitHub Notifications:
- Go to: `Settings > Notifications`
- Enable email notifications for workflow failures

#### Add Slack Notifications (Optional):
1. Create Slack webhook URL
2. Add as secret: `SLACK_WEBHOOK`
3. Uncomment Slack notification steps in workflows

#### Set Up External Monitoring:
1. Sign up for UptimeRobot or similar service
2. Add your production URL
3. Configure alert notifications

### 8. Update README

Add your actual production URL to README badges:

```markdown
![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Deploy%20to%20Production/badge.svg)
```

## Verification Checklist

Use this checklist to verify everything is set up correctly:

### GitHub Configuration
- [ ] All required secrets are added
- [ ] Staging environment is created
- [ ] Production environment is created with reviewers
- [ ] Branch protection rules are configured for `main`
- [ ] Branch protection rules are configured for `develop`
- [ ] Dependabot is enabled

### Workflows
- [ ] CI workflow runs on pull requests
- [ ] Lint check passes
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Build artifacts are uploaded

### Deployments
- [ ] Staging deployment works from `develop` branch
- [ ] Production deployment requires approval
- [ ] Production deployment works from `main` branch
- [ ] Deployment URLs are accessible

### Releases
- [ ] Release workflow can be triggered manually
- [ ] Version tags are created
- [ ] GitHub releases are created with changelogs
- [ ] Build artifacts are attached to releases

### Security
- [ ] Security scan workflow runs on schedule
- [ ] Dependabot creates PRs for updates
- [ ] Security alerts are visible in Security tab

## Common Issues and Solutions

### Issue: Workflow doesn't run

**Solution:**
- Check that workflow files are in `.github/workflows/` directory
- Verify YAML syntax is valid
- Ensure branch names match trigger conditions
- Check repository has Actions enabled

### Issue: Build fails with environment variable errors

**Solution:**
- Verify all required secrets are set in GitHub
- Check secret names match exactly (case-sensitive)
- Ensure secrets are available to the environment

### Issue: Deployment fails

**Solution:**
- Check hosting provider credentials are correct
- Verify hosting provider service is running
- Review deployment logs in Actions tab
- Check hosting provider dashboard for errors

### Issue: Can't approve production deployment

**Solution:**
- Ensure you're added as a required reviewer in production environment
- Check you're not the person who triggered the deployment
- Refresh the page and check Environments section

### Issue: Tests fail only in CI

**Solution:**
- Verify Node.js version matches (should be 20)
- Check all dependencies are in package.json
- Ensure no environment-specific code in tests

## Next Steps

After completing the setup:

1. **Review Documentation**
   - Read [DEPLOYMENT.md](../DEPLOYMENT.md) for deployment procedures
   - Review [docs/CICD.md](../docs/CICD.md) for detailed workflow documentation
   - Check [docs/MONITORING.md](../docs/MONITORING.md) for monitoring setup

2. **Set Up Monitoring**
   - Implement error tracking (Sentry)
   - Set up performance monitoring
   - Configure alerting

3. **Team Training**
   - Share this guide with team members
   - Review rollback procedures
   - Practice deployment process in staging

4. **Regular Maintenance**
   - Review and merge Dependabot PRs weekly
   - Check security alerts regularly
   - Monitor workflow run times and optimize if needed

## Getting Help

- Review workflow logs in Actions tab
- Check [GitHub Actions Documentation](https://docs.github.com/en/actions)
- Review [DEPLOYMENT.md](../DEPLOYMENT.md) for troubleshooting
- Create an issue in the repository

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
- [Netlify Deployment Guide](https://docs.netlify.com/site-deploys/overview/)
- [Supabase Documentation](https://supabase.com/docs)
