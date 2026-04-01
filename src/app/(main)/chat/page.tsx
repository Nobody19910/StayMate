"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AdminInbox from "@/components/admin/AdminInbox";
import { IconChat, IconSchool, IconHome, IconStar, IconClose, IconCheckCircle, IconCreditCard } from "@/components/ui/Icons";
import { usePaystackScript, openPaystackPopup } from "@/lib/paystack";

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
      <div className="min-h-screen pb-4 pt-4 md:pt-6 px-2 md:px-6 flex justify-center" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-7xl">
          <AdminInbox />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center pt-24 px-4 text-center" style={{ background: "var(--background)" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "var(--uber-black)" }}>
          <IconChat className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--uber-text)" }}>Support Chat</h1>
        <p className="text-sm max-w-xs mb-8" style={{ color: "var(--uber-muted)" }}>
          Sign in to chat directly with StayMate for support and property inquiries.
        </p>
        <Link href="/login" className="text-white font-semibold py-3.5 px-12 rounded-2xl shadow-sm" style={{ background: "var(--uber-black)" }}>
          Sign In
        </Link>
      </div>
    );
  }

  return <ChatView user={user} />;
}

function renderMessageContent(content: string) {
  const fileMatch = content.match(/^\[FILE:(.*?)\|(.*?)\]$/);
  if (fileMatch) {
    const [, url, name] = fileMatch;
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    if (isImage) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="max-w-full rounded-xl" style={{ maxHeight: "200px", objectFit: "cover" }} />
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold underline"
        style={{ background: "rgba(6,193,103,0.1)", color: "var(--uber-green)" }}>
        📎 {name}
      </a>
    );
  }
  return <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>;
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
  const [uploading, setUploading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [payingFee, setPayingFee] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  usePaystackScript();

  const scrollRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<Conversation | null>(null);
  // Track seen real message IDs so we don't trigger unnecessary re-renders
  const lastMsgTimestampRef = useRef<string>("");
  const isAtBottomRef = useRef(true);

  // No need to fetch admin ID — we notify all admins server-side

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/push-notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ role: "admin", title: "New Message — StayMate", body, url: `/chat?seeker_id=${user.id}` }),
      });
    } catch (_) { }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
    if (file.size > 10 * 1024 * 1024) { alert("Max file size is 10MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${conversation.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      const content = `[FILE:${publicUrl}|${file.name}]`;
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: user!.id,
        content,
        is_read: false,
      });
      fetchMessages(false);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      ref: `staymate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      metadata: { booking_id: booking.id, user_id: user.id },
      onSuccess: async (reference: string) => {
        // Update booking status directly (webhook is backup verification)
        await supabase.from("bookings").update({
          status: "fee_paid",
          payment_reference: reference,
        }).eq("id", booking.id);

        setBooking({ ...booking, status: "fee_paid", payment_reference: reference });
        setPayingFee(false);

        // Send confirmation message in chat
        if (conversation) {
          await supabase.from("messages").insert({
            conversation_id: conversation.id,
            sender_id: user.id,
            content: "💳 Payment of GH₵ 200 confirmed. Fee paid successfully.",
            is_read: false,
          });
          fetchMessages(false);
          notifyAdmin("💳 Payment of GH₵ 200 confirmed.");
        }
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--uber-black)", borderTopColor: "transparent" }} />
    </div>
  );

  const hasProperty = !!conversation?.property_title;

  return (
    <div className="flex flex-col" style={{ height: "100dvh", background: "var(--background)" }}>

      {/* ── Header ── */}
      <div className="backdrop-blur-md px-4 pb-3 sticky top-0 z-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)", borderBottom: "0.5px solid var(--uber-border)", background: "var(--uber-white)" }}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--uber-black)" }}>
              <span className="text-sm font-bold" style={{ color: "var(--uber-white)" }}>SM</span>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2" style={{ background: "#06C167", borderColor: "var(--uber-white)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold leading-tight" style={{ color: "var(--uber-text)" }}>StayMate Concierge</h1>
            <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--uber-muted)" }}>Typically replies instantly</p>
          </div>
        </div>
        {hasProperty && (
          <button onClick={() => { const h = propertyHref(); if (h !== "#") router.push(h); }}
            className="mt-3 w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
            style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-surface)" }}>
            {conversation!.property_image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={conversation!.property_image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              : <div className="w-12 h-12 rounded-lg bg-black/5 flex items-center justify-center shrink-0 text-xl">
                {conversation!.property_type === "room" ? <IconSchool /> : <IconHome />}
              </div>}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--uber-muted)" }}>
                {conversation!.property_type === "room" ? "Hostel Room Inquiry" : "Property Inquiry"}
              </p>
              <p className="text-sm font-bold truncate mt-0.5" style={{ color: "var(--uber-text)" }}>{conversation!.property_title}</p>
            </div>
            <svg className="w-4 h-4 shrink-0" style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Fee Banner ── */}
      {hasProperty && (
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ background: "color-mix(in srgb, #D4AF37 15%, var(--uber-surface))", borderBottom: "0.5px solid rgba(212,175,55,0.3)" }}>
          <span style={{ color: "#D4AF37" }}><IconStar /></span>
          <p className="text-xs font-medium" style={{ color: "var(--uber-text)" }}>
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
            <button onClick={() => setError(null)} className="text-red-400 text-xs"><IconClose /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4" style={{ paddingBottom: "130px" }}>
        <div className="text-center mb-6">
          <p className="text-[10px] font-semibold inline-block px-3 py-1 rounded-full uppercase tracking-wider" style={{ color: "var(--uber-muted)", background: "var(--uber-surface2)" }}>
            Start of conversation
          </p>
        </div>
        {messages.length === 0 && !loading && (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: "var(--uber-muted)" }}>No messages yet. Say hello 👋</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user.id;
          const isOpt = msg.id.startsWith("opt-");
          const isAcceptedMsg = msg.content.includes("ACCEPTED") && !isMe;
          const isDeclined = msg.content.includes("declined") && !isMe;
          // Only show inline pay button if booking is still "accepted" (not already paid)
          const isAccepted = isAcceptedMsg && booking?.status === "accepted";
          // Parse inquiry image from message content
          const inquiryImageMatch = msg.content.match(/^\[INQUIRY_IMAGE:(.*?)\]\n/);
          const inquiryImage = inquiryImageMatch?.[1] || null;
          const displayContent = inquiryImage ? msg.content.replace(/^\[INQUIRY_IMAGE:.*?\]\n/, "") : msg.content;
          return (
            <div key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} w-full`}>
              {!isMe && (
                <div className="w-6 h-6 flex items-center justify-center rounded-full text-[9px] font-bold mb-1 ml-1" style={{ background: "var(--uber-black)", color: "var(--uber-white)" }}>SM</div>
              )}
              {isAccepted ? (
                <div className="w-full px-3 py-3 rounded-2xl max-w-lg" style={{ background: "color-mix(in srgb, #D4AF37 15%, var(--uber-surface))", border: "0.5px solid rgba(212,175,55,0.3)" }}>
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0"><IconCheckCircle /></span>
                    <div className="flex-1">
                      <p className="text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>{msg.content}</p>
                      <button onClick={handlePayFee} disabled={payingFee}
                        className="inline-flex items-center gap-1.5 text-black text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-60"
                        style={{ background: "#D4AF37" }}>
                        {payingFee ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><IconCreditCard /> Pay GH₵ 200 Fee</>}
                      </button>
                    </div>
                  </div>
                </div>
              ) : isAcceptedMsg ? (
                <div className="w-full px-3 py-3 rounded-2xl max-w-lg" style={{ background: "color-mix(in srgb, #06C167 12%, var(--uber-surface))", border: "0.5px solid rgba(6,193,103,0.3)" }}>
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0"><IconCheckCircle /></span>
                    <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>{msg.content}</p>
                  </div>
                </div>
              ) : isDeclined ? (
                <div className="w-full px-3 py-3 rounded-2xl max-w-lg" style={{ background: "#FEE2E2", border: "0.5px solid rgba(239,68,68,0.3)" }}>
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0"><IconClose /></span>
                    <p className="text-sm font-medium text-red-700">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl max-w-[82%] overflow-hidden ${isMe ? "rounded-br-sm" : "rounded-bl-sm"} ${isOpt ? "opacity-60" : ""}`}
                  style={isMe
                    ? { background: "var(--uber-black)", color: "var(--uber-white)" }
                    : { background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  {inquiryImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={inquiryImage} alt="Property" className="w-full h-36 object-cover" />
                  )}
                  <div className="px-4 py-2.5 text-[15px] leading-relaxed">
                    {renderMessageContent(displayContent)}
                  </div>
                </div>
              )}
              <span className={`text-[9px] font-medium mt-1 uppercase tracking-wider ${isMe ? "mr-1" : "ml-1"}`} style={{ color: "var(--uber-muted)" }}>
                {isOpt ? "Sending…" : new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Pay Fee strip ── */}
      {booking?.status === "accepted" && (
        <div className="px-3 py-2.5" style={{ background: "color-mix(in srgb, #D4AF37 15%, var(--uber-surface))", borderTop: "0.5px solid rgba(212,175,55,0.3)" }}>
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--uber-text)" }}>Inquiry Accepted</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: "var(--uber-muted)" }}>Pay the GH₵ 200 fee to confirm your spot.</p>
            </div>
            <button onClick={handlePayFee} disabled={payingFee}
              className="shrink-0 flex items-center gap-1.5 text-black text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-60"
              style={{ background: "#D4AF37" }}>
              {payingFee ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><IconStar /> Pay GH₵ 200</>}
            </button>
          </div>
        </div>
      )}
      {(booking?.status === "fee_paid" || booking?.status === "paid") && (
        <div className="px-4 py-2 flex items-center gap-2" style={{ borderTop: "0.5px solid rgba(6,193,103,0.3)", background: "color-mix(in srgb, #06C167 12%, var(--uber-surface))" }}>
          <IconCheckCircle />
          <p className="text-xs font-semibold" style={{ color: "var(--uber-text)" }}>Fee paid — your spot is confirmed.</p>
        </div>
      )}

      {/* ── Input ── */}
      <div className="backdrop-blur-md p-3 pb-6 fixed left-0 right-0 lg:relative lg:bottom-auto bottom-nav-offset"
        style={{ borderTop: "0.5px solid var(--uber-border)", background: "var(--uber-white)" }}>
        {uploading && (
          <div className="flex items-center gap-2 justify-center mb-2">
            <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--uber-green)", borderTopColor: "transparent" }} />
            <span className="text-xs font-medium" style={{ color: "var(--uber-muted)" }}>Uploading…</span>
          </div>
        )}
        <input type="file" accept="image/*,.pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        <form onSubmit={sendMessage}
          className="flex items-center rounded-full p-1 max-w-3xl mx-auto"
          style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-surface)" }}>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center ml-1 active:scale-95 transition-transform disabled:opacity-40"
            style={{ color: "var(--uber-muted)" }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder="Message Concierge..." autoComplete="off"
            className="flex-1 bg-transparent border-none outline-none text-sm px-2" style={{ color: "var(--uber-text)" }} />
          <button type="submit" disabled={!newMessage.trim() || sending}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white ml-1 active:scale-95 transition-transform disabled:opacity-50"
            style={{ background: "var(--uber-black)" }}>
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
