"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Message, Conversation } from "@/lib/types";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SeekerChatPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let realtimeChannel: ReturnType<typeof supabase.channel>;

    async function initChat() {
      if (!user) return;
      
      // 1. Get or create conversation for this seeker
      let { data: conv, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .eq("seeker_id", user.id)
        .single();
        
      if (!conv && convError?.code === "PGRST116") {
        // Doesn't exist, create it
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({ seeker_id: user.id })
          .select()
          .single();
        conv = newConv;
      }
      
      if (conv) {
        setConversation(conv);
        // 2. Fetch existing messages
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });
          
        if (msgs) setMessages(msgs);
        
        // 3. Subscribe to new messages
        realtimeChannel = supabase
          .channel(`chat_${conv.id}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` },
            (payload) => {
              setMessages((prev) => [...prev, payload.new as Message]);
            }
          )
          .subscribe();
      }
      setLoading(false);
    }

    initChat();

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [user]);

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || !user) return;
    
    const content = newMessage.trim();
    setNewMessage("");
    
    // Optimistic UI update could be added here, but relying on realtime for simplicity
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: content,
      is_read: false
    });
    
    // Update conversation timestamp
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
        <p className="text-sm text-gray-500 max-w-xs mb-8">Sign in to chat directly with StayMate agents for support and property inquiries.</p>
        <Link href="/login" className="bg-emerald-500 text-white font-bold py-3.5 px-12 rounded-2xl active:scale-95 transition-transform shadow-sm">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 pb-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg shadow-sm border border-emerald-50">
              👨‍💼
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-gray-900 leading-tight">StayMate Support</h1>
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">Typically replies instantly</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-32"
      >
        <div className="text-center mb-8">
          <p className="text-xs font-semibold text-gray-400 bg-gray-100 inline-block px-3 py-1 rounded-full uppercase tracking-wider">
            Conversation Started
          </p>
          <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">
            This is the start of your direct line to StayMate. Ask us anything!
          </p>
        </div>

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user.id;
          const showAvatar = !isMe && (i === messages.length - 1 || messages[i + 1]?.sender_id === user.id);
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <div className="flex items-end gap-2 max-w-[85%]">
                {!isMe && (
                  <div className="w-6 h-6 shrink-0 flex items-center justify-center bg-gray-200 rounded-full text-[10px] mb-1">
                    {showAvatar ? "💼" : ""}
                  </div>
                )}
                <div 
                  className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed relative ${
                    isMe 
                      ? "bg-emerald-500 text-white rounded-br-sm shadow-sm" 
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
              <span className={`text-[9px] text-gray-400 font-medium mt-1 uppercase tracking-wider ${isMe ? "mr-1" : "ml-9"}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-100 p-3 pb-8 md:pb-4 fixed bottom-0 left-0 right-0 lg:absolute lg:bottom-0">
        <form onSubmit={sendMessage} className="relative max-w-lg mx-auto flex items-center bg-gray-50 border border-gray-200 rounded-full p-1 pl-4 shadow-inner">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message Support..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
            required
            autoComplete="off"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="w-10 h-10 shrink-0 bg-emerald-500 rounded-full flex items-center justify-center text-white ml-2 shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            <svg className="w-4 h-4 translate-x-px" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
