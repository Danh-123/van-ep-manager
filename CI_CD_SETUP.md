# GitHub Actions & Vercel CI/CD Setup Guide

## 📋 Overview

This guide shows how to setup GitHub Actions + Vercel for automated deployments.

**Flow:**
```
Git Push → GitHub Actions Tests → Vercel Preview/Prod Deploy
```

---

## 🔐 Setup GitHub Secrets

These secrets are needed for GitHub Actions to deploy to Vercel.

### Step 1: Get Vercel Tokens

**Get All Required IDs:**

1. **Vercel Account Token:**
   - Go to https://vercel.com/account/tokens
   - Click "Create"
   - Name: `github-actions-deploy`
   - Scope: Full account access
   - Generate and copy token

2. **Vercel Project Org ID:**
   - Go to project dashboard
   - Settings → General
   - Find "ORG ID" (looks like: `team_xxx` or org name)
   - Copy it

3. **Vercel Project ID:**
   - Same location: find "PROJECT ID"
   - Copy it

4. **Deployment URL** (for testing):
   - From project dashboard
   - Copy your deployment domain

### Step 2: Add GitHub Secrets

1. Go to your GitHub repo
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `VERCEL_TOKEN` | [Your Vercel token from step 1] | Must be kept SECRET |
| `VERCEL_ORG_ID` | [Org ID] | Can be public |
| `VERCEL_PROJECT_ID` | [Project ID] | Can be public |
| `VERCEL_DEPLOYMENT_URL` | `van-ep-manager.vercel.app` | Your app domain |
| `SLACK_WEBHOOK_URL` | (Optional) https://hooks.slack.com/... | For Slack notifications |

### Step 3: Verify Secrets Added

```bash
# List secrets (don't show values)
gh secret list

# Output should show:
VERCEL_TOKEN             Updated Dec 24, 2024 ...
VERCEL_ORG_ID            Updated Dec 24, 2024 ...
...
```

---

## 🔄 GitHub Actions Workflow

The `.github/workflows/deploy.yml` file automates:

1. **On PR to main**: Run tests + preview deploy
2. **On push to main**: Run tests + full production deploy

### Workflow Jobs

**Job 1: Lint and Build**
```
- Checkout code
- Setup Node.js
- Install deps
- Run ESLint
- Build Next.js
- Upload artifacts
```

**Job 2: Security Checks**
```
- Check npm vulnerabilities
- Verify no .env.production.local committed
```

**Job 3: Deploy Preview** (PR only)
```
- Install Vercel CLI
- Deploy to preview
- Returns preview URL
```

**Job 4: Deploy Production** (main push only)
```
- Install Vercel CLI
- Deploy to production
- Notify status
```

**Job 5: Test Endpoints** (post-deploy)
```
- Wait 30s for deployment
- Test health endpoint
- Test homepage
- Verify HTTPS working
```

**Job 6: Slack Notification**
```
- Send deployment status to Slack
- Include links to deployment + logs
```

---

## 📝 Configuration Files Reference

### `.github/workflows/deploy.yml`

Key sections:

**Triggers:**
```yaml
on:
  push:
    branches:
      - main        # Deploy to production on push
      - develop     # Also allow staging deploys
  pull_request:
    branches:
      - main        # Test PRs before merge
```

**Environment Variables:**
```yaml
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**Matrix Strategy** (Run on multiple Node versions):
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]
```

### `vercel.json`

**Build Configuration:**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  ...
}
```

**Environment Variables Declaration:**
```json
"env": [
  {
    "key": "NEXT_PUBLIC_SUPABASE_URL",
    "description": "Supabase project URL",
    "value": ""  // User fills in Vercel dashboard
  }
]
```

**Security Headers:**
```json
"headers": [
  {
    "source": "/(.*)",
    "headers": [
      {
        "key": "X-Content-Type-Options",
        "value": "nosniff"
      }
    ]
  }
]
```

---

## 🚀 Deployment Scenarios

### Scenario 1: Regular Deployment

```
Developer pushes to main
  ↓
GitHub Actions triggered
  ↓
Lint & Build tests run
  ↓
Security checks pass
  ↓
Deploy to Vercel production
  ↓
Run endpoint tests
  ↓
Send Slack notification
  ↓
✅ Live!
```

**Example:**
```bash
git add .
git commit -m "feat: add new feature"
git push origin main

# GitHub Actions automatically:
# - Runs npm run lint
# - Runs npm run build
# - Deploys to Vercel
# - Sends notification
```

### Scenario 2: Pull Request

```
Developer creates PR to main
  ↓
GitHub Actions triggered
  ↓
Lint & Build tests run
  ↓
Preview deployment created
  ↓
Result posted on PR
  ↓
Reviewer can test preview
  ↓
Approve & Merge
  ↓
Scenario 1 runs (production deploy)
```

**Preview URL Example:**
```
PR #123: https://van-ep-manager-git-feature-branch.vercel.app
Production: https://van-ep-manager.vercel.app
```

### Scenario 3: Hotfix

```
Critical bug discovered in prod
  ↓
Create branch: git checkout -b hotfix/db-error
  ↓
Fix code
  ↓
Create PR to main
  ↓
GitHub Actions tests the fix
  ↓
Reviewer approves
  ↓
Merge to main
  ↓
 Automatic production deploy
