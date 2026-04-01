const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "StayMate <noreply@staymate-eight.vercel.app>";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload) {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend error:", err);
    }
  } catch (e) {
    console.error("[email] Failed to send:", e);
  }
}

export function emailInquiryReceived(seekerName: string, propertyTitle: string) {
  return {
    subject: `Your inquiry for ${propertyTitle} was received`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e9edf2">
        <div style="background:#0f0f0f;padding:24px 32px;display:flex;align-items:center;gap:12px">
          <span style="color:#06C167;font-size:24px">🏠</span>
          <span style="color:#fff;font-size:20px;font-weight:700">StayMate</span>
        </div>
        <div style="padding:32px">
          <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Hi ${seekerName},</h2>
          <p style="color:#64748b;margin:0 0 24px">We've received your inquiry for <strong style="color:#0f172a">${propertyTitle}</strong>. Our concierge team will review it and get back to you shortly.</p>
          <div style="background:#f7f8fa;border-radius:10px;padding:16px 20px;margin-bottom:24px">
            <p style="margin:0;font-size:14px;color:#64748b">⏱ <strong>What happens next?</strong></p>
            <p style="margin:8px 0 0;font-size:14px;color:#64748b">Once accepted, you'll be asked to pay the <strong>GH₵200 coordination fee</strong> to schedule a viewing. No payment is needed yet.</p>
          </div>
          <a href="https://staymate-eight.vercel.app/profile" style="display:inline-block;background:#06C167;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Track your inquiry →</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #e9edf2;color:#94a3b8;font-size:12px">StayMate · Ghana's trusted property platform · <a href="https://staymate-eight.vercel.app" style="color:#06C167">staymate-eight.vercel.app</a></div>
      </div>
    `,
  };
}

export function emailInquiryAccepted(seekerName: string, propertyTitle: string) {
  return {
    subject: `✅ Your inquiry for ${propertyTitle} was accepted`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e9edf2">
        <div style="background:#0f0f0f;padding:24px 32px"><span style="color:#fff;font-size:20px;font-weight:700">🏠 StayMate</span></div>
        <div style="padding:32px">
          <h2 style="margin:0 0 8px;color:#0f172a">Great news, ${seekerName}!</h2>
          <p style="color:#64748b;margin:0 0 24px">Your inquiry for <strong style="color:#0f172a">${propertyTitle}</strong> has been <strong style="color:#06C167">accepted</strong>. Pay the GH₵200 coordination fee to schedule your viewing.</p>
          <a href="https://staymate-eight.vercel.app/chat" style="display:inline-block;background:#06C167;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Pay & Schedule Viewing →</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #e9edf2;color:#94a3b8;font-size:12px">StayMate · <a href="https://staymate-eight.vercel.app" style="color:#06C167">staymate-eight.vercel.app</a></div>
      </div>
    `,
  };
}

export function emailDealClosed(seekerName: string, propertyTitle: string, action: string) {
  const verb = action === "sold" ? "sold" : "rented";
  return {
    subject: `🎉 Deal closed — ${propertyTitle}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e9edf2">
        <div style="background:#0f0f0f;padding:24px 32px"><span style="color:#fff;font-size:20px;font-weight:700">🏠 StayMate</span></div>
        <div style="padding:32px">
          <h2 style="margin:0 0 8px;color:#0f172a">Congratulations, ${seekerName}!</h2>
          <p style="color:#64748b;margin:0 0 24px">The deal for <strong style="color:#0f172a">${propertyTitle}</strong> has been marked as <strong>${verb}</strong>. We hope you love your new place!</p>
          <p style="color:#64748b;margin:0 0 24px">You can now rate the property, the agent, and our concierge service from your profile.</p>
          <a href="https://staymate-eight.vercel.app/profile" style="display:inline-block;background:#06C167;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Leave a Review →</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #e9edf2;color:#94a3b8;font-size:12px">StayMate · <a href="https://staymate-eight.vercel.app" style="color:#06C167">staymate-eight.vercel.app</a></div>
      </div>
    `,
  };
}

export function emailWaitlistNotification(seekerName: string, propertyTitle: string, propertyUrl: string) {
  return {
    subject: `🔔 ${propertyTitle} is available again`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e9edf2">
        <div style="background:#0f0f0f;padding:24px 32px"><span style="color:#fff;font-size:20px;font-weight:700">🏠 StayMate</span></div>
        <div style="padding:32px">
          <h2 style="margin:0 0 8px;color:#0f172a">Good news, ${seekerName}!</h2>
          <p style="color:#64748b;margin:0 0 24px"><strong style="color:#0f172a">${propertyTitle}</strong> — which you joined the waitlist for — is now available again. Be quick!</p>
          <a href="${propertyUrl}" style="display:inline-block;background:#06C167;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">View Property →</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #e9edf2;color:#94a3b8;font-size:12px">StayMate · <a href="https://staymate-eight.vercel.app" style="color:#06C167">staymate-eight.vercel.app</a></div>
      </div>
    `,
  };
}
