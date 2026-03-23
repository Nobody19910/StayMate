# StayMate Security Fix Checklist

## 🔴 PHASE 1: CRITICAL ISSUES (6 hours total)

### Issue #1: /api/push-subscribe — No Authentication
- **File:** `src/app/api/push-subscribe/route.ts`
- **Problem:** Accepts `userId` from client without auth check
- **Risk:** User A subscribes User B to notifications
- **Status:** ⬜ TODO

**Steps:**
```
[ ] Read current implementation
[ ] Add: const { data: { user } } = await supabase.auth.getUser();
[ ] Add: if (!user) return 401 Unauthorized
[ ] Change: user_id: userId → user_id: user.id
[ ] Test with curl (provide wrong userId, expect 401)
[ ] Commit: "fix: add auth to push-subscribe endpoint"
```

---

### Issue #2: /api/push-notify — No Authorization
- **File:** `src/app/api/push-notify/route.ts`
- **Problem:** Accepts `userId` without checking if caller is admin
- **Risk:** Seeker sends fake "Inquiry Accepted" notification
- **Status:** ⬜ TODO

**Steps:**
```
[ ] Read current implementation
[ ] Add: const { data: { user } } = await supabase.auth.getUser();
[ ] Add: if (!user) return 401 Unauthorized
[ ] Add: Check if profile.role === "admin"
[ ] Add: if (profile?.role !== "admin") return 403 Forbidden
[ ] Test: Send as non-admin user, expect 403
[ ] Commit: "fix: add authorization check to push-notify"
```

---

### Issue #3: /api/upload-image — No Ownership Validation
- **File:** `src/app/api/upload-image/route.ts`
- **Problem:** No check if user owns the property
- **Risk:** User A overwrites User B's property photos
- **Status:** ⬜ TODO

**Steps:**
```
[ ] Read current implementation
[ ] Change: Accept propertyId + propertyType instead of userId + path
[ ] Add: Authenticate request (get user from auth header)
[ ] Add: Query homes/hostels table for property ownership
[ ] Add: Verify owner_id or manager_id matches authenticated user
[ ] Add: If not owner, return 403 Forbidden
[ ] Add: Generate safe path using UUID (not client input)
[ ] Add: Validate file type (only images)
[ ] Add: Validate file size (max 5MB)
[ ] Test: Upload to property you don't own, expect 403
[ ] Commit: "fix: add ownership validation to upload-image"
```

---

### Issue #4: Mock OTP in Login
- **File:** `src/app/login/page.tsx`
- **Problem:** Hardcoded OTP "123456" in production code
- **Risk:** Anyone can log in with any email
- **Status:** ⬜ TODO

**Steps:**
```
[ ] Read handleOtp function
[ ] Read handleLogin function
[ ] Delete: handleOtp function entirely
[ ] Delete: OTP form UI (lines 73-110 or similar)
[ ] Update: handleLogin to redirect directly after Supabase auth
[ ] Test: Login with email + password (no OTP)
[ ] Commit: "fix: remove mock OTP from login"
```

---

### Issue #5: Paystack Payment Verification
- **File:** Create new `src/app/api/paystack-webhook/route.ts`
- **Problem:** Client says payment succeeded without verification
- **Risk:** Attacker modifies JS → marks booking paid without paying
- **Status:** ⬜ TODO

**Steps:**
```
[ ] Create: src/app/api/paystack-webhook/route.ts
[ ] Add: Signature verification using HMAC-SHA512
[ ] Add: Extract booking_id from metadata
[ ] Add: Update booking status to "fee_paid" if verified
[ ] Add: Store payment reference in DB
[ ] Update: src/app/(seeker)/chat/page.tsx
   [ ] Remove: onSuccess callback that updates booking status
   [ ] Add: Refresh booking status from DB instead
[ ] Get: PAYSTACK_SECRET_KEY from Supabase / env
[ ] Test: Send webhook with invalid signature, expect 401
[ ] Test: Send webhook with valid signature, expect booking updated
[ ] Commit: "feat: add Paystack webhook verification"
```

---

### Issue #6: Re-Enable Admin Auth Guard
- **File:** `src/app/(admin)/inbox/page.tsx`
- **Problem:** Auth guard was disabled, admin page accessible to anyone
- **Risk:** Any user can access admin dashboard
- **Status:** ⬜ TODO

**Steps:**
```
[ ] Open file
[ ] Find: useEffect that checks profile?.role === "admin"
[ ] Uncomment: the entire auth guard check
[ ] Find: Lines that were commented out (150-160)
[ ] Uncomment: the loading/role checks
[ ] Test: Access /inbox as non-admin, expect redirect to home
[ ] Test: Access /inbox as admin, expect dashboard to load
[ ] Commit: "fix: re-enable admin auth guards"
```

---

## 🟠 PHASE 2: HIGH-SEVERITY ISSUES (6 hours total)

### Issue #7: Add Rate Limiting
- **Files:** New `lib/rate-limit.ts`, update API routes
- **Problem:** No rate limiting on endpoints
- **Risk:** Brute-force, spam
- **Status:** ⬜ TODO

**Steps:**
```
[ ] npm install @upstash/ratelimit @upstash/redis
[ ] Create: lib/rate-limit.ts (see SECURITY_FIXES_QUICK_START.md)
[ ] Add: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN to .env
[ ] Import: enforceRateLimit in /api/push-notify
[ ] Add: await enforceRateLimit(`push-notify:${user.id}`)
[ ] Test: Send multiple requests, expect rate limit error
[ ] Commit: "feat: add rate limiting to API endpoints"
```

---

### Issue #8: Fix RLS for Push Subscriptions
- **Files:** Supabase migrations
- **Problem:** "Service role reads all" policy too permissive
- **Risk:** Service key leak exposes all push endpoints
- **Status:** ⬜ TODO

