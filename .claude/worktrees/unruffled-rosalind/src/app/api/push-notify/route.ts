export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import { firebaseAdmin } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  // Set VAPID details inside the handler so env vars are available at runtime
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
    // Verify caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 30 requests per 60 seconds per user
    const rl = checkRateLimit(`push-notify:${user.id}`, { limit: 30, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { userId, title, body, url } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // Prevent users from sending push to themselves
    if (userId === user.id) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let sent = 0;
    const stale: string[] = [];

    // Split subscriptions into FCM (native) and Web Push
    const fcmSubs = subs.filter((s) => s.endpoint.startsWith("fcm://"));
    const webSubs = subs.filter((s) => !s.endpoint.startsWith("fcm://"));

    // Send via FCM for native Capacitor tokens
    if (fcmSubs.length > 0) {
      const fcmTokens = fcmSubs.map((s) => s.endpoint.replace("fcm://", ""));
      try {
        const response = await firebaseAdmin.messaging().sendEachForMulticast({
          tokens: fcmTokens,
          notification: { title: title ?? "StayMate", body: body ?? "" },
          data: { url: url ?? "/chat" },
          android: {
            priority: "high",
            notification: { channelId: "staymate_default", sound: "default" },
          },
          apns: {
            payload: { aps: { sound: "default", badge: 1 } },
          },
        });
        response.responses.forEach((r, i) => {
          if (r.success) {
            sent++;
          } else if (
            r.error?.code === "messaging/registration-token-not-registered" ||
            r.error?.code === "messaging/invalid-registration-token"
          ) {
            stale.push(fcmSubs[i].id);
          }
        });
      } catch (fcmErr: any) {
        console.error("[FCM] send error:", fcmErr.message);
      }
    }

    // Send via Web Push for browser subscriptions
    if (webSubs.length > 0) {
      const payload = JSON.stringify({ title, body, url: url ?? "/chat" });
      await Promise.all(
        webSubs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            sent++;
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              stale.push(sub.id);
            }
          }
        })
      );
    }

    // Clean up expired subscriptions
    if (stale.length) {
      await supabase.from("push_subscriptions").delete().in("id", stale);
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
