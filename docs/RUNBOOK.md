# Operations Runbook

This runbook provides step-by-step procedures for common operational tasks.

## Table of Contents

- [Emergency Procedures](#emergency-procedures)
- [Deployment Procedures](#deployment-procedures)
- [Rollback Procedures](#rollback-procedures)
- [Incident Response](#incident-response)
- [Maintenance Tasks](#maintenance-tasks)

## Emergency Procedures

### Production is Down

**Symptoms:**
- Application not loading
- 500/502/503 errors
- Health checks failing

**Immediate Actions:**

1. **Check Status**
   ```bash
   # Check if site is accessible
   curl -I https://your-production-url.com
   
   # Run health check
   ./scripts/healthcheck.sh https://your-production-url.com
   ```

2. **Check Recent Deployments**
   - Go to GitHub Actions
   - Check latest "Deploy to Production" run
   - Review deployment logs

3. **Check Hosting Provider**
   - Log into hosting provider dashboard
   - Check service status
   - Review deployment logs
   - Check resource usage (memory, CPU)

4. **If Recent Deployment Failed:**
   - Proceed to [Rollback Procedures](#rollback-procedures)

5. **If Not Deployment Related:**
   - Check Supabase status: https://status.supabase.com
   - Check hosting provider status page
   - Review application error logs

6. **Communicate**
   - Post to team channel: "Production down, investigating"
   - Update status page if available
   - Set up incident call if needed

7. **Resolve**
   - Follow specific resolution steps based on cause
   - Document what happened
   - Post-incident review

### Database Issues

**Symptoms:**
- Slow queries
- Connection timeouts
- Data inconsistencies

**Actions:**

1. **Check Supabase Dashboard**
   - Go to Supabase dashboard
   - Check database health metrics
   - Review slow query logs
   - Check connection count

2. **Check Connection Pool**
   ```sql
   -- In Supabase SQL Editor
   SELECT count(*) FROM pg_stat_activity;
   ```

3. **Kill Long-Running Queries (if needed)**
   ```sql
   -- Find long-running queries
   SELECT pid, now() - query_start as duration, query
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY duration DESC;
   
   -- Kill specific query (use with caution)
   SELECT pg_terminate_backend(pid);
   ```

4. **Scale Up (if needed)**
   - Increase database instance size in Supabase
   - Add read replicas if available

### High Error Rate

**Symptoms:**
- Multiple error reports
- Error tracking alerts firing
- Users reporting issues

**Actions:**

1. **Check Error Logs**
   - Review error tracking service (Sentry, LogRocket)
   - Check browser console for common errors
   - Review Supabase logs

2. **Identify Pattern**
   - Is it affecting all users or specific ones?
   - Is it related to a specific feature?
   - When did it start?

3. **Quick Fix**
   - If due to recent deployment, rollback
   - If config issue, update environment variables
   - If third-party service down, display maintenance message

4. **Monitor**
   - Watch error rate decrease
   - Verify fix with test user accounts

## Deployment Procedures

### Standard Production Deployment

**Prerequisites:**
- Code reviewed and approved
- All tests passing
- Staging deployment tested

**Steps:**

1. **Pre-Deployment Checklist**
   - [ ] All PRs merged to main
   - [ ] CI passing on main branch
   - [ ] Staging tested and verified
   - [ ] Database migrations reviewed
   - [ ] Environment variables verified
   - [ ] Team notified of deployment

2. **Deploy**
   ```bash
   # Deployment happens automatically on merge to main
   # Or trigger manually:
   # Go to Actions > Deploy to Production > Run workflow
   ```

3. **Monitor Deployment**
   - Watch GitHub Actions logs
   - Check for build errors
   - Verify deployment completes

4. **Approve Deployment** (if required)
   - Review deployment details
   - Click "Review deployments"
   - Click "Approve and deploy"

5. **Verify Deployment**
   ```bash
   # Check production health
   ./scripts/healthcheck.sh https://your-production-url.com
   
   # Test critical paths
   # - Login
   # - Create trip
   # - Submit voucher
   ```

6. **Post-Deployment Monitoring**
   - Watch error rates for 15 minutes
   - Check performance metrics
   - Monitor user feedback
   - Review logs for issues

7. **Communicate Success**
   - Post to team channel: "Production deployment complete"
   - Update status page if applicable
   - Document deployed changes

### Hotfix Deployment

**When to Use:**
- Critical bug in production
- Security vulnerability
- Data integrity issue

**Steps:**

1. **Create Hotfix Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug-fix
   ```

2. **Make Fix**
   ```bash
   # Make minimal changes
   # Add or update tests
   git add .
   git commit -m "fix: Critical bug description"
   ```

3. **Test Locally**
   ```bash
   npm test
   npm run build
   ```

4. **Push and Create PR**
   ```bash
   git push origin hotfix/critical-bug-fix
   # Create PR to main with "HOTFIX" in title
   ```

5. **Fast-Track Review**
   - Mark as urgent
   - Get quick review from available team member
   - Merge immediately after approval

6. **Monitor Closely**
   - Watch deployment
   - Verify fix in production
   - Monitor for new issues

7. **Backport to Develop**
   ```bash
   git checkout develop
   git merge main
   git push origin develop
   ```

### Database Migration Deployment

**Prerequisites:**
- Migration tested in staging
- Rollback plan documented
- Database backup created

**Steps:**

1. **Backup Database**
   - Go to Supabase dashboard
   - Create manual backup
   - Download backup locally (optional)

2. **Review Migration**
   ```bash
   # Review migration files
   cat supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql
   ```

3. **Run Migration in Staging**
   ```bash
   # If using Supabase CLI
   supabase db push --db-url "staging-connection-string"
   ```

4. **Test in Staging**
   - Verify schema changes
   - Test affected features
   - Check data integrity

5. **Schedule Production Migration**
   - Announce maintenance window if needed
   - Choose low-traffic time
   - Have team available

6. **Run Migration in Production**
   ```bash
   # Via Supabase dashboard or CLI
   supabase db push --db-url "production-connection-string"
   ```

7. **Verify Migration**
   ```sql
   -- Check table exists
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'your_table';
   
   -- Verify data
   SELECT COUNT(*) FROM your_table;
   ```

8. **Deploy Application Changes**
   - Follow standard deployment procedure
   - Monitor extra carefully

9. **Rollback Plan**
   - Have SQL rollback script ready
   - Know how to restore from backup

## Rollback Procedures

### Quick Rollback - Redeploy Previous Version

**When to Use:**
- Recent deployment causing issues
- Need immediate fix

**Steps:**

1. **Find Previous Working Version**
   ```bash
   # View recent releases
   git tag --sort=-creatordate | head -5
   ```

2. **Trigger Deployment of Previous Version**
   - Go to Actions > Deploy to Production
   - Click "Run workflow"
   - Select the previous release tag
   - Run workflow

3. **Monitor Rollback**
   - Watch deployment logs
   - Run health checks
   - Verify issues resolved

4. **Communicate**
   - Notify team of rollback
   - Document issue
   - Plan fix for next deployment

### Rollback Using Git Revert

**When to Use:**
- Multiple commits need to be reverted
- Tag-based rollback not feasible

**Steps:**

1. **Identify Bad Commits**
   ```bash
   git log --oneline -10
   ```

2. **Create Revert**
   ```bash
   # Revert specific commit
   git revert <commit-hash>
   
   # Revert range of commits
   git revert <older-hash>^..<newer-hash>
   ```

3. **Test Revert**
   ```bash
   npm test
   npm run build
   ```

4. **Deploy Revert**
   ```bash
   git push origin main
   # Automatic deployment will trigger
   ```

### Rollback Database Migration

**Steps:**

1. **Stop Application (if needed)**
   - Put application in maintenance mode
   - Or ensure no new writes to affected tables

2. **Run Rollback Script**
   ```sql
   -- Run the down migration
   -- Located in: supabase/migrations/rollback/
   ```

3. **Verify Rollback**
   ```sql
   -- Check schema is reverted
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'affected_table';
   ```

4. **Restore from Backup (if needed)**
   - Go to Supabase dashboard
   - Select backup to restore
   - Confirm restoration
   - Wait for completion

5. **Deploy Compatible Code**
   - Rollback application code if needed
   - Ensure code matches database schema

## Incident Response

### Incident Response Process

1. **Detection**
   - Alert triggered or user report
   - Acknowledge incident
   - Assess severity

2. **Response**
   - Assign incident commander
   - Create incident channel
   - Gather team if needed

3. **Investigation**
   - Check recent changes
   - Review logs and metrics
   - Identify root cause

4. **Resolution**
   - Implement fix or rollback
   - Verify resolution
   - Monitor stability

5. **Communication**
   - Update stakeholders
   - Post to status page
   - Notify affected users

6. **Post-Incident**
   - Write incident report
   - Schedule post-mortem
   - Create action items

### Incident Severity Levels

**SEV1 - Critical**
- Production completely down
- Data loss or corruption
- Security breach
- **Response Time:** Immediate
- **Team:** All hands on deck

**SEV2 - High**
- Major feature broken
- Performance severely degraded
- Affects many users
- **Response Time:** < 30 minutes
- **Team:** On-call engineer + backup

**SEV3 - Medium**
- Minor feature broken
- Affects some users
- Workaround available
- **Response Time:** < 2 hours
- **Team:** On-call engineer

**SEV4 - Low**
- Cosmetic issues
- Affects few users
- **Response Time:** Next business day
- **Team:** Regular ticket queue

## Maintenance Tasks

### Daily Tasks

- [ ] Check for failed workflows
- [ ] Review error rates
- [ ] Monitor application performance
- [ ] Check Supabase usage metrics

### Weekly Tasks

- [ ] Review and merge Dependabot PRs
- [ ] Check security alerts
- [ ] Review slow query logs
- [ ] Clean up old branches
- [ ] Review monitoring alerts

### Monthly Tasks

- [ ] Review and update documentation
- [ ] Audit GitHub secrets and permissions
- [ ] Review hosting costs
- [ ] Test backup restore process
- [ ] Update dependencies
- [ ] Review incident reports

### Quarterly Tasks

- [ ] Conduct disaster recovery drill
- [ ] Review and update runbooks
- [ ] Audit security practices
- [ ] Review team access
- [ ] Capacity planning
- [ ] Performance optimization review

## Contact Information

### On-Call Rotation
- Primary: TBD
- Secondary: TBD
- Escalation: TBD

### External Services
- Hosting Provider Support: [Link]
- Supabase Support: support@supabase.io
- GitHub Support: support@github.com

### Internal
- Team Channel: #team-channel
- Incident Channel: #incidents
- Email: team@example.com

## Additional Resources

- [Deployment Guide](../DEPLOYMENT.md)
- [CI/CD Documentation](CICD.md)
- [Monitoring Guide](MONITORING.md)
- [Supabase Documentation](https://supabase.com/docs)

---

*Last Updated: February 4, 2026*
