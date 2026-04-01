import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailInquiryReceived, emailInquiryAccepted, emailDealClosed, emailWaitlistNotification } from "@/lib/email";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { type, bookingId, userId, propertyTitle, propertyUrl, action } = await req.json();

    // Get user email
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user?.email) return NextResponse.json({ error: "No email" }, { status: 400 });

    // Get user name
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).single();
    const name = profile?.full_name || "there";

    let emailData;
    if (type === "inquiry_received") emailData = emailInquiryReceived(name, propertyTitle);
    else if (type === "inquiry_accepted") emailData = emailInquiryAccepted(name, propertyTitle);
    else if (type === "deal_closed") emailData = emailDealClosed(name, propertyTitle, action || "rented");
    else if (type === "waitlist_available") emailData = emailWaitlistNotification(name, propertyTitle, propertyUrl || "https://staymate-eight.vercel.app");
    else return NextResponse.json({ error: "Unknown type" }, { status: 400 });

    await sendEmail({ to: user.email, ...emailData });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[send-email]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
