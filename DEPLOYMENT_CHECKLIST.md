# Deployment Checklist & Manual Testing Guide

## 📋 Pre-Deployment Checklist (2-3 hours before deploy)

### Code Quality & Security
- [ ] Run `npm run lint` - all checks pass ✓
- [ ] Run `npm run build` - production build succeeds ✓
- [ ] Check for console.error in browser DevTools
- [ ] Manually test login/logout flow
- [ ] Verify no hardcoded secrets in code
- [ ] Review DEPLOY.md and document any custom steps
- [ ] Ensure `.env.production.local` is in `.gitignore`

### Database Preparation
- [ ] Create Supabase production project
- [ ] Get production URL + API keys
- [ ] Run all migrations from `schema.sql`
- [ ] Enable RLS on all tables (see SUPABASE_PRODUCTION.md)
- [ ] Test audit trigger works with UPDATE/DELETE
- [ ] Verify all functions exist: `recalculate_luong_ngay`, `write_audit_log`
- [ ] Create test user with:
  - [ ] Admin role
  - [ ] KeToan role
  - [ ] Viewer role
- [ ] Test RLS policies allow correct access

### Environment Setup
- [ ] Add Vercel environment variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (production only)
- [ ] Verify GitHub Actions secrets set:
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
  - [ ] `SLACK_WEBHOOK_URL` (optional)
- [ ] Test GitHub Actions workflow with dry-run

### Custom Domain (if applicable)
- [ ] Purchase domain
- [ ] Add DNS records to Vercel
- [ ] Wait for DNS propagation (up to 24h)
- [ ] Verify SSL certificate issued

---

## 🚀 Deployment Day (2-3 minutes)

### 1. Final Code Check
```bash
# Verify everything is committed and pushed to main
git status          # Should be clean
git log --oneline   # Last commit should be deployment-ready

# Verify build still works
npm run build
npm run lint
```

### 2. Trigger Deployment
```bash
# Via Vercel dashboard
# 1. Go to https://vercel.com/deployments
# 2. Your project should be in "Queued" or "Building" state
# 3. Click "Redeploy" if needed
# OR push to main branch
git push origin main
```

### 3. Monitor Build
- [ ] Vercel dashboard shows build in progress
- [ ] Check build logs for errors
- [ ] Wait for "Deployment Successful" message
- [ ] Note the Deployment URL

---

## ✅ Post-Deployment Testing (Immediate - 15 minutes)

### 1. Access the Application
```bash
# Test deployment URL works
curl -I https://your-deployment-url.vercel.app
# Should see HTTP/2 200 OK
```

### 2. Test Authentication Flow

**Login Flow:**
- [ ] Visit deployment URL
- [ ] Should redirect to `/login` (not authenticated)
- [ ] See Supabase login form
- [ ] Attempt login with test Admin user
  - Email: `admin@test.com`
  - Password: `TestPassword123!`
- [ ] Should see dashboard after login
- [ ] Admin role features visible (Import, Audit Log)

**Verify Role-Based Navigation:**
- [ ] Switch to Admin user → See full menu
- [ ] Switch to KeToan user → See limited menu
- [ ] Switch to Viewer user → See only "Lương của tôi" + "Chấm công của tôi"

### 3. Test Admin Features

**Import Page:**
- [ ] Navigate to `/import`
- [ ] See 4 tabs: Chấm công, Phiếu cân, Lương, Công nợ
- [ ] Drag-drop small test file (< 10 rows)
- [ ] Test column mapping works
- [ ] Test validate button
- [ ] Check dry-run shows expected results
- [ ] Verify import completes without errors

**Audit Log Page:**
- [ ] Navigate to `/audit-log`
- [ ] See filter form: date range, table, action, user
- [ ] Apply filters and verify results
- [ ] Click to expand JSON old/new values
- [ ] Check pagination works (if > 20 rows)

### 4. Test Viewer Features (Employee Login)

**Personal Salary Page:**
- [ ] Login as Viewer/employee account
- [ ] Navigate to `/my-salary`
- [ ] Should NOT see import/audit log links
- [ ] Select month from dropdown
- [ ] Verify salary table loads with data
- [ ] Test Excel export:
  - [ ] Click "Xuất Excel"
  - [ ] File downloads as `.xlsx`
  - [ ] Open file in Excel/Sheets
  - [ ] Verify formatting + data accuracy

**Personal Attendance Page:**
- [ ] Navigate to `/my-attendance`
- [ ] Select month from dropdown
- [ ] Calendar view appears with attendance data
- [ ] Click dates to see details (check-in, check-out)
- [ ] Verify table shows all days of month
- [ ] Test status filtering (if any)

### 5. Test Recalculation Logic (Optional - Dev Mode)

If deployed to staging first:
- [ ] Navigate to `/dev/test-recalculation`
- [ ] Should see 4 scenario buttons (A, B, C, D)
- [ ] Click "Scenario A" → Wait for result
- [ ] Should show "PASS" or "FAIL"
- [ ] Review salary distribution in table
- [ ] Run all 4 scenarios → All should PASS

### 6. Test Database Connectivity

Check if data persists:
- [ ] Create test attendance record
- [ ] Refresh page → Data still there
- [ ] Edit record
- [ ] Verify change persisted in database
- [ ] Check audit log shows the update

### 7. Check Error Handling

