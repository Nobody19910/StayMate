"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AdminInbox from "@/components/admin/AdminInbox";
import { usePaystackScript, openPaystackPopup } from "@/lib/paystack";

const UBER_BLACK = "#000000";
const UBER_GREEN = "#06C167";
const POLL_MS = 3000; // poll every 3 s — fast enough to feel live

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  seeker_id: string;
  property_id: string | null;
  property_type: string | null;
  property_title: string | null;
  property_image: string | null;
  updated_at: string;
}

export default function SeekerChatPage() {
  const { user, profile } = useAuth();

  if (profile?.role === "admin") {
    return (
      <div className="min-h-screen bg-[#F6F6F6] pb-4 pt-4 md:pt-6 px-2 md:px-6 flex justify-center">
        <div className="w-full max-w-7xl">
          <AdminInbox />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex flex-col items-center pt-24 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center mb-6">
          <span className="text-3xl">💬</span>
        </div>
        <h1 className="text-2xl font-bold text-black mb-2">Support Chat</h1>
        <p className="text-sm text-gray-500 max-w-xs mb-8">
          Sign in to chat directly with StayMate for support and property inquiries.
        </p>
        <Link href="/login" className="text-white font-semibold py-3.5 px-12 rounded-2xl shadow-sm" style={{ background: UBER_BLACK }}>
          Sign In
        </Link>
      </div>
    );
  }

  return <ChatView user={user} />;
}

