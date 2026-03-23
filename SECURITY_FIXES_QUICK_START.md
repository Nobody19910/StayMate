# StayMate Security Fixes — Quick Start Guide

## 🔴 CRITICAL: Fix These First (8–10 hours)

### 1. `/api/push-subscribe` — Add Authentication
**Before:**
```typescript
const { userId, subscription } = await req.json();
// ❌ Accepts any userId from client
```

**After:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { subscription } = await req.json();
await supabase.from("push_subscriptions").upsert({
  user_id: user.id,  // ✅ Use authenticated user
  endpoint: subscription.endpoint,
  p256dh: subscription.keys.p256dh,
  auth: subscription.keys.auth,
}, { onConflict: "user_id,endpoint" });
```

**Time:** 30 min

---

### 2. `/api/push-notify` — Add Authorization Check
**Before:**
```typescript
const { userId, title, body, url } = await req.json();
// ❌ No check if caller is admin
```

**After:**
```typescript
// Verify caller is admin
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

if (profile?.role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Now safe to send
const { userId, title, body, url } = await req.json();
// ... send notification
```

**Time:** 45 min

---

### 3. `/api/upload-image` — Add Ownership Validation
**Before:**
```typescript
const { file, userId, path } = await formData.get(...);
// ❌ No check if user owns the property
await supabase.storage.from("listing-images").upload(path, buffer);
```

**After:**
```typescript
// Get authenticated user
const authHeader = request.headers.get("authorization");
const token = authHeader?.slice(7);
const { data: { user } } = await supabase.auth.getUser(token);

const { propertyId, propertyType } = await formData.get(...);

// Verify user owns property
const table = propertyType === "home" ? "homes" : "hostels";
const ownerField = propertyType === "home" ? "owner_id" : "manager_id";

const { data: property } = await supabase
  .from(table)
  .select("id")
  .eq("id", propertyId)
  .eq(ownerField, user.id)
  .single();

if (!property) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Safe path: use UUID, not user input
const safePath = `${propertyType}/${propertyId}/${crypto.randomUUID()}.jpg`;
await supabase.storage.from("listing-images").upload(safePath, buffer);
```

**Time:** 2 hours

---

### 4. Remove Mock OTP from Login
**Before:**
```typescript
function handleOtp(e: React.FormEvent) {
  if (otp === "123456") {  // ❌ Anyone can use this
    router.push("/homes");
  }
}
```

**After:**
```typescript
async function handleLogin(e: React.FormEvent) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setError(error.message);
  } else {
    router.push("/homes");  // ✅ Supabase handles auth
  }
}
// Remove OTP step entirely
```

**Time:** 15 min

---

### 5. Implement Paystack Webhook Verification
**Create:** `src/app/api/paystack-webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
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
      const { reference, metadata } = data;

      // Mark booking as paid (only if payment verified by Paystack)
      await supabase
        .from("bookings")
        .update({
          status: "fee_paid",
          payment_reference: reference
        })
        .eq("id", metadata.booking_id);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

**Also update chat page to remove client-side payment marking:**
```typescript
// ❌ Remove this:
onSuccess: async (reference) => {
  await supabase.from("bookings").update({ status: "fee_paid", payment_reference: reference }).eq("id", booking.id);
},

// ✅ Replace with:
onSuccess: async (reference) => {
  // Payment is now verified server-side via webhook
  // Just refresh booking status from DB
  const { data } = await supabase.from("bookings").select("*").eq("id", booking.id).single();
  if (data) setBooking(data);
},
```

**Time:** 3 hours

---

### 6. Re-Enable Admin Auth Guard
**File:** `src/app/(admin)/inbox/page.tsx`

Restore the auth check (currently commented out):
```typescript
useEffect(() => {
  if (!profile || profile.role !== "admin") {
    router.push("/");
  }
}, [profile, router]);
```

**Time:** 5 min

---

## 🟠 HIGH: Fix These Second (6–8 hours)

### 7. Add Rate Limiting
Install: `npm install @upstash/ratelimit @upstash/redis`

Create `lib/rate-limit.ts`:
```typescript
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
```

Add to `/api/push-notify`:
```typescript
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await enforceRateLimit(`push-notify:${user.id}`);
  }
  // ... rest of endpoint
}
```

**Time:** 1.5 hours

---

### 8. Add CSRF Protection to API Routes
```typescript
export async function POST(req: NextRequest) {
  // Verify origin
  const origin = req.headers.get("origin");
  const allowedOrigins = ["https://staymate.app", "http://localhost:3000"];

  if (!origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  // ... rest of endpoint
}
```

**Time:** 30 min

---

### 9. Fix RLS for Push Subscriptions
**File:** Run in Supabase SQL Editor

```sql
-- Drop overly permissive policy
drop policy if exists "Service role reads all" on push_subscriptions;

-- Only admins can read (to send notifications)
create policy "Admins can read push subs" on push_subscriptions
  for select using (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can only see their own
create policy "Users read own push subs" on push_subscriptions
  for select using (auth.uid() = user_id);
```

**Time:** 30 min

---

### 10. Add Audit Logging
Create migration `supabase/migrations/028_audit_logging.sql`:

```sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

alter table audit_logs enable row level security;

create policy "Admins read logs" on audit_logs
  for select using (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Log booking status changes
create or replace function audit_booking_update()
returns trigger as $$
begin
  if NEW.status != OLD.status then
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'booking_status_change', 'bookings', NEW.id::text, row_to_json(OLD), row_to_json(NEW));
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger bookings_audit after update on bookings for each row execute function audit_booking_update();
```

**Time:** 2 hours

---

## 🟡 MEDIUM: Fix These Later (4–6 hours)

### 11. Encrypt Payment References
Store encrypted in DB instead of plaintext.

### 12. Mask Owner Phone Until Payment Confirmed
Show only last 4 digits until `booking.status === "fee_paid"`.

### 13. Add Data Retention Policy
Archive messages older than 2 years.

---

## Checklist

```
Phase 1: Critical (8–10 hrs)
- [ ] Fix /api/push-subscribe auth
- [ ] Fix /api/push-notify authz
- [ ] Fix /api/upload-image ownership
- [ ] Remove mock OTP
- [ ] Add Paystack webhook verification
- [ ] Re-enable admin auth guard

Phase 2: High (6–8 hrs)
- [ ] Add rate limiting
- [ ] Add CSRF protection
- [ ] Fix RLS for push subscriptions
- [ ] Add audit logging

Phase 3: Medium (4–6 hrs)
- [ ] Encrypt payment references
- [ ] Mask phone numbers
- [ ] Data retention policy

TOTAL: ~15–20 hours to production-ready
```

---

## Testing

After each fix, test:

```bash
# Test push-subscribe with wrong userId
curl -X POST http://localhost:3000/api/push-subscribe \
  -H "Content-Type: application/json" \
  -d '{"userId":"attacker-id","subscription":{...}}'
# Should return 401 Unauthorized

# Test push-notify without admin role
curl -X POST http://localhost:3000/api/push-notify \
  -H "Content-Type: application/json" \
  -d '{"userId":"target-id","title":"Fake","body":"Hack"}'
# Should return 401 or 403

# Test upload-image with wrong property owner
# Should return 403 Forbidden
```

---

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [RLS Policies](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Paystack Webhook](https://paystack.com/developers/api#webhook)

