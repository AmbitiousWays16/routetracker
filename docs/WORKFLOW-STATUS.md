# GitHub Actions Workflow Status

This document provides an overview of all CI/CD workflows and their purposes.

## Workflow Status

| Workflow | Status | Trigger | Purpose |
|----------|--------|---------|---------|
| **CI** | ![CI](https://github.com/AmbitiousWays16/routetracker/workflows/CI/badge.svg) | PR, Push to main/develop | Runs lint, tests, and build |
| **Deploy to Staging** | ![Deploy to Staging](https://github.com/AmbitiousWays16/routetracker/workflows/Deploy%20to%20Staging/badge.svg) | Push to develop | Deploys to staging environment |
| **Deploy to Production** | ![Deploy to Production](https://github.com/AmbitiousWays16/routetracker/workflows/Deploy%20to%20Production/badge.svg) | Push to main, Tags | Deploys to production |
| **Release** | ![Release](https://github.com/AmbitiousWays16/routetracker/workflows/Release/badge.svg) | Manual, Commit with [release] | Creates versioned releases |
| **Security Scan** | ![Security Scan](https://github.com/AmbitiousWays16/routetracker/workflows/Security%20Scan/badge.svg) | Schedule, PR, Push | Security vulnerability scanning |

## Workflow Details

### CI Workflow
- **File**: `.github/workflows/ci.yml`
- **Jobs**: lint, test, build
- **Duration**: ~2-3 minutes
- **Dependencies**: None
- **Artifacts**: Build output (7 days retention)

### Deploy to Staging
- **File**: `.github/workflows/deploy-staging.yml`
- **Jobs**: deploy
- **Duration**: ~3-5 minutes
- **Dependencies**: CI workflow (implicit)
- **Environment**: staging

### Deploy to Production
- **File**: `.github/workflows/deploy-production.yml`
- **Jobs**: deploy
- **Duration**: ~3-5 minutes
- **Dependencies**: CI workflow (implicit)
- **Environment**: production (requires approval)
- **Manual Approval**: Yes

### Release Workflow
- **File**: `.github/workflows/release.yml`
- **Jobs**: release
- **Duration**: ~3-4 minutes
- **Dependencies**: None
- **Outputs**: Git tag, GitHub release, changelog

### Security Scan
- **File**: `.github/workflows/security.yml`
- **Jobs**: dependency-scan, codeql-analysis
- **Duration**: ~5-10 minutes
- **Schedule**: Daily at 2 AM UTC
- **Outputs**: Security reports in Security tab

## Recent Workflow Runs

View all workflow runs: [Actions Tab](https://github.com/AmbitiousWays16/routetracker/actions)

## Deployment History

### Production
| Date | Version | Commit | Deployed By | Status |
|------|---------|--------|-------------|--------|
| TBD | v1.0.0 | - | - | Pending |

### Staging
| Date | Version | Commit | Deployed By | Status |
|------|---------|--------|-------------|--------|
| TBD | develop | - | - | Pending |

## Environment Status

| Environment | Status | URL | Last Deployed |
|-------------|--------|-----|---------------|
| **Production** | 🟢 Active | TBD | TBD |
| **Staging** | 🟢 Active | TBD | TBD |

## Metrics

### Deployment Frequency
- Production: TBD
- Staging: TBD

### Success Rate
- CI Workflow: TBD
- Production Deployments: TBD
- Staging Deployments: TBD

### Average Duration
- CI Workflow: ~2-3 minutes
- Deployment: ~3-5 minutes
- Release: ~3-4 minutes

## Quick Links

- [CI/CD Documentation](CICD.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Monitoring Guide](MONITORING.md)
- [Quick Start Guide](QUICKSTART-CICD.md)

## Maintenance

### Weekly Tasks
- [ ] Review failed workflow runs
- [ ] Merge Dependabot PRs
- [ ] Check security alerts

### Monthly Tasks
- [ ] Review workflow performance
- [ ] Update workflow documentation
- [ ] Audit secrets and permissions

---

*Last Updated: February 4, 2026*
