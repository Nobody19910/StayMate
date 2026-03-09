"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Conversation, Message } from "@/lib/types";
import { motion } from "framer-motion";

export default function AdminInbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    async function fetchConversations() {
      // Fetch all conversations with seeker details (from profiles)
      const { data } = await supabase
        .from("conversations")
        .select("*, seeker:profiles(id, full_name, email, avatar_url)")
        .order("updated_at", { ascending: false });

      if (data) setConversations(data);
      setLoading(false);
    }
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedConv) return;

    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConv.id)
        .order("created_at", { ascending: true });

      if (data) setMessages(data);

      // Subscribe to new messages for this conversation
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`admin_chat_${selectedConv.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConv.id}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();
        
      channelRef.current = channel;
    }

    loadMessages();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedConv]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    const content = newMessage.trim();
    setNewMessage("");

    // Identify as admin (using a fixed system UUID or null, but table needs owner. Let's just use the current admin's user ID)
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: userData.user.id,
      content: content,
      is_read: true // admin sent it
    });

    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConv.id);
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading inbox...</div>;
  }

  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex h-[600px]">
      {/* Sidebar List */}
      <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h2 className="font-extrabold text-gray-900">Inbox</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
            {conversations.length} Active Chats
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center italic">No messages yet.</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full text-left p-4 border-b border-gray-100 flex items-center gap-3 transition-colors ${
                  selectedConv?.id === conv.id ? "bg-emerald-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  {conv.seeker?.avatar_url ? (
                    <img src={conv.seeker.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <span className="font-bold text-emerald-700">{conv.seeker?.full_name?.[0] || "?"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{conv.seeker?.full_name || "Unknown User"}</p>
                  <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                    {new Date(conv.updated_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm z-10">
              <div>
                <h3 className="font-extrabold text-gray-900">{selectedConv.seeker?.full_name}</h3>
                <p className="text-xs text-gray-400">{selectedConv.seeker?.email}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
              {messages.length === 0 ? (
                <p className="text-center text-xs text-gray-400 mt-10">No messages in this conversation yet.</p>
              ) : (
                messages.map((msg, i) => {
                  const isAdmin = msg.sender_id !== selectedConv.seeker_id;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                    >
                      <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-[14px] leading-relaxed shadow-sm ${
                        isAdmin 
                          ? "bg-emerald-500 text-white rounded-br-sm" 
                          : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-gray-400 font-medium mt-1 uppercase tracking-wider mx-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-white border-t border-gray-100">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a response..."
                  className="flex-1 bg-gray-50 border border-gray-200 outline-none rounded-full px-4 py-2.5 text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 translate-x-px" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <span className="text-4xl mb-4 opacity-50">💬</span>
            <p className="font-bold">Select a conversation</p>
            <p className="text-xs mt-1">Choose a seeker from the left sidebar to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