function ChatView({ user }: { user: any }) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [payingFee, setPayingFee] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  usePaystackScript();

  const scrollRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<Conversation | null>(null);
  // Track seen real message IDs so we don't trigger unnecessary re-renders
  const lastMsgTimestampRef = useRef<string>("");
  const isAtBottomRef = useRef(true);

  // Fetch admin id
  useEffect(() => {
    supabase.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle()
      .then(({ data }) => { if (data) setAdminUserId(data.id); });
  }, []);

  // Init: get/create conversation
  useEffect(() => {
    if (!user) return;
    async function init() {
      try {
        let { data: conv } = await supabase
          .from("conversations").select("*").eq("seeker_id", user.id).maybeSingle();
        if (!conv) {
          const { data: created } = await supabase
            .from("conversations").insert({ seeker_id: user.id }).select("*").single();
          conv = created;
        }
        if (conv) { setConversation(conv); convRef.current = conv; }
      } catch (e: any) {
        setError("Failed to load chat.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  // ─── Core fetch: merge DB messages with pending optimistics ───────────────
  const fetchMessages = useCallback(async (markRead = false) => {
    const conv = convRef.current;
    if (!conv) return;

    const { data: dbMsgs } = await supabase
      .from("messages").select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (!dbMsgs) return;

    // Mark admin messages as read
    if (markRead) {
      const unread = dbMsgs.filter(m => !m.is_read && m.sender_id !== user.id).map(m => m.id);
      if (unread.length) supabase.from("messages").update({ is_read: true }).in("id", unread).then(() => { });
    }

    setMessages(prev => {
      // Build final list: real DB messages + any optimistic ones that haven't landed yet
      const dbIds = new Set(dbMsgs.map(m => m.id));
      const realContents = new Set(dbMsgs.map(m => `${m.sender_id}::${m.content}`));

      // Keep only optimistic messages that haven't been confirmed yet
      const pendingOptimistics = prev.filter(
        m => m.id.startsWith("opt-") && !realContents.has(`${m.sender_id}::${m.content}`)
      );

      return [...dbMsgs, ...pendingOptimistics];
    });

    // Track latest timestamp for change detection
    if (dbMsgs.length) lastMsgTimestampRef.current = dbMsgs[dbMsgs.length - 1].created_at;
  }, [user.id]);

  // ─── Polling: primary mechanism ───────────────────────────────────────────
  useEffect(() => {
    if (!conversation) return;
    convRef.current = conversation;

    // Initial load with mark-read
    fetchMessages(true);

    // Poll every 3 s
    const interval = setInterval(() => fetchMessages(true), POLL_MS);
    return () => clearInterval(interval);
  }, [conversation, fetchMessages]);

  // ─── Realtime: fast-path enhancement (works if Supabase realtime is on) ───
  useEffect(() => {
    if (!conversation) return;
    const ch = supabase
      .channel(`seeker:rt:${conversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const incoming = payload.new as Message;
        if (incoming.conversation_id !== conversation.id) return;
        // Trigger an immediate re-fetch instead of manually managing state
        fetchMessages(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversation, fetchMessages]);

  // ─── Booking polling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    async function fetchBooking() {
      const { data } = await supabase.from("bookings").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data && mounted) setBooking(data);
    }
    fetchBooking();
    const iv = setInterval(fetchBooking, 10000);
    return () => { mounted = false; clearInterval(iv); };
  }, [user]);

  // Auto-scroll only when near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 120) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function notifyAdmin(body: string) {
    if (!adminUserId) return;
    try {
      await fetch("/api/push-notify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUserId, title: "New Message — StayMate", body, url: `/chat?seeker_id=${user.id}` }),
      });
    } catch (_) { }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const conv = convRef.current;
    if (!newMessage.trim() || !conv || !user || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic append
    const optId = `opt-${Date.now()}`;
    const optMsg: Message = {
      id: optId, conversation_id: conv.id, sender_id: user.id,
      content, is_read: false, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optMsg]);
    // Scroll to bottom
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);

    const { error: sendErr } = await supabase.from("messages").insert({
      conversation_id: conv.id, sender_id: user.id, content, is_read: false,
    });

    if (sendErr) {
      setMessages(prev => prev.filter(m => m.id !== optId));
      setError(`Failed to send: ${sendErr.message}`);
    } else {
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
      notifyAdmin(content);
      // Immediately refetch to confirm the message landed
      fetchMessages(false);
    }
    setSending(false);
  }

  async function handlePayFee() {
    if (!user || !booking) return;
    setPayingFee(true);
    openPaystackPopup({
      email: user.email ?? "guest@staymate.app",
      amount: 20000, currency: "GHS",
      metadata: { booking_id: booking.id, user_id: user.id },
      onSuccess: async () => {
        // Payment verified server-side via Paystack webhook
        // Poll for updated booking status
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const { data } = await supabase.from("bookings").select("*").eq("id", booking.id).single();
          if (data?.status === "fee_paid" || attempts >= 10) {
            clearInterval(poll);
            if (data) setBooking(data);
            setPayingFee(false);
          }
        }, 2000);
      },
      onClose: () => setPayingFee(false),
    });
  }

  function propertyHref() {
    if (!conversation?.property_id || !conversation?.property_type) return "#";
    if (conversation.property_type === "home") return `/homes/${conversation.property_id}`;
    return "#";
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hasProperty = !!conversation?.property_title;

  return (
    <div className="flex flex-col bg-[#F6F6F6]" style={{ height: "100dvh" }}>

      {/* ── Header ── */}
      <div className="bg-white/95 backdrop-blur-md px-4 py-3 sticky top-0 z-10"
        style={{ borderBottom: "0.5px solid rgba(0,0,0,0.09)" }}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">SM</span>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white" style={{ background: UBER_GREEN }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-black leading-tight">StayMate Concierge</h1>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Typically replies instantly</p>
          </div>
        </div>
        {hasProperty && (
          <button onClick={() => { const h = propertyHref(); if (h !== "#") router.push(h); }}
            className="mt-3 w-full flex items-center gap-3 bg-[#F6F6F6] rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
            style={{ border: "0.5px solid rgba(0,0,0,0.09)" }}>
            {conversation!.property_image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={conversation!.property_image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              : <div className="w-12 h-12 rounded-lg bg-black/5 flex items-center justify-center shrink-0 text-xl">
                {conversation!.property_type === "room" ? "🏫" : "🏠"}
              </div>}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {conversation!.property_type === "room" ? "Hostel Room Inquiry" : "Property Inquiry"}
              </p>
              <p className="text-sm font-bold text-black truncate mt-0.5">{conversation!.property_title}</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Fee Banner ── */}
      {hasProperty && (
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ background: "#FDF8E7", borderBottom: "0.5px solid rgba(212,175,55,0.3)" }}>
          <span style={{ color: "#D4AF37" }}>✦</span>
          <p className="text-xs font-medium text-black">
            Coordination & Viewing Fee: <span className="font-bold" style={{ color: "#D4AF37" }}>GH₵ 200</span>
          </p>
        </div>
      )}

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 px-4 py-2 flex items-start gap-2 overflow-hidden">
            <p className="text-xs text-red-600 flex-1 break-all">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4" style={{ paddingBottom: "130px" }}>
        <div className="text-center mb-6">
          <p className="text-[10px] font-semibold text-gray-400 bg-black/5 inline-block px-3 py-1 rounded-full uppercase tracking-wider">
            Start of conversation
          </p>
        </div>
        {messages.length === 0 && !loading && (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400">No messages yet. Say hello 👋</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user.id;
          const isOpt = msg.id.startsWith("opt-");
          const isAccepted = msg.content.includes("ACCEPTED") && !isMe;
          const isDeclined = msg.content.includes("declined") && !isMe;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} w-full`}>
              {!isMe && (
                <div className="w-6 h-6 flex items-center justify-center bg-black rounded-full text-[9px] text-white font-bold mb-1 ml-1">SM</div>
              )}
              {isAccepted ? (
                <div className="w-full px-3 py-3 rounded-2xl max-w-lg" style={{ background: "#FDF8E7", border: "0.5px solid rgba(212,175,55,0.3)" }}>
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0">✅</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-black mb-2">{msg.content}</p>
                      <button onClick={handlePayFee} disabled={payingFee}
                        className="inline-flex items-center gap-1.5 text-black text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60"
                        style={{ background: "#D4AF37" }}>
                        {payingFee ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <>💳 Pay GH₵ 200 Fee</>}
                      </button>
                    </div>
                  </div>
                </div>
              ) : isDeclined ? (
                <div className="w-full px-3 py-3 rounded-2xl max-w-lg" style={{ background: "#FEE2E2", border: "0.5px solid rgba(239,68,68,0.3)" }}>
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0">❌</span>
                    <p className="text-sm font-medium text-red-700">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed max-w-[82%] ${isMe ? "text-white rounded-br-sm" : "text-black rounded-bl-sm"} ${isOpt ? "opacity-60" : ""}`}
                  style={isMe
                    ? { background: UBER_BLACK }
                    : { background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  {msg.content}
                </div>
              )}
              <span className={`text-[9px] text-gray-400 font-medium mt-1 uppercase tracking-wider ${isMe ? "mr-1" : "ml-1"}`}>
                {isOpt ? "Sending…" : new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* ── Pay Fee strip ── */}
      {booking?.status === "accepted" && (
        <div className="px-3 py-2.5" style={{ background: "#FDF8E7", borderTop: "0.5px solid rgba(212,175,55,0.3)" }}>
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-black uppercase tracking-widest">Inquiry Accepted</p>
              <p className="text-xs text-gray-600 font-medium mt-0.5">Pay the GH₵ 200 fee to confirm your spot.</p>
            </div>
            <button onClick={handlePayFee} disabled={payingFee}
              className="shrink-0 flex items-center gap-1.5 text-black text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-60"
              style={{ background: "#D4AF37" }}>
              {payingFee ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <>✦ Pay GH₵ 200</>}
            </button>
          </div>
        </div>
      )}
      {(booking?.status === "fee_paid" || booking?.status === "paid") && (
        <div className="px-4 py-2 flex items-center gap-2" style={{ borderTop: "0.5px solid rgba(6,193,103,0.3)", background: "#EAFAF1" }}>
          <span>✅</span>
          <p className="text-xs font-semibold text-black">Fee paid — your spot is confirmed.</p>
        </div>
      )}

      {/* ── Input ── */}
      <div className="bg-white/95 backdrop-blur-md p-3 pb-6 fixed bottom-16 left-0 right-0 lg:relative lg:bottom-auto"
        style={{ borderTop: "0.5px solid rgba(0,0,0,0.09)" }}>
        <form onSubmit={sendMessage}
          className="flex items-center bg-[#F6F6F6] rounded-full p-1 pl-4 max-w-3xl mx-auto"
          style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}>
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder="Message Concierge..." autoComplete="off"
            className="flex-1 bg-transparent border-none outline-none text-sm text-black placeholder:text-gray-400" />
          <button type="submit" disabled={!newMessage.trim() || sending}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white ml-2 active:scale-95 transition-transform disabled:opacity-50"
            style={{ background: UBER_BLACK }}>
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4 translate-x-px" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>}
          </button>
        </form>
      </div>
    </div>
  );
}