**Test error scenarios:**
- [ ] Try accessing without authentication → Should redirect to login
- [ ] Try accessing admin page as Viewer → Should redirect to dashboard
- [ ] Try importing invalid file format → Should show error message
- [ ] Try uploading huge file (>100MB) → Should handle gracefully

---

## 📊 Week 1 Monitoring (Ongoing)

### Daily Checks
```bash
# Check deployment health
curl -I https://your-deployment-url.vercel.app

# Check for error spikes in Vercel Analytics
# Dashboard → Analytics → Web Analytics
# Look for 5xx errors, high latency
```

- [ ] Vercel dashboard shows healthy deployment
- [ ] No 5xx errors in logs
- [ ] Response times < 500ms
- [ ] Database connections stable
- [ ] No RLS permission denied errors
- [ ] User login flows working

### Database Monitoring
- [ ] Check Supabase dashboard
- [ ] CPU usage < 70%
- [ ] Memory < 80%
- [ ] Connection pool not exhausted
- [ ] Backup completed successfully

### Feature Verification
- [ ] Import functionality working for all users
- [ ] Audit log recording changes
- [ ] Salary/attendance data accurate
- [ ] Excel exports formatting correctly
- [ ] Email notifications sending (if configured)

### User Testing
- [ ] Ask 2-3 real users to test
- [ ] Check for complaints about:
  - [ ] Slow performance
  - [ ] Missing data
  - [ ] Login issues
  - [ ] Export problems

---

## 🔧 Post-Deployment Configuration (Week 1)

### 1. Setup Monitoring & Alerts

**Vercel Alerts:**
```
1. Go to Settings → Alerts
2. Configure:
   - Build failures → Email
   - High error rate (>1%) → Email
   - Response time > 1000ms → Slack (optional)
3. Test alert by triggering build failure
```

**Supabase Alerts:**
```
1. Dashboard → Settings → Alerts
2. Configure:
   - CPU > 80% → Email
   - Memory > 85% → Email
   - Connections > 80 → Email
3. Monitor for 1 week
```

### 2. Setup Backups

**Supabase:**
```
1. Settings → Backups
2. Enable:
   ✓ Daily backups
   ✓ Point-in-time recovery
   ✓ Store backups in S3 (optional)
3. Note backup retention policy
```

### 3. Document Incident Response

Create `INCIDENT_RESPONSE.md`:
```markdown
# Incident Response Plan

## If deployment breaks:
1. Revert to previous version in Vercel
2. Notify admins in Slack
3. RCA within 24h

## If database corrupted:
1. Stop all writes
2. Restore from backup
3. Verify data integrity

## Contact list:
- Admin: admin@company.com
- DBA: dba@company.com
- On-call: (phone)
```

### 4. Create Runbook

**Example Runbook Entry:**
```markdown
## Slow queries

**Symptoms:** Page loads taking 5+ seconds

**Diagnosis:**
1. Check Supabase Analytics → Slow Queries
2. Look for queries taking >1000ms

**Fix:**
1. Add index: CREATE INDEX idx_cham_cong_ngay ON cham_cong(ngay);
2. Run VACUUM ANALYZE;
3. Test performance
```

---

## 🐛 Troubleshooting During Testing

### "Cannot connect to Supabase"
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify URL format
# Should be: https://xxxxx.supabase.co (no trailing slash)

# Test from browser console
const { createClient } = window.supabaseClient;
console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
```

### "Row level security policy perm denied"
```bash
# Verify user is logged in
supabase.auth.getUser(); // Should return user object

# Check RLS policies
# Supabase → SQL Editor → Run:
SELECT * FROM pg_policies WHERE tablename = 'profiles';

# Temporarily disable RLS for testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Excel export not working
```bash
# Check browser console for errors
# Check if exceljs library is bundled

# Test Excel generation
npm test  # or manual test in browser DevTools
const workbook = new ExcelJS.Workbook();
console.log(workbook); // Should show object
```

### Login redirects to wrong page
```bash
# Check middleware logic
lib/supabase/middleware.ts

# Verify role is set in profiles table
SELECT id, email, role FROM auth.users;
```

---

## ✨ Success Criteria (All should be YES before declaring success)

- [ ] Homepage loads in < 2 seconds
- [ ] Login/logout works for all roles
- [ ] Admin can import data
- [ ] Audit log shows all changes
- [ ] Viewer can see personal data
- [ ] Excel export works
- [ ] No console errors in DevTools
- [ ] Database backups running
- [ ] Monitoring alerts configured
- [ ] Team trained on procedures
- [ ] Incident response documented
- [ ] Performance baseline established

---

## 📞 Support & Escalation

**Issue During Testing:**
1. Check logs: Vercel → Logs
2. Check database: Supabase → SQL Editor
3. Search GitHub issues: https://github.com/vercel/next.js/issues
4. Contact Vercel support: https://vercel.com/support
5. Contact Supabase support: https://supabase.com/support

**Team Contacts:**
- **Lead Dev**: [name]
- **DevOps**: [name]
- **Product**: [name]
- **On-Call**: [rotation]

---

## 📝 Sign-Off

Deployment completed on: ______________
Tested by: ______________
Approved by: ______________
Deployment status: [ ] Production Ready [ ] Failed - Rollback

---

**Remember:** Test thoroughly in staging before production. Never deploy on Friday! 😅
