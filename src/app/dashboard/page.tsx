"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface MyHome {
  id: string;
  title: string;
  price_label: string;
  city: string;
  for_sale: boolean;
  images: string[];
  created_at: string;
}

interface MyHostel {
  id: string;
  name: string;
  price_range_label: string;
  city: string;
  images: string[];
  available_rooms: number;
  total_rooms: number;
  created_at: string;
}

interface MyBooking {
  id: string;
  listing_title: string;
  listing_type: string;
  seeker_name: string;
  seeker_email: string;
  seeker_phone: string | null;
  price_label: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [homes, setHomes] = useState<MyHome[]>([]);
  const [hostels, setHostels] = useState<MyHostel[]>([]);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"listings" | "bookings">("listings");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && profile && profile.role === "seeker") {
      router.push("/homes");
      return;
    }
  }, [authLoading, user, profile, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      const [homesRes, hostelsRes, bookingsRes] = await Promise.all([
        supabase.from("homes").select("id,title,price_label,city,for_sale,images,created_at").eq("owner_id", user!.id),
        supabase.from("hostels").select("id,name,price_range_label,city,images,available_rooms,total_rooms,created_at").eq("manager_id", user!.id),
        supabase.from("bookings").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false }),
      ]);
      setHomes((homesRes.data ?? []) as MyHome[]);
      setHostels((hostelsRes.data ?? []) as MyHostel[]);
      setBookings((bookingsRes.data ?? []) as MyBooking[]);
      setLoading(false);
    }
    load();
  }, [user]);

  async function deleteListing(type: "home" | "hostel", id: string) {
    setDeletingId(id);
    const table = type === "home" ? "homes" : "hostels";
    await supabase.from(table).delete().eq("id", id);
    if (type === "home") {
      setHomes((prev) => prev.filter((h) => h.id !== id));
    } else {
      setHostels((prev) => prev.filter((h) => h.id !== id));
    }
    setDeletingId(null);
  }

  async function updateBookingStatus(id: string, status: string) {
    await supabase.from("bookings").update({ status }).eq("id", id);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full px-4 max-w-sm">
          <div className="h-20 bg-gray-200 rounded-2xl" />
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const totalListings = homes.length + hostels.length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">{profile.fullName ?? user.email}</p>
          </div>
          <button
            onClick={() => router.push("/post")}
            className="bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition-transform"
          >
            + New Listing
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{totalListings}</p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Active Listings</p>
          </div>
          <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-extrabold text-amber-600">{pendingBookings}</p>
            <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Pending Requests</p>
          </div>
          <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-extrabold text-blue-600">{bookings.filter((b) => b.status === "confirmed").length}</p>
            <p className="text-[10px] text-blue-700 font-semibold mt-0.5">Confirmed</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-gray-100 rounded-xl p-1">
          {(["listings", "bookings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              {t}
              {t === "bookings" && pendingBookings > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingBookings}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === "listings" ? (
          <>
            {totalListings === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-5xl mb-4">🏠</p>
                <p className="text-base font-semibold text-gray-600">No listings yet</p>
                <p className="text-sm text-gray-400 mt-1">Post your first property to get started</p>
                <button
                  onClick={() => router.push("/post")}
                  className="mt-4 bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl text-sm active:scale-95 transition-transform"
                >
                  Post a Listing
                </button>
              </div>
            ) : (
              <>
                {homes.map((home, i) => (
                  <motion.div
                    key={home.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                        {home.images[0] && (
                          <Image src={home.images[0]} alt={home.title} fill className="object-cover" unoptimized />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 leading-tight truncate">{home.title}</p>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                            {home.for_sale ? "Sale" : "Rent"}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-600 font-semibold mt-0.5">{home.price_label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{home.city}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => router.push(`/homes/${home.id}`)}
                            className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg"
                          >
                            View
                          </button>
                          <button
                            onClick={() => router.push(`/edit/${home.id}?type=home`)}
                            className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteListing("home", home.id)}
                            disabled={deletingId === home.id}
                            className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-lg disabled:opacity-50"
                          >
                            {deletingId === home.id ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {hostels.map((hostel, i) => (
                  <motion.div
                    key={hostel.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (homes.length + i) * 0.05 }}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                        {hostel.images[0] && (
                          <Image src={hostel.images[0]} alt={hostel.name} fill className="object-cover" unoptimized />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 leading-tight truncate">{hostel.name}</p>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">Hostel</span>
                        </div>
                        <p className="text-xs text-blue-600 font-semibold mt-0.5">{hostel.price_range_label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{hostel.city} · {hostel.available_rooms}/{hostel.total_rooms} rooms available</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => router.push(`/hostels/${hostel.id}`)}
                            className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg"
                          >
                            View
                          </button>
                          <button
                            onClick={() => router.push(`/edit/${hostel.id}?type=hostel`)}
                            className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteListing("hostel", hostel.id)}
                            disabled={deletingId === hostel.id}
                            className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-lg disabled:opacity-50"
                          >
                            {deletingId === hostel.id ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-5xl mb-4">📭</p>
                <p className="text-base font-semibold text-gray-600">No booking requests yet</p>
                <p className="text-sm text-gray-400 mt-1">Requests will appear here when seekers freeze your properties</p>
              </div>
            ) : (
              bookings.map((booking, i) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{booking.listing_title}</p>
                      <p className="text-xs text-emerald-600 font-semibold">{booking.price_label}</p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-1 mb-3">
                    <p className="text-xs font-semibold text-gray-800">{booking.seeker_name}</p>
                    <p className="text-[11px] text-gray-500">{booking.seeker_email}</p>
                    {booking.seeker_phone && (
                      <a
                        href={`tel:${booking.seeker_phone}`}
                        className="text-[11px] text-emerald-600 font-semibold"
                      >
                        📞 {booking.seeker_phone}
                      </a>
                    )}
                  </div>
                  {booking.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateBookingStatus(booking.id, "confirmed")}
                        className="flex-1 bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-transform"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateBookingStatus(booking.id, "cancelled")}
                        className="flex-1 border border-red-200 text-red-500 font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-transform"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {booking.status === "confirmed" && (
                    <button
                      onClick={() => updateBookingStatus(booking.id, "completed")}
                      className="w-full bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-transform"
                    >
                      Mark as Completed (Payment Received)
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BookingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-600",
    completed: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
