"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const AUTO_REFRESH_MS = 20 * 60 * 1000;
const CONV_POLL_MS = 6000;
const MSG_POLL_MS = 4000;

export default function AdminInbox() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedConvRef = useRef<any>(null);

  // 20-minute page refresh
  useEffect(() => {
    const t = setTimeout(() => window.location.reload(), AUTO_REFRESH_MS);
    return () => clearTimeout(t);
  }, []);

  // --- Fetch conversations (polling) ---
  const fetchConversations = useCallback(async () => {
    const { data: convs, error: convsError } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (convsError) {
      setError(`Error fetching conversations: ${convsError.message}`);
      setLoading(false);
      return;
    } else {
      setError(null);
    }

    if (convs && convs.length > 0) {
      const seekerIds = convs.map((c) => c.seeker_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url")
        .in("id", seekerIds);

      const mapped = convs.map((c) => {
        const p = profiles?.find((prof) => prof.id === c.seeker_id);
        return {
          ...c,
          seeker: p || { full_name: "Unknown", phone: "No phone", id: c.seeker_id },
        };
      });
      setConversations(mapped);
    } else {
      setConversations([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, CONV_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // --- Fetch messages for selected conversation (polling) ---
  const fetchMessages = useCallback(async () => {
    const conv = selectedConvRef.current;
    if (!conv) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages((prev) => (prev.length === data.length ? prev : data));
    }
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    selectedConvRef.current = selectedConv;
    setMessages([]);
    fetchMessages();
    const interval = setInterval(fetchMessages, MSG_POLL_MS);
    return () => clearInterval(interval);
  }, [selectedConv, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Auto-select conversation from query params ---
  useEffect(() => {
    if (typeof window === "undefined" || !conversations.length) return;
    const params = new URLSearchParams(window.location.search);
    const seekerId = params.get("seeker_id");
    if (seekerId && !selectedConv) {
      const match = conversations.find((c) => c.seeker_id === seekerId);
      if (match) setSelectedConv(match);
    }
  }, [conversations, selectedConv]);

  // --- Send message as admin ---
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || sending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSending(false); return; }

    await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: userData.user.id,
      content,
      is_read: true,
    });

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedConv.id);

    await fetchMessages();
    setSending(false);
  }

  // --- Delete conversation ---
  async function deleteConversation() {
    if (!selectedConv) return;
    if (!confirm("Are you sure you want to permanently delete this entire chat conversation?")) return;

    const { error } = await supabase.from("conversations").delete().eq("id", selectedConv.id);
    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== selectedConv.id));
      setSelectedConv(null);
    } else {
      alert("Error deleting chat: " + error.message);
    }
  }

  // Navigate to the property page from within admin chat
  function navigateToProperty(conv: any) {
    if (!conv.property_id || !conv.property_type) return;
    if (conv.property_type === "home") router.push(`/homes/${conv.property_id}`);
    else if (conv.property_type === "hostel") router.push(`/hostels/${conv.property_id}`);
    // room: no reliable hostel_id available here; skip navigation
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8 text-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading inbox...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8 text-center text-red-500">
        <p className="text-sm font-mono">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="bg-white md:border border-gray-100 md:rounded-3xl md:shadow-sm overflow-hidden flex flex-col md:flex-row h-[100dvh] md:h-[700px] -mx-4 md:mx-0 -mt-4 md:mt-0">
      {/* ── Sidebar / Thread List ── */}
      <div className={`md:w-[320px] lg:w-1/3 border-r border-gray-100 flex-col bg-gray-50/50 ${selectedConv ? "hidden md:flex" : "flex"} h-full`}>
        <div className="p-4 border-b border-gray-100 bg-white shadow-sm z-10 sticky top-0">
          <h2 className="font-extrabold text-gray-900">Support Inbox</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
            {conversations.length} Active {conversations.length === 1 ? "Chat" : "Chats"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center italic">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full text-left p-4 border-b border-gray-100 flex items-start gap-3 transition-colors ${
                  selectedConv?.id === conv.id ? "bg-emerald-50 border-l-2 border-l-emerald-500" : "hover:bg-gray-50"
                }`}
              >
                {/* Seeker avatar */}
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 font-bold text-emerald-700 text-sm mt-0.5">
                  {conv.seeker?.full_name?.[0]?.toUpperCase() || "?"}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Seeker name + date */}
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{conv.seeker?.full_name || "Unknown User"}</p>
                    <span className="text-[9px] text-gray-400 shrink-0">
                      {new Date(conv.updated_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{conv.seeker?.phone || "No phone"}</p>

                  {/* Property pill */}
                  {conv.property_title && (
                    <div className="flex items-center gap-1.5 mt-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1 max-w-full overflow-hidden">
                      {conv.property_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={conv.property_image} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                      ) : (
                        <span className="text-[11px] shrink-0">{conv.property_type === "room" ? "🏫" : "🏠"}</span>
                      )}
                      <p className="text-[10px] font-semibold text-gray-700 truncate">{conv.property_title}</p>
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className={`flex-1 flex flex-col bg-white overflow-hidden ${!selectedConv ? "hidden md:flex" : "flex"} h-full`}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-100 bg-white shadow-sm z-10 sticky top-0">
              <div className="p-3 flex items-center gap-3">
                <button
                  onClick={() => setSelectedConv(null)}
                  className="md:hidden w-8 h-8 flex items-center justify-center shrink-0 bg-gray-50 rounded-full"
                >
                  ←
                </button>
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 shrink-0">
                  {selectedConv.seeker?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-gray-900 text-sm leading-tight">{selectedConv.seeker?.full_name || "User"}</h3>
                  <p className="text-[10px] text-gray-400 font-medium">{selectedConv.seeker?.phone || "No phone provided"}</p>
                </div>
                <button
                  onClick={deleteConversation}
                  className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors shrink-0"
                  title="Delete Chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Property Card — clickable, jumps to property page */}
              {selectedConv.property_title && (
                <button
                  onClick={() => navigateToProperty(selectedConv)}
                  className="w-full flex items-center gap-3 bg-gray-50 border-t border-gray-100 px-4 py-2.5 text-left hover:bg-gray-100 transition-colors"
                >
                  {selectedConv.property_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedConv.property_image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-lg">
                      {selectedConv.property_type === "room" ? "🏫" : "🏠"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      {selectedConv.property_type === "room" ? "Hostel Room" : "Property"} Inquiry
                    </p>
                    <p className="text-xs font-bold text-gray-800 truncate">{selectedConv.property_title}</p>
                  </div>
                  <div className="shrink-0 text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg whitespace-nowrap">
                    GH₵ 200 fee
                  </div>
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 pb-24 md:pb-4">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-gray-400 mt-10 italic">No messages yet in this conversation.</p>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_id !== selectedConv.seeker_id;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-[13px] leading-relaxed shadow-sm ${
                          isAdmin
                            ? "bg-emerald-500 text-white rounded-br-sm"
                            : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-gray-400 font-medium mt-0.5 uppercase tracking-wider mx-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-gray-100 sticky bottom-0 z-10 pb-5 md:pb-3">
              <form onSubmit={sendMessage} className="flex items-center gap-2 max-w-2xl mx-auto w-full">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Message Seeker..."
                  className="flex-1 bg-gray-50 border border-gray-200 outline-none rounded-full px-4 py-2.5 text-sm w-full"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 active:scale-90 transition-transform"
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 gap-2 p-8 text-center h-full">
            <span className="text-4xl opacity-40">💬</span>
            <p className="font-bold text-sm">Select a conversation</p>
            <p className="text-xs text-center max-w-[180px]">Choose a seeker from the left to read and reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}
