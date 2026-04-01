export async function triggerEmail(payload: {
  type: "inquiry_received" | "inquiry_accepted" | "deal_closed" | "waitlist_available";
  userId: string;
  propertyTitle: string;
  bookingId?: string;
  propertyUrl?: string;
  action?: string;
}) {
  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("[trigger-email]", e);
  }
}
