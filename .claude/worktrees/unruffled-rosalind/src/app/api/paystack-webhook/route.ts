export const runtime = "nodejs";

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

    // Verify webhook signature using PAYSTACK_SECRET_KEY
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;
      const bookingId = metadata?.booking_id;

      if (!bookingId) {
        console.error("Webhook missing booking_id in metadata", { reference });
        return NextResponse.json({ ok: true });
      }

      // Verify booking exists and is in "accepted" state before marking as paid
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("id", bookingId)
        .single();

      if (!booking) {
        console.error("Webhook: booking not found", { bookingId, reference });
        return NextResponse.json({ ok: true });
      }

      if (booking.status !== "accepted") {
        console.warn("Webhook: booking not in accepted state", {
          bookingId,
          currentStatus: booking.status,
          reference,
        });
        return NextResponse.json({ ok: true });
      }

      // Mark booking as paid
      await supabase
        .from("bookings")
        .update({
          status: "fee_paid",
          payment_reference: reference,
        })
        .eq("id", bookingId);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Paystack webhook error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
