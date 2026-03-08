"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function PostPropertyPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  // Auto-fill from profile
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.fullName || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setLoadingSubs(false);
      return;
    }
    async function fetchMine() {
      const { data } = await supabase
        .from("landlord_leads")
        .select("*")
        .eq("seeker_id", user!.id)
        .order("created_at", { ascending: false });
      if (data) setMySubmissions(data);
      setLoadingSubs(false);
    }
    fetchMine();
  }, [user, success]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("landlord_leads").insert({
      name,
      phone,
      location,
      property_details: details,
      seeker_id: user?.id ?? null,
    });

    setLoading(false);
    if (!error) {
      setSuccess(true);
      setLocation("");
      setDetails("");
    } else {
      alert("Failed to submit. Please try again.");
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 pb-24 text-center">
        <span className="text-5xl mb-4">🔒</span>
        <h1 className="text-xl font-extrabold text-gray-900 mb-2">Sign in Required</h1>
        <p className="text-sm text-gray-500 mb-6">You need to be signed in to post a property.</p>
        <button
          onClick={() => router.push("/login")}
          className="bg-emerald-500 text-white font-bold py-3 px-8 rounded-2xl active:scale-95 transition-transform"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Hero */}
      <div className="bg-emerald-500 text-white rounded-b-[40px] px-6 pt-16 pb-12 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        <h1 className="text-3xl font-extrabold mb-3 leading-tight relative z-10">
          Post Property
        </h1>
        <p className="text-emerald-50 text-sm font-medium opacity-90 relative z-10 max-w-sm mx-auto">
          Submit your property details below. A StayMate Admin will verify and list it for you.
        </p>
      </div>

      <div className="px-4 -mt-6 relative z-20">
        <div className="max-w-md mx-auto">
          {/* Pitch Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
              <span className="text-2xl mb-1 block">📸</span>
              <p className="text-xs font-bold text-gray-900">Pro Photos &amp; Video</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
              <span className="text-2xl mb-1 block">🛡️</span>
              <p className="text-xs font-bold text-gray-900">Admin Verified</p>
            </div>
          </div>

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 text-center">
              <span className="text-3xl block mb-2">✨</span>
              <p className="text-sm font-bold text-emerald-800">Property submitted successfully!</p>
              <p className="text-xs text-emerald-600 mt-1">A StayMate Admin will review and contact you shortly.</p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-3 text-xs font-bold text-emerald-700 underline"
              >
                Submit Another
              </button>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-extrabold text-gray-900 mb-2 border-b border-gray-100 pb-3">Property Details</h2>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  Your Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 transition-all placeholder:text-gray-400 placeholder:font-medium"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 transition-all placeholder:text-gray-400 placeholder:font-medium"
                  placeholder="e.g. 054 123 4567"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  Property Location *
                </label>
                <input
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 transition-all placeholder:text-gray-400 placeholder:font-medium"
                  placeholder="e.g. East Legon, Accra"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  Property Details *
                </label>
                <textarea
                  required
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 transition-all placeholder:text-gray-400 placeholder:font-medium resize-none"
                  placeholder="How many bedrooms? Is it a hostel? Rent or Sale? Price range?"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-white font-bold text-lg py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 shadow-md shadow-emerald-500/20 mt-2"
              >
                {loading ? "Submitting..." : "Submit for Verification"}
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-3 font-medium">
                Your contact info is only shared with the StayMate Admin, not other users.
              </p>
            </form>
          )}

          {/* My Submissions */}
          <div className="mt-8 mb-4">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3 px-1">My Submissions</h3>
            {loadingSubs ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-2xl p-4 h-20" />
                ))}
              </div>
            ) : mySubmissions.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-5 text-center border border-gray-100">
                <p className="text-sm text-gray-400">No submissions yet. Post your first property above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mySubmissions.map(sub => (
                  <div key={sub.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{sub.location}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{sub.property_details || "No details"}</p>
                      </div>
                      <span className={`shrink-0 ml-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        sub.status === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : sub.status === "rejected"
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {new Date(sub.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