**Steps:**
```
[ ] Go to: Supabase SQL Editor
[ ] Run: DROP POLICY "Service role reads all" on push_subscriptions;
[ ] Run: CREATE POLICY "Admins can read push subs..." (see guide)
[ ] Run: CREATE POLICY "Users read own push subs..."
[ ] Test: Non-admin query push_subscriptions, expect 0 rows
[ ] Test: Admin query push_subscriptions, expect all rows
[ ] Commit: "fix: restrict RLS policies for push_subscriptions"
```

---

### Issue #9: Add Audit Logging
- **Files:** New migration, add triggers
- **Problem:** No audit trail for sensitive operations
- **Risk:** Can't detect fraud
- **Status:** ⬜ TODO

**Steps:**
```
[ ] Create: supabase/migrations/028_audit_logging.sql
[ ] Add: audit_logs table with columns
[ ] Add: RLS policies for admins to read logs
[ ] Add: Trigger function: audit_booking_update()
[ ] Add: Trigger on bookings table
[ ] Run: migration in Supabase
[ ] Test: Update booking status, check audit_logs
[ ] Commit: "feat: add audit logging for sensitive operations"
```

---

### Issue #10: Add CSRF Protection
- **Files:** Update all API routes
- **Problem:** No Origin validation
- **Risk:** Cross-site POST attacks
- **Status:** ⬜ TODO

**Steps:**
```
[ ] Add to: src/app/api/push-subscribe/route.ts (start of function)
   [ ] const origin = req.headers.get("origin");
   [ ] Validate origin against whitelist
   [ ] Return 403 if invalid
[ ] Repeat for: push-notify, upload-image, paystack-webhook
[ ] Test: POST from different origin, expect 403
[ ] Commit: "fix: add CSRF protection to API routes"
```

---

## 🟡 PHASE 3: MEDIUM-SEVERITY ISSUES (5 hours total)

### Issue #11: Encrypt Payment References
- **Files:** Migration to add encryption
- **Status:** ⬜ TODO

```
[ ] Create migration with pgcrypto
[ ] Add column: payment_reference_encrypted
[ ] Create trigger: encrypt_payment_reference()
[ ] Remove plaintext column from results
[ ] Test: Payment reference stored encrypted
[ ] Commit: "feat: encrypt payment references in database"
```

---

### Issue #12: Mask Owner Phone Numbers
- **Files:** Property detail pages
- **Status:** ⬜ TODO

```
[ ] Find where phone is displayed
[ ] Add condition: only show if booking.status === "fee_paid"
[ ] Otherwise: show masked version (***-****-7890)
[ ] Test: View property before/after payment
[ ] Commit: "fix: mask owner phone until payment confirmed"
```

---

### Issue #13: Add Data Retention Policy
- **Files:** Migration + scheduled job
- **Status:** ⬜ TODO

```
[ ] Create migration with archive function
[ ] Enable pg_cron extension
[ ] Schedule: archive_old_messages weekly
[ ] Test: Messages >2 years old moved to archive
[ ] Commit: "feat: add data retention policy"
```

---

### Issue #14: Validate Host Header
- **Files:** src/proxy.ts
- **Status:** ⬜ TODO

```
[ ] Add: Whitelist of allowed domains
[ ] Change: host.startsWith("admin.") → allowedAdminDomains.includes(host)
[ ] Test: Invalid domain, expect redirect
[ ] Commit: "fix: validate host header in proxy"
```

---

### Issue #15: Record User Consent
- **Files:** Migration + signup form
- **Status:** ⬜ TODO

```
[ ] Create migration: add consents jsonb column to profiles
[ ] Add checkboxes to signup form
[ ] Store consent object in profiles table
[ ] Display privacy policy + terms
[ ] Commit: "feat: record user consent for data collection"
```

---

## 📊 Progress Tracker

**Phase 1: CRITICAL (6 hours)**
```
[1/6] Issue #1: /api/push-subscribe auth          ⬜
[2/6] Issue #2: /api/push-notify authz            ⬜
[3/6] Issue #3: /api/upload-image ownership       ⬜
[4/6] Issue #4: Remove mock OTP                   ⬜
[5/6] Issue #5: Paystack webhook verification     ⬜
[6/6] Issue #6: Re-enable admin auth guards       ⬜

PHASE 1 COMPLETE: ▯▯▯▯▯▯▯▯▯▯ 0%
```

**Phase 2: HIGH (6 hours)**
```
[1/5] Issue #7: Rate limiting                     ⬜
[2/5] Issue #8: Fix RLS for push_subscriptions   ⬜
[3/5] Issue #9: Audit logging                     ⬜
[4/5] Issue #10: CSRF protection                  ⬜

PHASE 2 COMPLETE: ▯▯▯▯▯▯▯▯▯▯ 0%
```

**Phase 3: MEDIUM (5 hours)**
```
[1/5] Issue #11: Encrypt payment refs             ⬜
[2/5] Issue #12: Mask phone numbers               ⬜
[3/5] Issue #13: Data retention policy            ⬜
[4/5] Issue #14: Validate host header             ⬜
[5/5] Issue #15: Record user consent              ⬜

PHASE 3 COMPLETE: ▯▯▯▯▯▯▯▯▯▯ 0%
```

---

## 🎯 Starting Point

1. Start with **Issue #4** (Remove mock OTP) — fastest, 15 min
2. Then **Issue #1** (push-subscribe auth) — 30 min
3. Then **Issue #2** (push-notify authz) — 45 min
4. Then tackle **Issue #3** (upload-image) — 2 hours
5. Finally **Issue #5** (Paystack webhook) — 3 hours

After Phase 1 is complete, you can launch to beta. Phase 2 is needed before public launch.

