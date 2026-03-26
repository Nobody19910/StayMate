"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AdminLocationButton from "@/components/ui/AdminLocationButton";
import { IconSchool, IconHome, IconCreditCard, IconChat } from "@/components/ui/Icons";

const UBER_GREEN = "#06C167";

const MSG_POLL_MS = 3000;   // re-fetch active chat messages every 3 s
const CONV_POLL_MS = 8000;   // re-fetch conversation list every 8 s

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function AdminInbox() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Record<string, any>>({});
  const [resolvingBooking, setResolvingBooking] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [propertyData, setPropertyData] = useState<any | null>(null);
  const [releasingContact, setReleasingContact] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedConvRef = useRef<any>(null);

  // ─── Fetch conversations + unread counts ─────────────────────────────────
  const fetchConversations = useCallback(async () => {
    const { data: convs } = await supabase
      .from("conversations").select("*").order("updated_at", { ascending: false });

    if (!convs?.length) { setConversations([]); setLoading(false); return; }

    const seekerIds = convs.map((c: any) => c.seeker_id);

    const [{ data: profiles }, { data: allBookings }, { data: unreadRows }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, avatar_url").in("id", seekerIds),
      supabase.from("bookings").select("*").in("user_id", seekerIds).order("created_at", { ascending: false }),
      supabase.from("messages").select("conversation_id, sender_id")
        .in("conversation_id", convs.map((c: any) => c.id))
        .in("sender_id", seekerIds)
        .eq("is_read", false),
    ]);

    // bookings map
    const bookingMap: Record<string, any> = {};
    allBookings?.forEach((b: any) => { if (!bookingMap[b.user_id]) bookingMap[b.user_id] = b; });
    setBookings(bookingMap);

    // unread counts
    const counts: Record<string, number> = {};
    unreadRows?.forEach((r: any) => { counts[r.conversation_id] = (counts[r.conversation_id] ?? 0) + 1; });
    setUnreadCounts(counts);

    const mapped = convs.map((c: any) => {
      const p = profiles?.find((prof: any) => prof.id === c.seeker_id);
      return { ...c, seeker: p || { full_name: "Unknown", phone: "No phone", id: c.seeker_id } };
    });
    setConversations(mapped);
    setLoading(false);
    setError(null);
  }, []);

  // ─── Poll conversations ───────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
    const iv = setInterval(fetchConversations, CONV_POLL_MS);
    return () => clearInterval(iv);
  }, [fetchConversations]);

  // ─── Fetch messages for selected conv ────────────────────────────────────
  const fetchMessages = useCallback(async (conv: any, markRead = true) => {
    if (!conv) return;
    const { data } = await supabase
      .from("messages").select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (!data) return;

    setMessages(prev => {
      // Merge: keep optimistics that haven't landed yet
      const realContents = new Set(data.map((m: Message) => `${m.sender_id}::${m.content}`));
      const pending = prev.filter(m => m.id.startsWith("opt-") && !realContents.has(`${m.sender_id}::${m.content}`));
      return [...data, ...pending];
    });

    if (markRead) {
      const unread = data.filter((m: Message) => !m.is_read && m.sender_id === conv.seeker_id).map((m: Message) => m.id);
      if (unread.length) {
        supabase.from("messages").update({ is_read: true }).in("id", unread).then(() => {
          // Update local unread badge immediately
          setUnreadCounts(prev => ({ ...prev, [conv.id]: 0 }));
        });
      } else {
        setUnreadCounts(prev => ({ ...prev, [conv.id]: 0 }));
      }
    }
  }, []);

  // ─── Poll messages for the open conversation ──────────────────────────────
  useEffect(() => {
    if (!selectedConv) return;
    fetchMessages(selectedConv, true);
    const iv = setInterval(() => fetchMessages(selectedConv, true), MSG_POLL_MS);
    return () => clearInterval(iv);
  }, [selectedConv, fetchMessages]);

  // ─── Realtime fast-path for messages (bonus, if realtime is enabled) ──────
  useEffect(() => {
    if (!selectedConv) return;
    const ch = supabase
      .channel(`admin:rt:${selectedConv.id}:${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.conversation_id !== selectedConv.id) return;
        fetchMessages(selectedConv, true);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedConv, fetchMessages]);

  // ─── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 150) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ─── Open conv ───────────────────────────────────────────────────────────
  const openConversation = useCallback((conv: any) => {
    setSelectedConv(conv);
    selectedConvRef.current = conv;
    setMessages([]);
    setUnreadCounts(prev => ({ ...prev, [conv.id]: 0 }));

    // Fetch property data if available
    setPropertyData(null);
    if (conv.property_id && conv.property_type) {
      const table = conv.property_type === "home" ? "homes" : "hostels";
      supabase
        .from(table)
        .select("*")
        .eq("id", conv.property_id)
        .single()
        .then(({ data }) => {
          if (data) setPropertyData(data);
        });
    }
  }, []);

  // ─── Auto-select from query params ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !conversations.length || selectedConv) return;
    const seekerId = new URLSearchParams(window.location.search).get("seeker_id");
    if (seekerId) {
      const match = conversations.find((c: any) => c.seeker_id === seekerId);
      if (match) openConversation(match);
    }
  }, [conversations, selectedConv, openConversation]);

  // ─── Send message ─────────────────────────────────────────────────────────
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSending(false); return; }

    // Optimistic
    const optMsg: Message = {
      id: `opt-${Date.now()}`,
      conversation_id: selectedConv.id,
      sender_id: userData.user.id,
      content, is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optMsg]);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);

    const { error: err } = await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: userData.user.id,
      content,
      is_read: false, // seeker sees it as unread
    });

    if (!err) {
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConv.id);
      // Push notify seeker
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/push-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ userId: selectedConv.seeker_id, title: "StayMate Support", body: content, url: "/chat" }),
        });
      } catch (_) { }
      // Immediate refetch to confirm
      fetchMessages(selectedConv, false);
    }
    setSending(false);
  }

  // ─── Delete conversation ──────────────────────────────────────────────────
  async function deleteConversation() {
    if (!selectedConv || !confirm("Delete this entire conversation?")) return;
    const { error } = await supabase.from("conversations").delete().eq("id", selectedConv.id);
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== selectedConv.id));
      setSelectedConv(null);
      selectedConvRef.current = null;
    }
  }

  // ─── Accept / Reject ─────────────────────────────────────────────────────
  async function resolveBooking(status: "accepted" | "rejected") {
    if (!selectedConv) return;
    const booking = bookings[selectedConv.seeker_id];
    if (!booking) return;
    setResolvingBooking(true);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", booking.id);
    if (!error) {
      setBookings(prev => ({ ...prev, [selectedConv.seeker_id]: { ...booking, status } }));
      const { data: adminData } = await supabase.auth.getUser();
      const systemMsg = status === "accepted"
        ? `✅ Your inquiry has been ACCEPTED! Go to Chat and tap "Pay GH₵ 200 Fee" to secure your spot.`
        : `❌ Your inquiry has been declined. Feel free to browse other listings.`;
      await supabase.from("messages").insert({
        conversation_id: selectedConv.id,
        sender_id: adminData.user?.id,
        content: systemMsg,
        is_read: false,
      });
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConv.id);
      try {
        const { data: { session: s2 } } = await supabase.auth.getSession();
        await fetch("/api/push-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(s2?.access_token ? { Authorization: `Bearer ${s2.access_token}` } : {}),
          },
          body: JSON.stringify({
            userId: selectedConv.seeker_id,
            title: status === "accepted" ? "Inquiry Accepted 🎉" : "Inquiry Update",
            body: status === "accepted" ? "Your inquiry was accepted! Open the app to pay GH₵ 200." : "Your inquiry was declined.",
            url: "/chat",
          }),
        });
      } catch (_) { }
      fetchMessages(selectedConv, false);
    }
    setResolvingBooking(false);
  }

  function navigateToProperty(conv: any) {
    if (!conv.property_id) return;
    if (conv.property_type === "home") router.push(`/homes/${conv.property_id}`);
    else if (conv.property_type === "hostel") router.push(`/hostels/${conv.property_id}`);
  }

  // ─── Release agent contact to seeker ─────────────────────────────────────
  async function releaseAgentContact() {
    if (!selectedConv || !propertyData || releasingContact) return;
    setReleasingContact(true);
    try {
      const ownerId = propertyData.owner_id || propertyData.manager_id;
      if (!ownerId) { setReleasingContact(false); return; }
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("full_name, phone, is_agent, display_name")
        .eq("id", ownerId)
        .single();
      if (!ownerProfile?.phone) { setReleasingContact(false); return; }
      const { data: adminData } = await supabase.auth.getUser();
      const ownerName = ownerProfile.display_name || ownerProfile.full_name || "Property Owner";
      const label = ownerProfile.is_agent ? "Agent" : "Owner";
      const contactMsg = `📞 ${label} Contact Released:\n${ownerName} — ${ownerProfile.phone}\nYou can now contact them directly.`;
      await supabase.from("messages").insert({
        conversation_id: selectedConv.id,
        sender_id: adminData.user?.id,
        content: contactMsg,
        is_read: false,
      });
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConv.id);
      // Push notify seeker
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/push-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
          body: JSON.stringify({ userId: selectedConv.seeker_id, title: `${label} Contact Released`, body: `You can now contact ${ownerName} directly.`, url: "/chat" }),
        });
      } catch (_) {}
      fetchMessages(selectedConv, false);
    } catch (_) {}
    setReleasingContact(false);
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (loading) return (
    <div className="rounded-3xl p-8 text-center" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
      <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-3" style={{ border: "2px solid var(--uber-black)", borderTopColor: "transparent" }} />
      <p className="text-sm" style={{ color: "var(--uber-muted)" }}>Loading inbox...</p>
    </div>
  );

  return (
    <div className="overflow-hidden flex flex-col md:flex-row w-full"
      style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)", minHeight: "calc(100dvh - 48px)", borderRadius: "1rem" }}>

      {/* ── Sidebar ── */}
      <div className={`md:w-[300px] lg:w-[320px] flex-col ${selectedConv ? "hidden md:flex" : "flex"}`}
        style={{ background: "var(--uber-surface)", borderRight: "0.5px solid var(--uber-border)" }}>
        <div className="p-4 sticky top-0 z-10" style={{ background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold" style={{ color: "var(--uber-text)" }}>Support Inbox</h2>
            {totalUnread > 0 && (
              <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "var(--uber-muted)" }}>
            {conversations.length} Active {conversations.length === 1 ? "Chat" : "Chats"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0
            ? <p className="text-sm p-6 text-center italic" style={{ color: "var(--uber-muted)" }}>No conversations yet.</p>
            : conversations.map(conv => (
              <button key={conv.id} onClick={() => openConversation(conv)}
                className="w-full text-left p-4 flex items-start gap-3 transition-colors"
                style={{
                  borderBottom: "0.5px solid var(--uber-border)",
                  background: selectedConv?.id === conv.id ? "rgba(6,193,103,0.07)" : undefined,
                  borderLeft: selectedConv?.id === conv.id ? `2px solid ${UBER_GREEN}` : "2px solid transparent",
                }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm mt-0.5" style={{ background: "var(--uber-black)", color: "var(--uber-white)" }}>
                  {conv.seeker?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--uber-text)" }}>{conv.seeker?.full_name || "Unknown"}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(unreadCounts[conv.id] ?? 0) > 0 && (
                        <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {(unreadCounts[conv.id] ?? 0) > 99 ? "99+" : unreadCounts[conv.id]}
                        </span>
                      )}
                      <span className="text-[9px]" style={{ color: "var(--uber-muted)" }}>
                        {new Date(conv.updated_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] font-medium truncate mt-0.5" style={{ color: "var(--uber-muted)" }}>{conv.seeker?.phone || "No phone"}</p>
                  {conv.property_title && (
                    <div className="flex items-center gap-1.5 mt-1.5 rounded-lg px-2 py-1 overflow-hidden" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                      <span className="text-[11px] shrink-0">{conv.property_type === "room" ? <IconSchool /> : <IconHome />}</span>
                      <p className="text-[10px] font-semibold truncate" style={{ color: "var(--uber-text)" }}>{conv.property_title}</p>
                    </div>
                  )}
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!selectedConv ? "hidden md:flex" : "flex"}`} style={{ background: "var(--uber-white)" }}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10" style={{ background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
              <div className="p-3 flex items-center gap-3">
                <button onClick={() => { setSelectedConv(null); selectedConvRef.current = null; }}
                  className="md:hidden w-8 h-8 flex items-center justify-center shrink-0 rounded-full"
                  style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" }}>←</button>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: "var(--uber-black)", color: "var(--uber-white)" }}>
                  {selectedConv.seeker?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm" style={{ color: "var(--uber-text)" }}>{selectedConv.seeker?.full_name || "User"}</h3>
                  <p className="text-[10px]" style={{ color: "var(--uber-muted)" }}>{selectedConv.seeker?.phone || "No phone"}</p>
                </div>
                <button onClick={deleteConversation}
                  className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {selectedConv.property_title && (
                <div style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                  <button onClick={() => navigateToProperty(selectedConv)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ color: "var(--uber-text)" }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg" style={{ background: "var(--uber-surface)" }}>
                      {selectedConv.property_type === "room" ? <IconSchool className="w-5 h-5" /> : <IconHome className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--uber-muted)" }}>
                        {selectedConv.property_type === "room" ? "Hostel Room" : "Property"} Inquiry
                      </p>
                      <p className="text-xs font-bold truncate" style={{ color: "var(--uber-text)" }}>{selectedConv.property_title}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {propertyData && (
                    <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                      <AdminLocationButton
                        lat={propertyData.lat}
                        lng={propertyData.lng}
                        city={propertyData.city}
                        title={propertyData.title || propertyData.name}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-4" style={{ background: "var(--uber-surface)" }}>
              {messages.length === 0
                ? <p className="text-center text-xs mt-10 italic" style={{ color: "var(--uber-muted)" }}>No messages yet.</p>
                : messages.map(msg => {
                  const isAdmin = msg.sender_id !== selectedConv.seeker_id;
                  const isOpt = msg.id.startsWith("opt-");
                  const imgMatch = msg.content.match(/^\[INQUIRY_IMAGE:(.*?)\]\n/);
                  const inquiryImg = imgMatch?.[1] || null;
                  const displayContent = inquiryImg ? msg.content.replace(/^\[INQUIRY_IMAGE:.*?\]\n/, "") : msg.content;
                  return (
                    <div key={msg.id}
                      className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                      <div className={`rounded-2xl max-w-[80%] overflow-hidden text-[13px] leading-relaxed ${isAdmin ? "rounded-br-sm" : "rounded-bl-sm"} ${isOpt ? "opacity-60" : ""}`}
                        style={isAdmin
                          ? { background: "var(--uber-black)", color: "var(--uber-white)" }
                          : { background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                        {inquiryImg && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={inquiryImg} alt="Property" className="w-full h-32 object-cover" />
                        )}
                        <div className="px-4 py-2.5">{displayContent}</div>
                      </div>
                      <span className="text-[9px] mt-0.5 uppercase tracking-wider mx-1" style={{ color: "var(--uber-muted)" }}>
                        {isOpt ? "Sending…" : new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })
              }
            </div>

            {/* Accept / Reject */}
            {(() => {
              const booking = bookings[selectedConv.seeker_id];
              if (!booking || booking.status !== "pending") return null;
              return (
                <div className="px-3 pt-3 pb-1" style={{ background: "var(--uber-white)", borderTop: "0.5px solid rgba(212,175,55,0.3)" }}>
                  <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: "#EAFAF1", border: `0.5px solid ${UBER_GREEN}30` }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: UBER_GREEN }}>Inquiry Pending</p>
                      <p className="text-[10px] font-medium" style={{ color: "var(--uber-muted)" }}>{selectedConv.seeker?.full_name} is waiting</p>
                    </div>
                    <button onClick={() => resolveBooking("rejected")} disabled={resolvingBooking}
                      className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-xl active:scale-95 disabled:opacity-50"
                      style={{ color: "var(--uber-muted)", background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>Decline</button>
                    <button onClick={() => resolveBooking("accepted")} disabled={resolvingBooking}
                      className="shrink-0 px-3 py-1.5 text-xs font-bold text-white rounded-xl active:scale-95 disabled:opacity-50 flex items-center gap-1"
                      style={{ background: UBER_GREEN }}>
                      {resolvingBooking && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Accept
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Status strips */}
            {(() => {
              const booking = bookings[selectedConv.seeker_id];
              if (!booking) return null;
              if (booking.status === "accepted") return (
                <div className="px-3 pt-2 pb-1" style={{ background: "var(--uber-white)", borderTop: "0.5px solid rgba(212,175,55,0.2)" }}>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#FDF8E7", border: "0.5px solid rgba(212,175,55,0.3)" }}>
                    <span>⏳</span>
                    <p className="text-[10px] font-bold" style={{ color: "var(--uber-text)" }}>Accepted — Awaiting GH₵ 200 payment</p>
                  </div>
                </div>
              );
              if (booking.status === "fee_paid" || booking.status === "paid") return (
                <div className="px-3 pt-2 pb-1" style={{ background: "var(--uber-white)", borderTop: "0.5px solid var(--uber-border)" }}>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
                    <span><IconCreditCard /></span>
                    <p className="text-[10px] font-bold flex-1" style={{ color: "var(--uber-text)" }}>Fee paid</p>
                    {propertyData && (
                      <button onClick={releaseAgentContact} disabled={releasingContact}
                        className="shrink-0 px-3 py-1.5 text-[10px] font-bold text-white rounded-xl active:scale-95 disabled:opacity-50 flex items-center gap-1"
                        style={{ background: UBER_GREEN }}>
                        {releasingContact && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Release Contact
                      </button>
                    )}
                  </div>
                </div>
              );
              return null;
            })()}

            {/* Input */}
            <div className="p-3 sticky bottom-0 z-10 pb-5 md:pb-3" style={{ background: "var(--uber-white)", borderTop: "0.5px solid var(--uber-border)" }}>
              <form onSubmit={sendMessage} className="flex items-center gap-2 max-w-2xl mx-auto w-full">
                <div className="flex-1 flex items-center rounded-full px-4" style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)" }}>
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    placeholder="Message Seeker..."
                    className="flex-1 bg-transparent outline-none text-sm py-2.5"
                    style={{ color: "var(--uber-text)" }} />
                </div>
                <button type="submit" disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 active:scale-90 transition-transform"
                  style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-4 h-4 translate-x-px" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center" style={{ background: "var(--uber-surface)" }}>
            <span className="text-4xl opacity-30"><IconChat className="w-10 h-10" /></span>
            <p className="font-bold text-sm" style={{ color: "var(--uber-text)" }}>Select a conversation</p>
            <p className="text-xs max-w-[180px]" style={{ color: "var(--uber-muted)" }}>Choose a seeker from the left to read and reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}
