# StayMate Security Audit Report
**Date:** March 17, 2026
**Scope:** Full-stack security analysis of Next.js frontend, API routes, Supabase backend, and deployment
**Risk Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Executive Summary

StayMate has **critical security vulnerabilities** that must be fixed immediately before production deployment. The application prioritizes rapid iteration over security hardening, leaving multiple attack vectors open. **Do not expose this system to the public internet without fixing critical issues.**

**Critical Issues Count:** 5
**High Issues Count:** 8
**Medium Issues Count:** 6

---

## 1. API ENDPOINT VULNERABILITIES 🔴 CRITICAL

### 1.1 `/api/push-subscribe` — No Authentication

**File:** `src/app/api/push-subscribe/route.ts` (lines 9-25)

**Vulnerability:** Accepts `userId` from client without validating authentication.

```typescript
const { userId, subscription } = await req.json();
// ❌ No check that the request is authenticated as `userId`
await supabase.from("push_subscriptions").upsert({
  user_id: userId,
  endpoint,
  p256dh: keys.p256dh,
  auth: keys.auth,
}, { onConflict: "user_id,endpoint" });
```

**Attack:** User A can subscribe User B to push notifications by sending `userId: B` in the request body. User B will receive all future notifications intended for A.

**Impact:** 🔴 Critical — Unauthorized subscription manipulation, denial-of-service (spam notifications).

**Fix:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Step 1: Get authenticated user from session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription } = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Step 2: Ensure subscription is for the authenticated user only
    const { endpoint, keys } = subscription;
    await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,  // ✅ Use authenticated user, not client-provided userId
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

---

### 1.2 `/api/push-notify` — No Authorization Check

**File:** `src/app/api/push-notify/route.ts` (lines 20-30)

**Vulnerability:** Accepts `userId` without validating the caller is authorized to send notifications.

```typescript
const { userId, title, body, url } = await req.json();
if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

const { data: subs } = await supabase
  .from("push_subscriptions")
  .select("*")
  .eq("user_id", userId);
// ❌ No check: is the caller an admin? The owner? Anyone can trigger notifications for anyone.
```

**Attack:** Any authenticated user can send notifications to any other user, impersonating StayMate admin. Example: seeker sends a fake "Inquiry Accepted" notification to another seeker.

**Impact:** 🔴 Critical — Notification spoofing, social engineering, fraud.

**Fix:**
```typescript
export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Step 1: Authenticate the request
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data, error: authError } = await supabase.auth.getUser(token);
    if (authError || !data.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Step 2: Check that caller is admin (only admins can send notifications)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    }

    // Step 3: Only then proceed to send
    const { userId, title, body, url } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // ... rest of notification send logic
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

---

### 1.3 `/api/upload-image` — No Ownership Validation

**File:** `src/app/api/upload-image/route.ts` (lines 14-26)

**Vulnerability:** Accepts `userId` and `path` from client without validating that the user owns the property being updated.

```typescript
const { file, userId, path } = await formData.get(...);
if (!file || !userId || !path) return error;

const buffer = Buffer.from(await file.arrayBuffer());
const { error, data } = await supabase.storage
  .from("listing-images")
  .upload(path, buffer, { upsert: false });
// ❌ No check: does userId own the property at path?
// ❌ No check: is path valid (could be `/../../sensitive_file`)?
```

**Attack:** User A uploads an image to `homes/user-b-property-id/image.jpg`, overwriting User B's property photos. Also vulnerable to path traversal if validation is weak.

**Impact:** 🔴 Critical — Unauthorized file uploads, property data tampering, storage exhaustion.

**Fix:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const propertyId = formData.get("propertyId") as string;  // Changed from userId + path
    const propertyType = formData.get("propertyType") as string;  // "home" | "hostel"

    if (!file || !propertyId || !propertyType) {
      return NextResponse.json(
        { error: "Missing file, propertyId, or propertyType" },
        { status: 400 }
      );
    }

    // Step 1: Authenticate the user
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Step 2: Verify user owns the property
    const table = propertyType === "home" ? "homes" : "hostels";
    const ownerField = propertyType === "home" ? "owner_id" : "manager_id";

    const { data: property, error: propertyError } = await supabase
      .from(table)
      .select("id")
      .eq("id", propertyId)
      .eq(ownerField, userData.user.id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found or you do not own it" },
        { status: 403 }
      );
    }

    // Step 3: Validate file type and size
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images allowed." },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024;  // 5 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Max 5 MB." },
        { status: 400 }
      );
    }

    // Step 4: Generate safe path using UUID
    const fileExt = file.type.split("/")[1];
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const safePath = `${propertyType}/${propertyId}/${fileName}`;

    // Step 5: Upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError, data } = await supabase.storage
      .from("listing-images")
      .upload(safePath, buffer, { upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(safePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: safePath,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
```

