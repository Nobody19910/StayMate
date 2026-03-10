"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AdminInbox from "@/components/admin/AdminInbox";

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

// Auto page refresh every 20 minutes
const AUTO_REFRESH_MS = 20 * 60 * 1000;
// Poll for new messages every 4 seconds
const POLL_INTERVAL_MS = 4000;

export default function SeekerChatPage() {
  const { user, profile } = useAuth();

  // Admins get their dedicated inbox rendered directly here
  if (profile?.role === "admin") {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 pt-4 md:pt-8 md:pb-8 px-2 md:px-6 flex justify-center">
        <div className="w-full max-w-6xl">
          <AdminInbox />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-24 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <span className="text-3xl">💬</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Support Chat</h1>
        <p className="text-sm text-gray-500 max-w-xs mb-8">
          Sign in to chat directly with StayMate for support and property inquiries.
        </p>
        <Link href="/login" className="bg-emerald-500 text-white font-bold py-3.5 px-12 rounded-2xl shadow-sm">
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<Conversation | null>(null);

  // --- 20-minute page refresh ---
  useEffect(() => {
    const t = setTimeout(() => window.location.reload(), AUTO_REFRESH_MS);
    return () => clearTimeout(t);
  }, []);

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

  // --- Polling: fetch messages every 4s ---
  const fetchMessages = useCallback(async () => {
    const conv = convRef.current;
    if (!conv) return;

    const { data, error: fetchErr } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (fetchErr || !data) return;
    setMessages((prev) => (prev.length === data.length ? prev : data));
  }, []);

  useEffect(() => {
    if (!conversation) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversation, fetchMessages]);

  // --- Scroll to bottom on new message ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Send ---
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
      await fetchMessages();
    }
    setSending(false);
  }

  // Build the back link for the property card
  function propertyHref(): string {
    if (!conversation?.property_id || !conversation?.property_type) return "#";
    if (conversation.property_type === "home") return `/homes/${conversation.property_id}`;
    if (conversation.property_type === "room") {
      // property_id is the room id; we need the hostel id — not stored separately,
      // so we navigate to saved or just omit deep link gracefully
      return "#";
    }
    return `/${conversation.property_type}s/${conversation.property_id}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasProperty = !!conversation?.property_title;

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: "100dvh" }}>
      {/* ── Chat Header ── */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg border border-emerald-50">
              👨‍💼
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-extrabold text-gray-900 leading-tight">StayMate Support</h1>
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">
              Typically replies instantly
            </p>
          </div>
        </div>

        {/* ── Property Card (anchored to the inquiry) ── */}
        {hasProperty && (
          <button
            onClick={() => {
              const href = propertyHref();
              if (href !== "#") router.push(href);
            }}
            className="mt-3 w-full flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
          >
            {conversation.property_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.property_image}
                alt=""
                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-xl">
                {conversation.property_type === "room" ? "🏫" : "🏠"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {conversation.property_type === "room" ? "Hostel Room Inquiry" : "Property Inquiry"}
              </p>
              <p className="text-sm font-bold text-gray-800 truncate mt-0.5">{conversation.property_title}</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* ── 200 GHS Fee Banner ── */}
      {hasProperty && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center gap-2">
          <span className="text-base shrink-0">💰</span>
          <p className="text-xs font-semibold text-amber-800">
            Viewing and coordination fee for this property: <span className="font-extrabold">GH₵ 200</span>
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
            className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-start gap-2 overflow-hidden"
          >
            <p className="text-xs text-red-600 font-mono flex-1 break-all">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 text-xs shrink-0">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4" style={{ paddingBottom: "120px" }}>
        <div className="text-center mb-6">
          <p className="text-xs font-semibold text-gray-400 bg-gray-100 inline-block px-3 py-1 rounded-full uppercase tracking-wider">
            Start of conversation
          </p>
          <p className="text-xs text-gray-400 mt-2 max-w-[240px] mx-auto">
            This is your direct line to StayMate. Ask us anything!
          </p>
        </div>

        {messages.length === 0 && (
          <div className="text-center py-10 opacity-60">
            <p className="text-sm text-gray-400">No messages yet. Say hi! 👋</p>
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
                <div className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-[10px] mb-1 ml-1">💼</div>
              )}
              <div
                className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed max-w-[82%] ${
                  isMe
                    ? "bg-emerald-500 text-white rounded-br-sm shadow-sm"
                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
                }`}
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

      {/* ── Input ── */}
      <div className="bg-white border-t border-gray-100 p-3 pb-6 fixed bottom-16 left-0 right-0 lg:relative lg:bottom-auto">
        <form
          onSubmit={sendMessage}
          className="flex items-center bg-gray-50 border border-gray-200 rounded-full p-1 pl-4 shadow-inner max-w-lg mx-auto"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message Support..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 shrink-0 bg-emerald-500 rounded-full flex items-center justify-center text-white ml-2 shadow-md active:scale-95 transition-transform disabled:opacity-50"
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