```

---

## 🔍 Monitoring CI/CD

### View Build Logs

**GitHub Actions:**
```
1. Go to repo → Actions tab
2. Click on workflow run
3. Click on job (lint-and-build)
4. See real-time logs
```

**Common Issues in Logs:**
```log
❌ npm run lint
   ESLint errors found

❌ npm run build
   TypeScript compilation failed

❌ Deploy failed
   Vercel token invalid or expired
```

### Vercel Deployments

**View Deployments:**
1. Vercel Dashboard → Deployments
2. Click each deployment to see:
   - Build logs
   - Deployment status
   - Preview/Production URLs
   - Git commit info

**Rollback if Needed:**
```
Deployments tab → Find previous good deployment
Click "Promote to Production"
```

---

## 🐛 Troubleshooting CI/CD

### GitHub Actions Fails

**Check 1: Secrets Configured?**
```bash
# Verify secrets exist
gh secret list

# Add if missing:
gh secret set VERCEL_TOKEN --body "your-token"
```

**Check 2: Workflow Syntax?**
```bash
# Install GitHub CLI validator
gh auth status  # Make sure logged in

# Syntax error? Check workflow YAML indentation
# (YAML is whitespace-sensitive)
```

**Check 3: Node.js Version?**
```yaml
# Try different Node version in matrix
matrix:
  node-version: [18.x, 20.x, 22.x]
```

### Vercel Deployment Fails

**Error: "Cannot find Vercel token"**
```bash
# Solution: Check VERCEL_TOKEN secret is set
gh secret list | grep VERCEL_TOKEN

# If missing:
gh secret set VERCEL_TOKEN --body "your-token"
```

**Error: "Project not found"**
```bash
# Solution: Verify ORG_ID and PROJECT_ID match
# 1. Double-check in Vercel dashboard
# 2. Update GitHub secrets
gh secret set VERCEL_ORG_ID --body "correct-org-id"
gh secret set VERCEL_PROJECT_ID --body "correct-project-id"
```

**Error: "Build failed in production"**
```bash
# Solution: 
# 1. Check Vercel logs for specific error
# 2. Test locally:
npm install
npm run build

# 3. If works locally, check env variables in Vercel:
# Settings → Environment Variables → Verify all set
```

---

## 📊 CI/CD Best Practices

### 1. Commit Discipline
```bash
# Good commit messages
git commit -m "feat: add salary export feature"
git commit -m "fix: correct RLS policy for Viewer"

# Avoid
git commit -m "stuff"
git commit -m "update"
```

### 2. Branch Protection

**GitHub Settings → Branch protection:**
- ✅ Require PR reviews (at least 1)
- ✅ Require status checks pass (build + lint)
- ✅ Dismiss stale reviews (when code changes)

### 3. Secrets Management

| DO ✅ | DON'T ✗ |
|------|---------|
| Store in GitHub Secrets | Commit to git |
| Rotate tokens regularly | Share via Slack |
| Use fine-grained PATs | Use personal tokens |
| Encrypt backups | Store plaintext |

### 4. Testing Before Merge

```bash
# Local testing before PR
npm run lint
npm run build
npm run dev

# Manual QA
# 1. Test login
# 2. Test imports
# 3. Test exports
# 4. Test role-based access
```

---

## 🔄 Maintenance Tasks

### Weekly
- [ ] Review GitHub Actions logs for failures
- [ ] Check Vercel deployment status
- [ ] Verify backups completed

### Monthly
- [ ] Rotate Vercel token (for security)
- [ ] Review failed deployments
- [ ] Update Node.js version if new LTS released
- [ ] Check for security updates

### Quarterly
- [ ] Full disaster recovery test
- [ ] Review & update CI/CD config
- [ ] Performance analysis
- [ ] Security audit of secrets

---

## 📚 Useful Commands

```bash
# View GitHub secret (value hidden)
gh secret list

# Delete a secret
gh secret delete VERCEL_TOKEN

# Set/update a secret
gh secret set VERCEL_TOKEN --body "new-token"

# View specific workflow runs
gh run list --workflow=deploy.yml

# View latest workflow run
gh run list --limit 1

# View logs of specific run
gh run view <run-id> --log
```

---

## ✅ Deployment Runbook

**New developer joining team:**
```
1. Clone repo: git clone https://github.com/...
2. Read DEPLOY.md and this guide
3. No local changes needed - CI/CD handles deploy
4. Make changes → Push to branch
5. GitHub Actions automatically tests
6. Create PR → GitHub Actions tests again
7. Merge to main → Automatic production deploy
```

**Emergency Hotfix:**
```
1. Create branch: git checkout -b hotfix/critical-bug
2. Fix code
3. Push: git push origin hotfix/critical-bug
4. Create PR to main (mark as "hotfix")
5. Fast-track approval + merge
6. GitHub Actions deploys automatically
7. Monitor Vercel dashboard for completion
```

---

## 🎯 Success Metrics

- [ ] Build time < 3 minutes
- [ ] 100% of deployments succeed
- [ ] 0% downtime during deploy
- [ ] Preview URLs work for all PRs
- [ ] Rollback works within 2 minutes

---

## 📞 Support

**Issues with:**
- GitHub Actions → https://docs.github.com/en/actions
- Vercel Deployments → https://vercel.com/docs/deployments/overview
- Environment Secrets → https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

**Last Updated:** December 2024
**Maintained By:** DevOps Team