---

## 2. AUTHENTICATION & AUTHORIZATION VULNERABILITIES 🟠 HIGH

### 2.1 Mock OTP in Production Code

**File:** `src/app/login/page.tsx` (lines 42-46)

**Vulnerability:** Hardcoded OTP "123456" accepted in production code. This is development-only and must never reach production.

```typescript
function handleOtp(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setLoading(true);

  // ❌ CRITICAL: This OTP check is hardcoded in client-side code
  if (otp === "123456") {
    router.push("/homes");
  } else {
    setLoading(false);
    setError("Invalid OTP. Please use 123456 for testing.");
  }
}
```

**Attack:** Anyone can log in with any email + OTP "123456". No actual verification happens server-side.

**Impact:** 🔴 Critical — Broken authentication, unauthorized access.

**Fix:**
- **Remove client-side OTP validation entirely.**
- Implement server-side OTP verification via Supabase Auth MFA or custom API.
- Use Supabase's built-in `signInWithPassword` without additional OTP for MVP.

```typescript
async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setLoading(true);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setLoading(false);

  if (error) {
    setError(error.message);
  } else {
    // ✅ Supabase handles auth; session is set automatically
    router.push("/homes");
  }
}
```

---

### 2.2 Client-Side Route Guards (No Server-Side Enforcement)

**File:** `src/app/(admin)/inbox/page.tsx` (lines 26-30, 150-160) — Previously disabled

**Vulnerability:** Admin routes check `profile?.role === "admin"` on the client. If the check is bypassed (disabled auth guard), anyone accesses the admin page.

```typescript
// ❌ This guard can be bypassed by disabling it in DevTools
useEffect(() => {
  if (!profile || profile.role !== "admin") {
    router.push("/");
  }
}, [profile, router]);
```

**Attack:** Disable this guard → access admin dashboard → query all conversations, messages, bookings.

**Impact:** 🟠 High — Privilege escalation, data exposure.

**Fix:**
- **Re-enable the auth guard immediately** (restore original code).
- Add server-side middleware to validate admin role before rendering the page.
- Use Next.js middleware to block non-admin access at the route level.

```typescript
// ✅ middleware.ts
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const isAdminDomain = host.startsWith("admin.");

  if (isAdminDomain && request.nextUrl.pathname === "/inbox") {
    // Verify auth token in the request
    const token = request.cookies.get("sb-auth-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Admin role validation happens on page load (client-side)
  }
  return NextResponse.next();
}
```

---

### 2.3 No Rate Limiting on Login Endpoint

**Vulnerability:** Supabase Auth has rate limiting by default, but custom endpoints like `/api/push-notify` do not.

**Attack:** Brute-force login attempts, spam notifications, DOS.

**Impact:** 🟠 High — Brute-force attacks, resource exhaustion.

**Fix:** Add rate limiting middleware:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),  // 5 attempts per hour
});

export async function enforceRateLimit(key: string) {
  const { success } = await ratelimit.limit(key);
  if (!success) throw new Error("Rate limit exceeded");
  return true;
}

// api/login/route.ts
export async function POST(req: NextRequest) {
  const email = (await req.json()).email;
  await enforceRateLimit(`login:${email}`);
  // ... rest of login logic
}
```

---

## 3. DATABASE SECURITY VULNERABILITIES 🟠 HIGH

### 3.1 Weak RLS Policy for Push Subscriptions

**File:** `supabase/migrations/025_push_subscriptions.sql` (lines 18-20)

**Vulnerability:** Service role policy allows anyone with service key to read all push subscriptions.

```sql
-- ❌ This allows any caller with service role key to read all subscriptions
create policy "Service role reads all" on push_subscriptions
  for select using (true);
