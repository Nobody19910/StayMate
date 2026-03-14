"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AdminInbox from "@/components/admin/AdminInbox";
import { usePaystackScript, openPaystackPopup } from "@/lib/paystack";

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
      <div className="min-h-screen bg-[#F9F9F9] pb-20 pt-4 md:pt-8 md:pb-8 px-2 md:px-6 flex justify-center">
        <div className="w-full max-w-6xl">
          <AdminInbox />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex flex-col items-center pt-24 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center mb-6" style={{ border: "0.5px solid rgba(0,0,0,0.1)" }}>
          <span className="text-3xl">💬</span>
        </div>
        <h1
          className="text-2xl font-bold text-[#1A1A1A] mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Support Chat
        </h1>
        <p className="text-sm text-gray-500 max-w-xs mb-8">
          Sign in to chat directly with StayMate for support and property inquiries.
        </p>
        <Link
          href="/login"
          className="text-white font-semibold py-3.5 px-12 rounded-2xl shadow-sm"
          style={{ background: "#1A1A1A" }}
        >
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
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [payingFee, setPayingFee] = useState(false);

  usePaystackScript();

  const scrollRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<Conversation | null>(null);

  // --- Init: get or create conversation ---
  useEffect(() => {
    if (!user) return;

    async function init() {
      try {
        let { data: conv, error: err } = await supabase
          .from("conversations")
          .select("*")
          .eq("seeker_id", user.id)
          .maybeSingle();

        if (err) { setError(`Error loading chat: ${err.message}`); setLoading(false); return; }

        if (!conv) {
          const { data: created, error: createErr } = await supabase
            .from("conversations")
            .insert({ seeker_id: user.id })
            .select("*")
            .single();
          if (createErr) { setError(`Error starting chat: ${createErr.message}`); setLoading(false); return; }
          conv = created;
        }

        if (conv) {
          setConversation(conv);
          convRef.current = conv;
        }
      } catch (e: any) {
        setError(`Unexpected error: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [user]);

  // --- Fetch messages once then subscribe via Realtime ---
  const fetchMessages = useCallback(async () => {
    const conv = convRef.current;
    if (!conv) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  }, []);

  useEffect(() => {
    if (!conversation) return;
    fetchMessages();

    // Supabase Realtime — subscribe to new messages in this conversation
    const channel = supabase
      .channel(`chat:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation, fetchMessages]);

  // Fetch + subscribe to booking status
  useEffect(() => {
    if (!user) return;

    async function fetchBooking() {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setBooking(data);
    }
    fetchBooking();

    const channel = supabase
      .channel(`booking:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` },
        (payload) => { setBooking(payload.new); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const conv = convRef.current;
    if (!newMessage.trim() || !conv || !user || sending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const { error: sendErr } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: user.id,
      content,
      is_read: false,
    });

    if (sendErr) {
      setError(`Failed to send: ${sendErr.message}`);
    } else {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conv.id);
    }
    setSending(false);
  }

  async function handlePayFee() {
    if (!user || !booking) return;
    setPayingFee(true);
    openPaystackPopup({
      email: user.email ?? "guest@staymate.app",
      amount: 20000, // GH₵ 200 in pesewas
      currency: "GHS",
      metadata: { booking_id: booking.id, user_id: user.id },
      onSuccess: async (reference) => {
        await supabase
          .from("bookings")
          .update({ status: "fee_paid", payment_reference: reference })
          .eq("id", booking.id);
        setPayingFee(false);
      },
      onClose: () => setPayingFee(false),
    });
  }

  function propertyHref(): string {
    if (!conversation?.property_id || !conversation?.property_type) return "#";
    if (conversation.property_type === "home") return `/homes/${conversation.property_id}`;
    return "#";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasProperty = !!conversation?.property_title;

  return (
    <div className="flex flex-col bg-[#F9F9F9]" style={{ height: "100dvh" }}>

      {/* ── Chat Header ── */}
      <div
        className="bg-white/95 backdrop-blur-md px-4 py-3 sticky top-0 z-10"
        style={{ borderBottom: "0.5px solid rgba(0,0,0,0.09)" }}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center text-lg"
            >
              <span className="text-white text-sm font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>SM</span>
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-sm font-bold text-[#1A1A1A] leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              StayMate Concierge
            </h1>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
              Typically replies instantly
            </p>
          </div>
        </div>

        {/* Property card anchor */}
        {hasProperty && (
          <button
            onClick={() => { const href = propertyHref(); if (href !== "#") router.push(href); }}
            className="mt-3 w-full flex items-center gap-3 bg-[#F9F9F9] rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
            style={{ border: "0.5px solid rgba(0,0,0,0.09)" }}
          >
            {conversation.property_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={conversation.property_image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-200" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#1A1A1A]/5 flex items-center justify-center shrink-0 text-xl">
                {conversation.property_type === "room" ? "🏫" : "🏠"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {conversation.property_type === "room" ? "Hostel Room Inquiry" : "Property Inquiry"}
              </p>
              <p className="text-sm font-bold text-[#1A1A1A] truncate mt-0.5" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {conversation.property_title}
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Coordination Fee Banner ── */}
      {hasProperty && (
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "#FDF8E7", borderBottom: "0.5px solid rgba(212,175,55,0.3)" }}>
          <span className="text-base shrink-0" style={{ color: "#D4AF37" }}>✦</span>
          <p className="text-xs font-medium text-[#1A1A1A]">
            Coordination & Viewing Fee for this property:{" "}
            <span className="font-bold" style={{ color: "#D4AF37" }}>GH₵ 200</span>
          </p>
        </div>
      )}

      {/* ── Error Banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 px-4 py-2 flex items-start gap-2 overflow-hidden"
            style={{ borderBottom: "0.5px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-xs text-red-600 font-mono flex-1 break-all">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 text-xs shrink-0">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4" style={{ paddingBottom: "130px" }}>
        <div className="text-center mb-6">
          <p className="text-[10px] font-semibold text-gray-400 bg-[#1A1A1A]/5 inline-block px-3 py-1 rounded-full uppercase tracking-wider">
            Start of conversation
          </p>
          <p className="text-xs text-gray-400 mt-2 max-w-[240px] mx-auto">
            Your direct line to StayMate. We handle every detail.
          </p>
        </div>

        {messages.length === 0 && (
          <div className="text-center py-10 opacity-60">
            <p className="text-sm text-gray-400">No messages yet. Say hello 👋</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === user.id;
          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              {!isMe && (
                <div className="w-6 h-6 flex items-center justify-center bg-[#1A1A1A] rounded-full text-[9px] text-white font-bold mb-1 ml-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  SM
                </div>
              )}
              <div
                className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed max-w-[82%] ${
                  isMe
                    ? "text-white rounded-br-sm"
                    : "text-[#1A1A1A] rounded-bl-sm"
                }`}
                style={isMe
                  ? { background: "#1A1A1A" }
                  : { background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                {msg.content}
              </div>
              <span className={`text-[9px] text-gray-400 font-medium mt-1 uppercase tracking-wider ${isMe ? "mr-1" : "ml-1"}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* ── Pay Fee Strip (accepted) ── */}
      {booking?.status === "accepted" && (
        <div className="px-3 py-2.5" style={{ background: "#FDF8E7", borderTop: "0.5px solid rgba(212,175,55,0.3)" }}>
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-widest">Inquiry Accepted</p>
              <p className="text-xs text-gray-600 font-medium mt-0.5">Pay the GH₵ 200 fee to confirm your spot.</p>
            </div>
            <button
              onClick={handlePayFee}
              disabled={payingFee}
              className="shrink-0 flex items-center gap-1.5 text-[#1A1A1A] text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-60"
              style={{ background: "#D4AF37" }}
            >
              {payingFee
                ? <div className="w-3.5 h-3.5 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
                : <>✦ Pay GH₵ 200</>}
            </button>
          </div>
        </div>
      )}

      {(booking?.status === "fee_paid" || booking?.status === "paid") && (
        <div className="px-4 py-2 flex items-center gap-2 max-w-lg mx-auto w-full" style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)" }}>
          <span className="text-sm">✅</span>
          <p className="text-xs font-semibold text-[#1A1A1A]">Fee paid — your spot is confirmed.</p>
        </div>
      )}

      {/* ── Input ── */}
      <div
        className="bg-white/95 backdrop-blur-md p-3 pb-6 fixed bottom-16 left-0 right-0 lg:relative lg:bottom-auto"
        style={{ borderTop: "0.5px solid rgba(0,0,0,0.09)" }}
      >
        <form
          onSubmit={sendMessage}
          className="flex items-center bg-[#F9F9F9] rounded-full p-1 pl-4 max-w-lg mx-auto"
          style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message Concierge..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#1A1A1A] placeholder:text-gray-400"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white ml-2 active:scale-95 transition-transform disabled:opacity-50"
            style={{ background: "#1A1A1A" }}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 translate-x-px" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
