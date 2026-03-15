"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function EditListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  
  const id = params.id as string;
  const type = searchParams.get("type") as "home" | "hostel";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!id || !type) {
      router.push("/dashboard");
      return;
    }

    async function load() {
      setLoading(true);
      if (type === "home") {
        const { data } = await supabase.from("homes").select("*").eq("id", id).single();
        if (data) {
          setTitle(data.title);
          setDescription(data.description);
          setPrice(data.price.toString());
        }
      } else {
        const { data } = await supabase.from("hostels").select("*").eq("id", id).single();
        if (data) {
          setTitle(data.name);
          setDescription(data.description);
        }
      }
      setLoading(false);
    }
    load();
  }, [id, type, user, authLoading, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (type === "home") {
        const priceNum = parseFloat(price.replace(/[^\d.]/g, "")) || 0;
        const { data: currentData } = await supabase.from("homes").select("for_sale").eq("id", id).single();
        const priceLabel = `GH₵${priceNum.toLocaleString()}${currentData?.for_sale ? "" : "/mo"}`;

        const { error: updateError } = await supabase.from("homes").update({
          title,
          description,
          price: priceNum,
          price_label: priceLabel
        }).eq("id", id);
        
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase.from("hostels").update({
          name: title,
          description,
        }).eq("id", id);
        if (updateError) throw updateError;
      }
      
      router.push("/dashboard?tab=listings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || authLoading) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-pulse w-16 h-16 bg-gray-200 rounded-full" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-gray-900">Edit {type === "home" ? "Home" : "Hostel"}</h1>
      </div>

      <div className="px-4 py-8 max-w-lg mx-auto w-full">
        {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 text-sm font-semibold p-3 rounded-xl mb-6">
                {error}
            </div>
        )}
        <form onSubmit={handleSave} className="space-y-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title / Name *</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </div>

          {type === "home" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Price (GH₵) *</label>
                <input 
                  type="text" 
                  value={price} 
                  inputMode="numeric"
                  onChange={e => setPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description *</label>
            <textarea 
              rows={5}
              value={description} 
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-emerald-500 text-white font-bold py-3 mt-4 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