```

**Attack:** If service key is leaked, attacker can read all push subscription endpoints, p256dh, and auth keys. These can be used to spoof notifications.

**Impact:** 🟠 High — Notification endpoint exposure, push key leakage.

**Fix:**
```sql
-- Only API routes (with proper auth) can read subscriptions
-- Remove the "true" policy and implement a check that validates
-- the caller is authorized to send notifications to that user

create policy "Admins can read push subs for sending" on push_subscriptions
  for select using (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can only read their own
create policy "Users read own push subs" on push_subscriptions
  for select using (auth.uid() = user_id);
```

---

### 3.2 Missing Audit Logging for Sensitive Operations

**Vulnerability:** No audit trail for admin edits, deletions, booking status changes, or payment operations.

**Attack:** Admin fraudulently modifies booking status → seeker pays fee → admin rejects booking later → no audit trail to detect fraud.

**Impact:** 🟠 High — Fraud risk, compliance violations (financial transactions).

**Fix:** Create audit log table:

```sql
-- supabase/migrations/028_audit_logging.sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete set null,
  action text not null,  -- "booking_accepted", "property_deleted", "payment_received"
  table_name text not null,
  record_id text not null,
  old_data jsonb,
  new_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;

create policy "Admins can read audit logs" on audit_logs
  for select using (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Trigger to log admin updates
create or replace function audit_booking_update()
returns trigger as $$
begin
  if NEW.status != OLD.status then
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'booking_status_change', 'bookings', NEW.id::text,
            row_to_json(OLD), row_to_json(NEW));
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger bookings_audit
  after update on bookings for each row
  execute function audit_booking_update();
```

---

### 3.3 Payment Reference Stored in Plaintext

**File:** `supabase/migrations/026_noir_estate.sql` (line 25)

**Vulnerability:** Paystack payment reference stored in plaintext in `bookings.payment_reference`.

```sql
alter table bookings
  add column if not exists payment_reference text;
-- ❌ No encryption, visible to anyone with DB access
```

**Attack:** If database is breached, attacker can see all payment references and use them for refund fraud.

**Impact:** 🟡 Medium → 🟠 High (if financial data regulations apply).

**Fix:** Encrypt payment references:

```sql
-- Add encrypted column
alter table bookings
  add column if not exists payment_reference_encrypted text;

-- Trigger to encrypt before insert
create or replace function encrypt_payment_reference()
returns trigger as $$
begin
  if NEW.payment_reference is not null then
    NEW.payment_reference_encrypted := pgp_sym_encrypt(
      NEW.payment_reference,
      current_setting('app.encryption_key')
    );
    NEW.payment_reference := null;  -- Remove plaintext
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger bookings_encrypt_payment
  before insert or update on bookings for each row
  execute function encrypt_payment_reference();
```

---

## 4. PROXY & SUBDOMAIN ROUTING VULNERABILITIES 🟡 MEDIUM

### 4.1 Host Header Injection Potential

**File:** `src/proxy.ts` (line 5)

**Vulnerability:** Proxy reads `host` header from request without validation. If deployed with misconfigured reverse proxy, could be manipulated.

```typescript
const host = request.headers.get("host") ?? "";
const isAdminDomain = host.startsWith("admin.");
// ❌ Host header can be spoofed in some deployment configurations
```

**Attack:** If reverse proxy forwards a spoofed host header, attacker bypasses domain checks.

**Impact:** 🟡 Medium — Domain isolation bypass (Vercel is safe by default, but edge cases exist).

**Fix:**
```typescript
// Use environment-based domain detection instead of host header
const adminDomains = ["admin.staymate.app", "admin.localhost:3000"];
const seekerDomains = ["staymate.app", "localhost:3000"];

const host = request.headers.get("host") ?? "";
const isAdminDomain = adminDomains.includes(host);
const isSeekerDomain = seekerDomains.includes(host);

if (!isAdminDomain && !isSeekerDomain) {
  // Unknown domain — reject or redirect to default
  return NextResponse.redirect("https://staymate.app");
}
```

---

### 4.2 API Routes Not Blocked by Proxy

**File:** `src/proxy.ts` (lines 9-15)

**Vulnerability:** API routes are explicitly skipped by proxy (`if pathname.startsWith("/api")`). This is correct, but API endpoints have no auth.

**Impact:** 🟠 High (caused by API auth issues, not proxy).

---

## 5. DATA EXPOSURE VULNERABILITIES 🟡 MEDIUM

### 5.1 Owner Phone Numbers Exposed After Booking

**File:** `src/app/(seeker)/homes/[id]/page.tsx` — Property detail shows owner phone after booking accepted.

**Vulnerability:** Phone numbers visible to seekers after they make a booking. Could enable harassment or doxxing.

**Impact:** 🟡 Medium — Privacy risk (user consent unclear).

**Fix:**
- Show phone numbers only after payment confirmed (`booking.status === "fee_paid"`).
- Mask phone numbers (show only last 4 digits until verified).
- Implement dispute resolution without exposing contact info.

---

### 5.2 Conversation Metadata Visible to Admins

**File:** AdminInbox component fetches all seeker data (names, phones, avatars).

**Vulnerability:** Admins can see all seeker PII without row-level restrictions.

**Impact:** 🟡 Medium — Admin privilege abuse risk.

**Fix:** Implement granular RLS:

```sql
-- Only admins can read conversations; seekers can only read their own
create policy "Admins read all conversations" on conversations
  for select using (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

create policy "Seekers read own conversation" on conversations
  for select using (auth.uid() = seeker_id);
```

---

## 6. THIRD-PARTY INTEGRATION VULNERABILITIES 🟡 MEDIUM

### 6.1 Paystack Webhook Not Verified

**File:** `src/app/(seeker)/chat/page.tsx` (line 254)

**Vulnerability:** Payment status updated based on client-side Paystack callback without server-side verification.

```typescript
onSuccess: async (reference) => {
  // ❌ Client tells server "payment succeeded"
  // ❌ No verification that Paystack actually confirmed payment
  await supabase.from("bookings").update({ status: "fee_paid", payment_reference: reference }).eq("id", booking.id);
  setPayingFee(false);
},
```

**Attack:** User modifies JavaScript → Paystack callback triggers with fake reference → booking marked paid without actual payment.

**Impact:** 🔴 Critical (for financial integrity).

**Fix:** Implement server-side webhook verification:

```typescript
// api/paystack-webhook/route.ts
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-paystack-signature");
  const body = await req.text();

  // Verify webhook signature
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  if (event.event === "charge.success") {
    const { data } = event;
    const supabase = createClient(...);

    // Mark booking as paid
    await supabase
      .from("bookings")
      .update({ status: "fee_paid", payment_reference: data.reference })
      .eq("id", data.metadata.booking_id);
  }

  return NextResponse.json({ ok: true });
}
```

---

### 6.2 No CSRF Protection on API Routes

**Vulnerability:** POST endpoints (`/api/push-notify`, `/api/upload-image`) don't validate CSRF tokens or SameSite cookies.

**Impact:** 🟡 Medium (limited by browser same-site policy, but not foolproof).

**Fix:** Add CSRF validation:

```typescript
export async function POST(req: NextRequest) {
  // Verify origin header
  const origin = req.headers.get("origin");
  const allowedOrigins = ["https://staymate.app", "https://admin.staymate.app", "http://localhost:3000"];

  if (!origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  // ... rest of endpoint
}
```

---

## 7. DEPLOYMENT & ENVIRONMENT VULNERABILITIES 🟢 → 🟡

### 7.1 Service Role Key Empty in .env.local

**Status:** Not vulnerable (intentional design choice).

**Context:** `SUPABASE_SERVICE_ROLE_KEY=""` means API routes cannot bypass RLS policies.

**Trade-off:** Safer (can't leak super-privileges), but limits backend functionality.

**Recommendation:** Keep empty for MVP; enable only for trusted operations if needed.

---

### 7.2 Anon Key Exposed in Client Code

**Status:** Expected (Supabase design pattern).

**Context:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally public for RLS to work.

**Risk:** If anon key is rotated, must redeploy frontend.

**Recommendation:** Monitor key rotation; set up alerts for unauthorized access patterns.

---

## 8. COMPLIANCE & REGULATORY VULNERABILITIES 🟡 → 🟠

### 8.1 No Data Retention Policy

**Vulnerability:** Messages, bookings, and PII retained indefinitely with no purge policy.

**Regulatory Impact:** GDPR right-to-be-forgotten, data minimization.

**Fix:**
```sql
-- Archive messages older than 2 years
create or replace function archive_old_messages()
returns void as $$
begin
  insert into messages_archive
  select * from messages where created_at < now() - interval '2 years';

  delete from messages where created_at < now() - interval '2 years';
end;
$$ language plpgsql;

-- Run weekly
SELECT cron.schedule('archive-messages', '0 0 * * 0', 'SELECT archive_old_messages()');
```

---

### 8.2 No Consent Recording for Data Collection

**Vulnerability:** User signup doesn't record consent for PII storage, phone sharing, payment processing.

**Fix:**
```sql
alter table profiles
  add column if not exists consents jsonb default '{
    "marketing": false,
    "phone_sharing": false,
    "cookies": false,
    "agreed_at": null
  }';
```

---

## 9. SUMMARY TABLE

| Vulnerability | Severity | Fix Time | Priority |
|---|---|---|---|
| `/api/push-subscribe` no auth | 🔴 Critical | 1 hr | **1st** |
| `/api/push-notify` no authz | 🔴 Critical | 1 hr | **1st** |
| `/api/upload-image` no ownership check | 🔴 Critical | 2 hrs | **1st** |
| Mock OTP in production | 🔴 Critical | 30 min | **1st** |
| Disabled auth guards on admin | 🟠 High | 15 min | **2nd** |
| Paystack webhook not verified | 🔴 Critical | 3 hrs | **1st** |
| No rate limiting | 🟠 High | 2 hrs | **2nd** |
| Weak RLS for push subscriptions | 🟠 High | 1 hr | **2nd** |
| No audit logging | 🟠 High | 3 hrs | **2nd** |
| Payment ref plaintext | 🟡 Medium | 2 hrs | **3rd** |
| Host header injection potential | 🟡 Medium | 1 hr | **3rd** |
| Owner phone exposed | 🟡 Medium | 1.5 hrs | **3rd** |
| No CSRF protection | 🟡 Medium | 1.5 hrs | **3rd** |
| No data retention policy | 🟡 Medium | 2 hrs | **3rd** |

---

## 10. RECOMMENDED REMEDIATION ROADMAP

### Phase 1: Critical (Fix Before Public Launch) — ~8-10 hours
1. Add authentication to `/api/push-subscribe` ✅
2. Add authorization to `/api/push-notify` ✅
3. Add ownership validation to `/api/upload-image` ✅
4. Implement Paystack webhook verification ✅
5. Remove mock OTP from login ✅
6. Re-enable auth guards on admin routes ✅

### Phase 2: High (Fix Before Production) — ~6-8 hours
7. Implement rate limiting on API endpoints ✅
8. Add server-side CSRF protection ✅
9. Implement audit logging ✅
10. Restrict RLS for push subscriptions ✅

### Phase 3: Medium (Nice to Have) — ~4-6 hours
11. Encrypt payment references ✅
12. Implement host header validation ✅
13. Mask owner phone numbers until payment confirmed ✅
14. Add data retention policy ✅
15. Record user consent for data collection ✅

---

## 11. TOOLS & RESOURCES

- **Rate Limiting:** [Upstash Ratelimit](https://upstash.com/docs/redis/features/ratelimiting)
- **Encryption:** [TweetNaCl.js](https://tweetnacl.js.org/) or Supabase's `pgcrypto`
- **OWASP Top 10:** [https://owasp.org/www-project-top-ten/](https://owasp.org/www-project-top-ten/)
- **Supabase Security:** [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## Conclusion

**StayMate is NOT production-ready.** Critical vulnerabilities in API authentication, payment verification, and admin access must be fixed immediately. The current code prioritizes rapid iteration and MVP delivery over security hardening — acceptable for local development, unacceptable for public deployment.

**Estimated effort to production-ready:** 15–20 hours of focused security engineering.

**Next step:** Execute Phase 1 remediation (8–10 hours) before any public-facing deployment.
