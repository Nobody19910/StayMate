"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { PropertyType, PropertyCondition, FurnishingLevel, RoomAmenity, RoomType } from "@/lib/types";
import SponsorModal from "@/components/ui/SponsorModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PHOTOS = 5;

const PROPERTY_TYPES: { value: PropertyType; label: string; icon: string }[] = [
  { value: "apartment", label: "Apartment / Flat", icon: "🏢" },
  { value: "house", label: "House", icon: "🏡" },
  { value: "studio", label: "Studio", icon: "🛋️" },
  { value: "duplex", label: "Duplex", icon: "🏘️" },
  { value: "townhouse", label: "Townhouse", icon: "🏙️" },
];

const ROOM_TYPES: { value: RoomType; label: string; sub: string }[] = [
  { value: "single", label: "Single", sub: "1 person" },
  { value: "double", label: "Double", sub: "2 people" },
  { value: "triple", label: "Triple", sub: "3 people" },
  { value: "quad", label: "Quad", sub: "4 people" },
  { value: "dormitory", label: "Dorm", sub: "5+" },
];

const HOME_AMENITIES: { value: string; label: string; icon: string }[] = [
  { value: "AC", label: "Air Con", icon: "❄️" },
  { value: "Generator", label: "Standby Generator", icon: "⚡" },
  { value: "Borehole", label: "Borehole", icon: "💧" },
  { value: "Water Supply", label: "Water Supply", icon: "🚰" },
  { value: "Security", label: "24/7 Security", icon: "🔐" },
  { value: "Gated Estate", label: "Gated Estate", icon: "🏘️" },
  { value: "Electric Fencing", label: "Electric Fencing", icon: "⚡" },
  { value: "Fitted Kitchen", label: "Fitted Kitchen", icon: "🍳" },
  { value: "Wardrobe", label: "Wardrobe", icon: "👔" },
  { value: "POP Ceiling", label: "POP Ceiling", icon: "✨" },
  { value: "Pool", label: "Swimming Pool", icon: "🏊" },
  { value: "Boys Quarters", label: "BQ", icon: "🏠" },
  { value: "WiFi", label: "Fiber Wi-Fi", icon: "📶" },
  { value: "Parking", label: "Parking", icon: "🚗" },
  { value: "Furnished", label: "Furnished", icon: "🛋️" },
  { value: "Garden", label: "Garden", icon: "🌿" },
  { value: "Smart Home", label: "Smart Home", icon: "🏡" },
  { value: "Cleaning Service", label: "Cleaning Service", icon: "🧹" },
];

const CONDITION_OPTIONS: { value: PropertyCondition; label: string }[] = [
  { value: "new", label: "New Build" },
  { value: "renovated", label: "Renovated" },
  { value: "used", label: "Used" },
];

const FURNISHING_OPTIONS: { value: FurnishingLevel; label: string }[] = [
  { value: "furnished", label: "Furnished" },
  { value: "semi-furnished", label: "Semi-Furnished" },
  { value: "unfurnished", label: "Unfurnished" },
];

const ROOM_AMENITIES: { value: RoomAmenity; label: string; icon: string }[] = [
  { value: "wifi", label: "WiFi", icon: "📶" },
  { value: "ac", label: "Air Con", icon: "❄️" },
  { value: "attached-bath", label: "En-Suite", icon: "🚿" },
  { value: "hot-water", label: "Hot Water", icon: "🌡️" },
  { value: "study-desk", label: "Study Desk", icon: "📚" },
  { value: "wardrobe", label: "Wardrobe", icon: "👔" },
  { value: "laundry", label: "Laundry", icon: "👕" },
  { value: "balcony", label: "Balcony", icon: "🌿" },
  { value: "meal-included", label: "Meals", icon: "🍽️" },
  { value: "security", label: "Security", icon: "🔐" },
  { value: "cctv", label: "CCTV", icon: "📷" },
  { value: "generator", label: "Generator", icon: "⚡" },
];

import { GHANA_REGIONS, REGION_NAMES, getDistrictsForRegion } from "@/lib/ghana-locations";

// ─── Types ────────────────────────────────────────────────────────────────────

type ListingKind = "home" | "hostel" | null;

interface HomeInfo {
  propertyType: PropertyType;
  title: string;
  description: string;
  price: string;
  region: string;
  city: string;
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  forSale: boolean;
  amenities: string[];
  ownerPhone: string;
  lat: string;
  lng: string;
  condition: PropertyCondition;
  furnishing: FurnishingLevel;
  serviceCharge: string;
  isNegotiable: boolean;
  landSize: string;
}

interface RoomDraft {
  id: string;
  name: string;
  roomType: RoomType;
  price: string;
  capacity: string;
  description: string;
  amenities: RoomAmenity[];
  available: boolean;
}

interface HostelInfo {
  title: string;
  description: string;
  region: string;
  city: string;
  address: string;
  nearbyUniversities: string;
  managerPhone: string;
  lat: string;
  lng: string;
  rooms: RoomDraft[];
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const HOME_STEPS = ["Type", "Details", "Amenities", "Photos", "Preview"] as const;
const HOSTEL_STEPS = ["Type", "Details", "Rooms", "Photos", "Preview"] as const;

function makeRoomDraft(): RoomDraft {
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    roomType: "single",
    price: "",
    capacity: "1",
    description: "",
    amenities: [],
    available: true,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PostPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [kind, setKind] = useState<ListingKind>(null);

  const [homeInfo, setHomeInfo] = useState<HomeInfo>({
    propertyType: "apartment",
    title: "",
    description: "",
    price: "",
    region: "",
    city: "",
    address: "",
    beds: "",
    baths: "",
    sqft: "",
    forSale: false,
    amenities: [],
    ownerPhone: "",
    lat: "",
    lng: "",
    condition: "used",
    furnishing: "unfurnished",
    serviceCharge: "",
    isNegotiable: false,
    landSize: "",
  });

  const [hostelInfo, setHostelInfo] = useState<HostelInfo>({
    title: "",
    description: "",
    region: "",
    city: "",
    address: "",
    nearbyUniversities: "",
    managerPhone: "",
    lat: "",
    lng: "",
    rooms: [makeRoomDraft()],
  });

  const [editingRoom, setEditingRoom] = useState<string | null>(null);

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [compressing, setCompressing] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastInsertedId, setLastInsertedId] = useState<string | null>(null);
  const [lastInsertedKind, setLastInsertedKind] = useState<"homes" | "hostels" | null>(null);
  const [showSponsor, setShowSponsor] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill phone from profile
  useEffect(() => {
    if (profile?.phone) {
      setHomeInfo((s) => ({ ...s, ownerPhone: s.ownerPhone || profile!.phone! }));
      setHostelInfo((s) => ({ ...s, managerPhone: s.managerPhone || profile!.phone! }));
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (!user) {
        router.push("/login");
      }
    }
  }, [authLoading, user, profile, router]);

  const steps = kind === "hostel" ? HOSTEL_STEPS : HOME_STEPS;
  const currentStep = steps[stepIndex];

  // ─── Validation ────────────────────────────────────────────────────────────

  const canGoNext = useCallback((): boolean => {
    if (currentStep === "Type") return kind !== null;
    if (currentStep === "Details") {
      if (kind === "home") return homeInfo.title.trim() !== "" && homeInfo.price.trim() !== "" && homeInfo.city.trim() !== "" && homeInfo.lat.trim() !== "" && homeInfo.lng.trim() !== "";
      return hostelInfo.title.trim() !== "" && hostelInfo.city.trim() !== "" && hostelInfo.lat.trim() !== "" && hostelInfo.lng.trim() !== "";
    }
    if (currentStep === "Amenities") return true;
    if (currentStep === "Rooms") return hostelInfo.rooms.length > 0 && hostelInfo.rooms.every((r) => r.name.trim() !== "" && r.price.trim() !== "");
    if (currentStep === "Photos") {
      return photos.length >= MIN_PHOTOS;
    }
    return true;
  }, [currentStep, kind, homeInfo, hostelInfo, photos]);

  // ─── Image Compression ─────────────────────────────────────────────────────

  function compressImage(file: File, maxDim = 1600, quality = 0.75): Promise<File> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file); // keep original if compression didn't help
            }
          },
          "image/jpeg",
          quality,
        );
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // ─── Photos ────────────────────────────────────────────────────────────────

  async function handlePhotoAdd(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (added.length === 0) return;

    setCompressing(true);
    const compressed = await Promise.all(added.map((f) => compressImage(f)));
    setCompressing(false);

    const newPreviews = compressed.map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...compressed].slice(0, 10));
    setPhotoPreviews((prev) => [...prev, ...newPreviews].slice(0, 10));
  }

  // ─── Video ─────────────────────────────────────────────────────────────────

  function handleVideoAdd(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) return;
    if (file.size > 100 * 1024 * 1024) {
      alert("Video must be under 100 MB");
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  }

  function removeVideo() {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview("");
  }

  function removePhoto(i: number) {
    setPhotoPreviews((prev) => {
      if (prev[i]) URL.revokeObjectURL(prev[i]);
      return prev.filter((_, idx) => idx !== i);
    });
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function movePhoto(from: number, to: number) {
    setPhotos((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    setPhotoPreviews((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!user || !kind) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const imageUrls: string[] = [];
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error("Not authenticated. Please sign in again.");

      for (let idx = 0; idx < photos.length; idx++) {
        const photo = photos[idx];
        const formData = new FormData();
        formData.append("file", photo);

        let uploadRes: Response;
        try {
          uploadRes = await fetch("/api/upload-image", {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
            body: formData,
          });
        } catch (networkErr: any) {
          throw new Error(`Network error uploading image ${idx + 1}: ${networkErr.message}. Check your internet connection.`);
        }

        if (!uploadRes.ok) {
          let errorMsg = `Status ${uploadRes.status}`;
          try { const d = await uploadRes.json(); errorMsg = d.error || errorMsg; } catch {}
          throw new Error(`Failed to upload image ${idx + 1}: ${errorMsg}`);
        }

        const { url } = await uploadRes.json();
        imageUrls.push(url);
      }

      // Upload video if provided
      let videoUrl: string | null = null;
      if (video) {
        const vForm = new FormData();
        vForm.append("file", video);
        const vRes = await fetch("/api/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: vForm,
        });
        if (!vRes.ok) {
          let msg = `Status ${vRes.status}`;
          try { const d = await vRes.json(); msg = d.error || msg; } catch {}
          throw new Error(`Failed to upload video: ${msg}`);
        }
        const { url: vUrl } = await vRes.json();
        videoUrl = vUrl;
      }

      if (kind === "home") {
        const priceNum = parseFloat(homeInfo.price.replace(/[^\d.]/g, "")) || 0;
        const homeId = `home-${Date.now()}`;
        const { error } = await supabase.from("homes").insert({
          id: homeId,
          property_type: homeInfo.propertyType,
          title: homeInfo.title,
          description: homeInfo.description,
          price: priceNum,
          price_label: `GH₵${priceNum.toLocaleString()}${homeInfo.forSale ? "" : "/mo"}`,
          for_sale: homeInfo.forSale,
          beds: parseInt(homeInfo.beds) || 1,
          baths: parseInt(homeInfo.baths) || 1,
          sqft: parseInt(homeInfo.sqft) || 0,
          address: homeInfo.address,
          city: homeInfo.city,
          state: "",
          images: imageUrls,
          amenities: homeInfo.amenities,
          owner_phone: homeInfo.ownerPhone || profile?.phone || null,
          owner_id: user.id,
          lat: parseFloat(homeInfo.lat) || 0,
          lng: parseFloat(homeInfo.lng) || 0,
          condition: homeInfo.condition,
          furnishing: homeInfo.furnishing,
          service_charge: parseFloat(homeInfo.serviceCharge) || null,
          is_negotiable: homeInfo.isNegotiable,
          land_size: homeInfo.propertyType === "house" ? (parseFloat(homeInfo.landSize) || null) : null,
          video_url: videoUrl,
          status: profile?.role === "admin" ? "approved" : "pending_admin",
        });
        if (error) throw error;
        setLastInsertedId(homeId);
        setLastInsertedKind("homes");
        // Promote seeker → owner so they appear in Active Agents
        if (profile?.role === "seeker") {
          await supabase.from("profiles").update({ role: "owner" }).eq("id", user.id);
        }
      } else {
        const hostelId = `hostel-${Date.now()}`;
        const priceNums = hostelInfo.rooms.map((r) => parseFloat(r.price.replace(/[^\d.]/g, "")) || 0);
        const minPrice = Math.min(...priceNums);
        const maxPrice = Math.max(...priceNums);
        const unis = hostelInfo.nearbyUniversities
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean);

        const { error: hostelError } = await supabase.from("hostels").insert({
          id: hostelId,
          name: hostelInfo.title,
          description: hostelInfo.description,
          address: hostelInfo.address,
          city: hostelInfo.city,
          state: "",
          nearby_universities: unis,
          images: imageUrls,
          total_rooms: hostelInfo.rooms.length,
          available_rooms: hostelInfo.rooms.filter((r) => r.available).length,
          price_range_min: minPrice,
          price_range_max: maxPrice,
          price_range_label:
            minPrice === maxPrice
              ? `GH₵${minPrice.toLocaleString()}/yr`
              : `GH₵${minPrice.toLocaleString()} – GH₵${maxPrice.toLocaleString()}/yr`,
          amenities: Array.from(new Set(hostelInfo.rooms.flatMap((r) => r.amenities))),
          manager_phone: hostelInfo.managerPhone || profile?.phone || null,
          manager_id: user.id,
          lat: parseFloat(hostelInfo.lat) || 0,
          lng: parseFloat(hostelInfo.lng) || 0,
          video_url: videoUrl,
          status: profile?.role === "admin" ? "approved" : "pending_admin",
        });
        if (hostelError) throw hostelError;
        setLastInsertedId(hostelId);
        setLastInsertedKind("hostels");
        // Promote seeker → manager so they appear in Active Agents
        if (profile?.role === "seeker") {
          await supabase.from("profiles").update({ role: "manager" }).eq("id", user.id);
        }

        for (const room of hostelInfo.rooms) {
          const priceNum = parseFloat(room.price.replace(/[^\d.]/g, "")) || 0;
          const cap = parseInt(room.capacity) || 1;
          const { error: roomError } = await supabase.from("rooms").insert({
            id: room.id,
            hostel_id: hostelId,
            name: room.name,
            room_type: room.roomType,
            price: priceNum,
            price_label: `GH₵${priceNum.toLocaleString()}/yr`,
            capacity: cap,
            available: room.available,
            amenities: room.amenities,
            images: imageUrls.slice(0, 2),
            description: room.description || room.name,
          });
          if (roomError) throw roomError;
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Submission error:", err);
      const msg = err?.message || err?.error_description || "Submission failed. Please try again.";
      const details = err?.details || err?.hint || "";
      const fullError = `${msg}${details ? ` — ${details}` : ""}`;
      console.error("Full error details:", { message: msg, details, statusCode: err?.status, fullError });
      setSubmitError(fullError);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setStepIndex(0);
    setKind(null);
    setPhotos([]);
    setHomeInfo({ propertyType: "apartment", title: "", description: "", price: "", region: "", city: "", address: "", beds: "", baths: "", sqft: "", forSale: false, amenities: [], ownerPhone: profile?.phone ?? "", lat: "", lng: "", condition: "used", furnishing: "unfurnished", serviceCharge: "", isNegotiable: false, landSize: "" });
    setHostelInfo({ title: "", description: "", region: "", city: "", address: "", nearbyUniversities: "", managerPhone: profile?.phone ?? "", rooms: [makeRoomDraft()], lat: "", lng: "" });
  }

  if (authLoading || !user) return null;

  // ─── Success screen ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <motion.div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
        style={{ background: "var(--background)" }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Confetti burst */}
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * 360;
          const rad = (angle * Math.PI) / 180;
          const dist = 120 + Math.random() * 200;
          const x = Math.cos(rad) * dist;
          const y = Math.sin(rad) * dist - 100;
          const colors = ["#06C167", "#D4AF37", "#FF6B6B", "#4ECDC4", "#FFE66D", "#FF8A5C"];
          const color = colors[i % colors.length];
          const size = 6 + Math.random() * 6;
          const isCircle = i % 3 === 0;
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: "50%",
                top: "40%",
                width: size,
                height: isCircle ? size : size * 1.6,
                borderRadius: isCircle ? "50%" : "2px",
                background: color,
              }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
              animate={{
                x,
                y,
                opacity: [1, 1, 0],
                rotate: Math.random() * 720 - 360,
                scale: [0, 1.2, 0.8],
              }}
              transition={{
                duration: 1.2 + Math.random() * 0.6,
                ease: [0.2, 0.8, 0.4, 1],
                delay: Math.random() * 0.15,
              }}
            />
          );
        })}

        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--uber-text)" }}>Listing Published!</h1>
        <p className="text-sm mt-2 max-w-xs" style={{ color: "var(--uber-muted)" }}>
          Your listing has been submitted and is pending verification. The admin will verify and publish it shortly.
        </p>
        <div className="flex flex-col items-center gap-3 mt-8">
          {/* Boost CTA */}
          {lastInsertedId && lastInsertedKind && (
            <button
              onClick={() => setShowSponsor(true)}
              className="font-bold px-8 py-3.5 rounded-2xl active:scale-95 transition-transform text-sm flex items-center gap-2"
              style={{ background: "#D4AF37", color: "#fff" }}
            >
              <span>✦</span> Boost Your Listing
            </button>
          )}
          <div className="flex gap-3">
            <button onClick={() => router.push("/profile")} className="bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform text-sm">
              Back to Profile
            </button>
            <button onClick={resetForm} className="font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform text-sm" style={{ border: "2px solid var(--uber-border)", color: "var(--uber-muted)" }}>
              Post Another
            </button>
          </div>
        </div>

        {lastInsertedId && lastInsertedKind && (
          <SponsorModal
            open={showSponsor}
            onClose={() => setShowSponsor(false)}
            onSuccess={() => { setShowSponsor(false); alert("Your listing is now sponsored!"); }}
            propertyId={lastInsertedId}
            propertyType={lastInsertedKind}
            propertyTitle={kind === "home" ? homeInfo.title : hostelInfo.title}
            userEmail={user?.email ?? ""}
            userId={user?.id ?? ""}
          />
        )}
      </motion.div>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-4 pb-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)", background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <h1 className="text-xl font-extrabold" style={{ color: "var(--uber-text)" }}>Post a Listing</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Submit property details for verification</p>
        <div className="flex items-center gap-1 mt-4">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= stepIndex ? "bg-emerald-500" : ""}`} style={i > stepIndex ? { background: "var(--uber-surface2)" } : undefined} />
            </div>
          ))}
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>
          Step {stepIndex + 1} of {steps.length} — <span className="font-semibold" style={{ color: "var(--uber-text)" }}>{currentStep}</span>
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep + kind}
          className="flex-1 px-4 py-6 pb-32"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
        >
          {/* ── Step: Type ── */}
          {currentStep === "Type" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>What are you listing?</h2>
              <div className="grid grid-cols-2 gap-3">
                {(["home", "hostel"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all ${kind === k ? "border-emerald-500 bg-emerald-50" : ""}`}
                    style={kind !== k ? { borderColor: "var(--uber-border)", background: "var(--uber-white)" } : undefined}
                  >
                    <span className="text-3xl">{k === "home" ? "🏠" : "🏫"}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>{k === "home" ? "Home / Apartment" : "Hostel / Rooms"}</p>
                      <p className="text-[11px]" style={{ color: "var(--uber-muted)" }}>{k === "home" ? "Rent or sell your property" : "Student accommodation"}</p>
                    </div>
                    {kind === k && (
                      <div className="self-end w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Details (Home) ── */}
          {currentStep === "Details" && kind === "home" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Property Details</h2>

              {/* Property type picker */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--uber-text)" }}>Property Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROPERTY_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => setHomeInfo((s) => ({ ...s, propertyType: pt.value }))}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-center transition-all ${homeInfo.propertyType === pt.value ? "border-emerald-500 bg-emerald-50" : ""}`}
                      style={homeInfo.propertyType !== pt.value ? { borderColor: "var(--uber-border)", background: "var(--uber-white)" } : undefined}
                    >
                      <span className="text-xl">{pt.icon}</span>
                      <span className="text-[10px] font-semibold leading-tight" style={{ color: "var(--uber-text)" }}>{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <FormField label="Title *" placeholder="e.g. Modern 3-Bedroom Flat in East Legon" value={homeInfo.title} onChange={(v) => setHomeInfo((s) => ({ ...s, title: v }))} />

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Price (GH₵) *" placeholder="e.g. 3500" value={homeInfo.price} onChange={(v) => setHomeInfo((s) => ({ ...s, price: v }))} inputMode="numeric" />
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Type</label>
                  <div className="flex rounded-xl overflow-hidden" style={{ border: "0.5px solid var(--uber-border)" }}>
                    {(["Rent", "Sale"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setHomeInfo((s) => ({ ...s, forSale: t === "Sale" }))}
                        className={`flex-1 py-2.5 text-xs font-bold transition-colors ${(t === "Sale") === homeInfo.forSale ? "bg-emerald-500 text-white" : ""}`}
                        style={(t === "Sale") !== homeInfo.forSale ? { background: "var(--uber-white)", color: "var(--uber-muted)" } : undefined}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Region → District picker */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Region *</label>
                <div className="flex flex-wrap gap-2 mb-2 max-h-28 overflow-y-auto">
                  {REGION_NAMES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setHomeInfo((s) => ({ ...s, region: r, city: "" }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${homeInfo.region === r ? "bg-emerald-500 text-white" : ""}`}
                      style={homeInfo.region !== r ? { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" } : { border: "0.5px solid transparent" }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {homeInfo.region && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>District / Town *</label>
                  <div className="flex flex-wrap gap-2 mb-2 max-h-36 overflow-y-auto">
                    {getDistrictsForRegion(homeInfo.region).map((d) => (
                      <button
                        key={d}
                        onClick={() => setHomeInfo((s) => ({ ...s, city: d }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${homeInfo.city === d ? "bg-emerald-500 text-white" : ""}`}
                        style={homeInfo.city !== d ? { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" } : { border: "0.5px solid transparent" }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  {homeInfo.city && !getDistrictsForRegion(homeInfo.region).includes(homeInfo.city) && (
                    <input type="text" placeholder="Other town…" value={homeInfo.city} onChange={(e) => setHomeInfo((s) => ({ ...s, city: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                  )}
                </div>
              )}

              <FormField label="Address / Estate" placeholder="e.g. 14 Orchid Rd, East Legon" value={homeInfo.address} onChange={(v) => setHomeInfo((s) => ({ ...s, address: v }))} />

              <LocationPicker
                lat={homeInfo.lat}
                lng={homeInfo.lng}
                onLocationSet={(lat, lng) => setHomeInfo((s) => ({ ...s, lat, lng }))}
                onAddressFetched={(addr, city, region) => setHomeInfo((s) => ({
                  ...s,
                  address: addr || s.address,
                  city: city || s.city,
                  region: region || s.region,
                }))}
              />

              <div className="grid grid-cols-3 gap-3">
                <FormField label="Beds" placeholder="3" value={homeInfo.beds} onChange={(v) => setHomeInfo((s) => ({ ...s, beds: v }))} inputMode="numeric" />
                <FormField label="Baths" placeholder="2" value={homeInfo.baths} onChange={(v) => setHomeInfo((s) => ({ ...s, baths: v }))} inputMode="numeric" />
                <FormField label="Sqft" placeholder="1400" value={homeInfo.sqft} onChange={(v) => setHomeInfo((s) => ({ ...s, sqft: v }))} inputMode="numeric" />
              </div>

              {/* Land Size — only for houses */}
              {homeInfo.propertyType === "house" && (
                <FormField label="Land Size (sq meters)" placeholder="e.g. 450" value={homeInfo.landSize} onChange={(v) => setHomeInfo((s) => ({ ...s, landSize: v }))} inputMode="numeric" />
              )}

              {/* Condition */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Condition</label>
                <div className="flex gap-2">
                  {CONDITION_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setHomeInfo((s) => ({ ...s, condition: c.value }))}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center"
                      style={homeInfo.condition === c.value
                        ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
                        : { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Furnishing */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Furnishing</label>
                <div className="flex gap-2">
                  {FURNISHING_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setHomeInfo((s) => ({ ...s, furnishing: f.value }))}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center"
                      style={homeInfo.furnishing === f.value
                        ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
                        : { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }
                      }
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Charge + Negotiable */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Service Charge (GH₵/mo)" placeholder="0" value={homeInfo.serviceCharge} onChange={(v) => setHomeInfo((s) => ({ ...s, serviceCharge: v }))} inputMode="numeric" />
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Negotiable?</label>
                  <button
                    onClick={() => setHomeInfo((s) => ({ ...s, isNegotiable: !s.isNegotiable }))}
                    className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    style={homeInfo.isNegotiable
                      ? { background: "var(--uber-green)", color: "#fff" }
                      : { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }
                    }
                  >
                    <div className={`w-8 h-4 rounded-full relative transition-all ${homeInfo.isNegotiable ? "bg-white/30" : ""}`} style={!homeInfo.isNegotiable ? { background: "var(--uber-surface2)" } : undefined}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${homeInfo.isNegotiable ? "right-0.5 bg-white" : "left-0.5"}`} style={!homeInfo.isNegotiable ? { background: "var(--uber-muted)" } : undefined} />
                    </div>
                    {homeInfo.isNegotiable ? "Yes" : "No"}
                  </button>
                </div>
              </div>

              <FormField label="Your Phone (shown to seekers after booking)" placeholder="+233 20 000 0000" value={homeInfo.ownerPhone} onChange={(v) => setHomeInfo((s) => ({ ...s, ownerPhone: v }))} inputMode="tel" />

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe your property — key features, nearby landmarks, what makes it special…"
                  value={homeInfo.description}
                  onChange={(e) => setHomeInfo((s) => ({ ...s, description: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                />
              </div>
            </div>
          )}

          {/* ── Step: Details (Hostel) ── */}
          {currentStep === "Details" && kind === "hostel" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Hostel Details</h2>
              <FormField label="Hostel Name *" placeholder="e.g. Greenfield Student Lodge" value={hostelInfo.title} onChange={(v) => setHostelInfo((s) => ({ ...s, title: v }))} />

              {/* Region → District picker */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Region *</label>
                <div className="flex flex-wrap gap-2 mb-2 max-h-28 overflow-y-auto">
                  {REGION_NAMES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setHostelInfo((s) => ({ ...s, region: r, city: "" }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${hostelInfo.region === r ? "bg-blue-600 text-white" : ""}`}
                      style={hostelInfo.region !== r ? { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" } : { border: "0.5px solid transparent" }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {hostelInfo.region && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>District / Town *</label>
                  <div className="flex flex-wrap gap-2 mb-2 max-h-36 overflow-y-auto">
                    {getDistrictsForRegion(hostelInfo.region).map((d) => (
                      <button
                        key={d}
                        onClick={() => setHostelInfo((s) => ({ ...s, city: d }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${hostelInfo.city === d ? "bg-blue-600 text-white" : ""}`}
                        style={hostelInfo.city !== d ? { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" } : { border: "0.5px solid transparent" }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <FormField label="Address" placeholder="e.g. 12 University Road, Legon" value={hostelInfo.address} onChange={(v) => setHostelInfo((s) => ({ ...s, address: v }))} />

              <LocationPicker
                lat={hostelInfo.lat}
                lng={hostelInfo.lng}
                onLocationSet={(lat, lng) => setHostelInfo((s) => ({ ...s, lat, lng }))}
                onAddressFetched={(addr, city, region) => setHostelInfo((s) => ({
                  ...s,
                  address: addr || s.address,
                  city: city || s.city,
                  region: region || s.region,
                }))}
              />

              <FormField label="Nearby Universities / Schools (comma-separated)" placeholder="e.g. University of Ghana, KNUST" value={hostelInfo.nearbyUniversities} onChange={(v) => setHostelInfo((s) => ({ ...s, nearbyUniversities: v }))} />
              <FormField label="Your Phone (shown to students after booking)" placeholder="+233 20 000 0000" value={hostelInfo.managerPhone} onChange={(v) => setHostelInfo((s) => ({ ...s, managerPhone: v }))} inputMode="tel" />

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe your hostel — facilities, security, atmosphere, distance to campus…"
                  value={hostelInfo.description}
                  onChange={(e) => setHostelInfo((s) => ({ ...s, description: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                />
              </div>
            </div>
          )}

          {/* ── Step: Amenities (Home) ── */}
          {currentStep === "Amenities" && kind === "home" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Amenities</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Select all that apply — helps seekers filter</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {HOME_AMENITIES.map((a) => {
                  const selected = homeInfo.amenities.includes(a.value);
                  return (
                    <button
                      key={a.value}
                      onClick={() => setHomeInfo((s) => ({
                        ...s,
                        amenities: selected ? s.amenities.filter((x) => x !== a.value) : [...s.amenities, a.value],
                      }))}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-left transition-all ${selected ? "border-emerald-500 bg-emerald-50" : ""}`}
                      style={!selected ? { borderColor: "var(--uber-border)", background: "var(--uber-white)" } : undefined}
                    >
                      <span className="text-lg">{a.icon}</span>
                      <span className={`text-xs font-semibold flex-1 ${selected ? "text-emerald-700" : ""}`} style={!selected ? { color: "var(--uber-text)" } : undefined}>{a.label}</span>
                      {selected && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {homeInfo.amenities.length === 0 && (
                <p className="text-xs text-center pt-1" style={{ color: "var(--uber-muted)" }}>No amenities selected — you can still continue</p>
              )}
            </div>
          )}

          {/* ── Step: Rooms (Hostel) ── */}
          {currentStep === "Rooms" && kind === "hostel" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Room Types</h2>
                  <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Add each type of room you offer</p>
                </div>
                <button
                  onClick={() => {
                    const draft = makeRoomDraft();
                    setHostelInfo((s) => ({ ...s, rooms: [...s.rooms, draft] }));
                    setEditingRoom(draft.id);
                  }}
                  className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                >
                  <span className="text-base leading-none">+</span> Add Room
                </button>
              </div>

              <div className="space-y-3">
                {hostelInfo.rooms.map((room, idx) => (
                  <RoomEditor
                    key={room.id}
                    room={room}
                    index={idx}
                    isOpen={editingRoom === room.id}
                    onToggle={() => setEditingRoom(editingRoom === room.id ? null : room.id)}
                    onChange={(updated) => setHostelInfo((s) => ({ ...s, rooms: s.rooms.map((r) => r.id === updated.id ? updated : r) }))}
                    onRemove={() => setHostelInfo((s) => ({ ...s, rooms: s.rooms.filter((r) => r.id !== room.id) }))}
                  />
                ))}
              </div>

              {hostelInfo.rooms.length === 0 && (
                <div className="text-center py-8" style={{ color: "var(--uber-muted)" }}>
                  <p className="text-2xl mb-2">🛏️</p>
                  <p className="text-sm font-medium">No rooms yet</p>
                  <p className="text-xs mt-1">Tap &quot;Add Room&quot; to get started</p>
                </div>
              )}

              {hostelInfo.rooms.length > 0 && !hostelInfo.rooms.every((r) => r.name.trim() && r.price.trim()) && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-amber-700 font-medium">Fill in name and price for all rooms to continue</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Photos ── */}
          {currentStep === "Photos" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Photos</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Minimum {MIN_PHOTOS} photos required for your listing.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: "var(--uber-surface2)" }}>
                    <img src={photoPreviews[i] || ""} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Cover</div>
                    )}
                    <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                      {i > 0 && (
                        <button onClick={() => movePhoto(i, i - 1)} className="w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center">←</button>
                      )}
                      {i < photos.length - 1 && (
                        <button onClick={() => movePhoto(i, i + 1)} className="w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center">→</button>
                      )}
                    </div>
                  </div>
                ))}
                {photos.length < 10 && (
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
                    style={{ borderColor: "var(--uber-border)", color: "var(--uber-muted)" }}
                  >
                    <span className="text-xl">+</span>
                    <span className="text-[10px]">Add Photo</span>
                  </button>
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handlePhotoAdd(e.target.files); e.target.value = ""; }} />
              {compressing && (
                <p className="text-xs font-medium animate-pulse" style={{ color: "var(--uber-muted)" }}>Compressing images…</p>
              )}
              <div className={`rounded-xl px-3 py-2 border ${photos.length >= MIN_PHOTOS ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                <p className={`text-xs font-medium ${photos.length >= MIN_PHOTOS ? "text-emerald-700" : "text-amber-700"}`}>
                  {photos.length < MIN_PHOTOS
                    ? `Add ${MIN_PHOTOS - photos.length} more photo${MIN_PHOTOS - photos.length > 1 ? "s" : ""} to continue.`
                    : `${photos.length} photos ready`}
                </p>
              </div>

              {/* Video upload (optional) */}
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Video Tour <span className="text-xs font-normal" style={{ color: "var(--uber-muted)" }}>(optional, max 100 MB)</span></h3>
                {videoPreview ? (
                  <div className="relative rounded-xl overflow-hidden" style={{ border: "0.5px solid var(--uber-border)" }}>
                    <video src={videoPreview} controls className="w-full max-h-48 object-contain" style={{ background: "#000" }} />
                    <button onClick={removeVideo} className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full py-4 rounded-xl border-2 border-dashed flex flex-col items-center gap-1 hover:border-emerald-400 transition-colors"
                    style={{ borderColor: "var(--uber-border)", color: "var(--uber-muted)" }}
                  >
                    <span className="text-xl">🎬</span>
                    <span className="text-xs">Add Video Tour</span>
                  </button>
                )}
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { handleVideoAdd(e.target.files); e.target.value = ""; }} />
              </div>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {currentStep === "Preview" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold" style={{ color: "var(--uber-text)" }}>Review &amp; Publish</h2>
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                {photoPreviews[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreviews[0]} alt="" className="w-full h-44 object-cover rounded-xl" />
                )}
                {photoPreviews.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {photoPreviews.slice(1).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" className="w-14 h-14 object-cover rounded-lg shrink-0" />
                    ))}
                  </div>
                )}
                {videoPreview && (
                  <div className="rounded-xl overflow-hidden" style={{ border: "0.5px solid var(--uber-border)" }}>
                    <video src={videoPreview} controls className="w-full max-h-32 object-contain" style={{ background: "#000" }} />
                    <p className="text-[10px] text-center py-1" style={{ color: "var(--uber-muted)" }}>Video tour attached</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-2xl mt-0.5">{kind === "hostel" ? "🏫" : "🏠"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--uber-text)" }}>{kind === "home" ? homeInfo.title : hostelInfo.title}</p>
                    <p className="text-xs" style={{ color: "var(--uber-muted)" }}>
                      {kind === "home"
                        ? `${homeInfo.city} · ${PROPERTY_TYPES.find((p) => p.value === homeInfo.propertyType)?.label} · ${homeInfo.forSale ? "For Sale" : "For Rent"}`
                        : `${hostelInfo.city} · ${hostelInfo.rooms.length} room type${hostelInfo.rooms.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>

                {kind === "home" ? (
                  <>
                    <p className="text-base font-extrabold text-emerald-600">
                      GH₵{parseFloat(homeInfo.price.replace(/[^\d.]/g, "") || "0").toLocaleString()}{homeInfo.forSale ? "" : "/mo"}
                    </p>
                    <div className="flex gap-4 text-xs" style={{ color: "var(--uber-muted)" }}>
                      <span>🛏 {homeInfo.beds || "?"} beds</span>
                      <span>🚿 {homeInfo.baths || "?"} baths</span>
                      {homeInfo.sqft && <span>📐 {homeInfo.sqft} sqft</span>}
                    </div>
                    {homeInfo.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {homeInfo.amenities.map((a) => {
                          const am = HOME_AMENITIES.find((x) => x.value === a);
                          return <span key={a} className="text-[11px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full">{am?.icon} {am?.label ?? a}</span>;
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1.5 pt-2" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                    {hostelInfo.rooms.map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium" style={{ color: "var(--uber-text)" }}>{r.name || r.roomType}</span>
                        <span className="font-bold text-blue-600">GH₵{parseFloat(r.price || "0").toLocaleString()}/yr</span>
                      </div>
                    ))}
                  </div>
                )}

                {(kind === "home" ? homeInfo.description : hostelInfo.description) && (
                  <p className="text-xs line-clamp-2 pt-2" style={{ color: "var(--uber-muted)", borderTop: "0.5px solid var(--uber-border)" }}>
                    {kind === "home" ? homeInfo.description : hostelInfo.description}
                  </p>
                )}
                <p className="text-xs pt-2" style={{ color: "var(--uber-muted)", borderTop: "0.5px solid var(--uber-border)" }}>📷 {photos.length} photos</p>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600 font-medium">{submitError}</p>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 font-medium">
                  Your listing goes live immediately. Make sure all details and photos are accurate.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="sticky bottom-0 px-4 py-4 flex gap-3" style={{ background: "var(--uber-white)", borderTop: "0.5px solid var(--uber-border)" }}>
        {stepIndex > 0 && (
          <button
            onClick={() => setStepIndex((i) => i - 1)}
            className="flex-1 font-bold py-3 rounded-2xl active:scale-95 transition-transform text-sm"
            style={{ border: "2px solid var(--uber-border)", color: "var(--uber-muted)" }}
          >
            Back
          </button>
        )}
        <button
          disabled={!canGoNext() || submitting}
          onClick={() => {
            if (currentStep === "Preview") {
              handleSubmit();
            } else {
              setStepIndex((i) => i + 1);
            }
          }}
          className={`flex-1 font-bold py-3 rounded-2xl active:scale-95 transition-all text-sm ${
            canGoNext() && !submitting
              ? kind === "hostel" ? "bg-blue-600 text-white" : "bg-emerald-500 text-white"
              : "cursor-not-allowed"
          }`}
          style={!(canGoNext() && !submitting) ? { background: "var(--uber-surface2)", color: "var(--uber-muted)" } : undefined}
        >
          {submitting ? "Publishing…" : currentStep === "Preview" ? "Publish Listing" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Room Editor Component ─────────────────────────────────────────────────────

function RoomEditor({
  room,
  index,
  isOpen,
  onToggle,
  onChange,
  onRemove,
}: {
  room: RoomDraft;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (r: RoomDraft) => void;
  onRemove: () => void;
}) {
  const priceNum = parseFloat(room.price.replace(/[^\d.]/g, "") || "0");
  const isValid = room.name.trim() !== "" && room.price.trim() !== "";

  return (
    <div className={`rounded-2xl border-2 transition-colors ${isValid ? "border-blue-100" : "border-amber-200"}`} style={{ background: "var(--uber-white)" }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isValid ? "bg-blue-600 text-white" : "bg-amber-100 text-amber-700"}`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--uber-text)" }}>{room.name || "Unnamed Room"}</p>
          <p className="text-[11px]" style={{ color: "var(--uber-muted)" }}>
            {ROOM_TYPES.find((r) => r.value === room.roomType)?.label ?? room.roomType}
            {priceNum > 0 && ` · GH₵${priceNum.toLocaleString()}/yr`}
            {room.amenities.length > 0 && ` · ${room.amenities.length} amenities`}
            {!room.available && " · Unavailable"}
          </p>
        </div>
        <svg className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} style={{ color: "var(--uber-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 pt-3" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
              <FormField label="Room Name *" placeholder="e.g. Block A — Single Room" value={room.name} onChange={(v) => onChange({ ...room, name: v })} />

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Room Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ROOM_TYPES.map((rt) => (
                    <button
                      key={rt.value}
                      onClick={() => onChange({ ...room, roomType: rt.value })}
                      className={`py-2 rounded-xl text-center transition-all ${room.roomType === rt.value ? "border-blue-600 bg-blue-50" : ""}`}
                      style={room.roomType !== rt.value ? { background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" } : { border: "0.5px solid rgb(37, 99, 235)" }}
                    >
                      <p className={`text-[11px] font-bold ${room.roomType === rt.value ? "text-blue-700" : ""}`} style={room.roomType !== rt.value ? { color: "var(--uber-text)" } : undefined}>{rt.label}</p>
                      <p className="text-[9px]" style={{ color: "var(--uber-muted)" }}>{rt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Price (GH₵/yr) *" placeholder="e.g. 3500" value={room.price} onChange={(v) => onChange({ ...room, price: v })} inputMode="numeric" />
                <FormField label="Capacity" placeholder="1" value={room.capacity} onChange={(v) => onChange({ ...room, capacity: v })} inputMode="numeric" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Amenities</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {ROOM_AMENITIES.map((a) => {
                    const selected = room.amenities.includes(a.value);
                    return (
                      <button
                        key={a.value}
                        onClick={() => onChange({
                          ...room,
                          amenities: selected ? room.amenities.filter((x) => x !== a.value) : [...room.amenities, a.value],
                        })}
                        className={`flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${selected ? "border-blue-500 bg-blue-50" : ""}`}
                        style={!selected ? { background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" } : { border: "0.5px solid rgb(59, 130, 246)" }}
                      >
                        <span className="text-base">{a.icon}</span>
                        <span className={`text-[9px] font-semibold leading-tight text-center ${selected ? "text-blue-700" : ""}`} style={!selected ? { color: "var(--uber-muted)" } : undefined}>{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "var(--uber-surface)" }}>
                <span className="text-xs font-semibold flex-1" style={{ color: "var(--uber-text)" }}>Available now?</span>
                <button
                  onClick={() => onChange({ ...room, available: !room.available })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${room.available ? "bg-blue-600" : ""}`}
                  style={!room.available ? { background: "var(--uber-surface2)" } : undefined}
                >
                  <div className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all" style={{ background: "var(--uber-white)", left: room.available ? "1.25rem" : "0.125rem" }} />
                </button>
              </div>

              <FormField label="Notes (optional)" placeholder="Any extra info about this room…" value={room.description} onChange={(v) => onChange({ ...room, description: v })} />

              <button
                onClick={onRemove}
                className="w-full text-xs font-semibold text-red-500 border border-red-100 rounded-xl py-2 active:scale-95 transition-transform"
              >
                Remove this room
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────

function FormField({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>{label}</label>
      <input
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
      />
    </div>
  );
}

// ─── Location Picker ──────────────────────────────────────────────────────────

function LocationPicker({
  lat,
  lng,
  onLocationSet,
  onAddressFetched,
}: {
  lat: string;
  lng: string;
  onLocationSet: (lat: string, lng: string) => void;
  onAddressFetched?: (address: string, city: string, region: string) => void;
}) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Reverse geocode coordinates to get address details
  async function reverseGeocode(latitude: number, longitude: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=en`,
        { headers: { "User-Agent": "StayMate/1.0" } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const addr = data.address || {};
      // Build readable address
      const parts = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean);
      const address = parts.join(", ") || data.display_name?.split(",").slice(0, 3).join(",") || "";
      const city = addr.city || addr.town || addr.village || addr.county || "";
      const region = addr.state || addr.region || "";

      // Try to match region to Ghana regions
      const { GHANA_REGIONS } = await import("@/lib/ghana-locations");
      const matchedRegion = GHANA_REGIONS.find(
        r => region.toLowerCase().includes(r.name.toLowerCase()) ||
             r.name.toLowerCase().includes(region.toLowerCase())
      );
      const matchedDistrict = matchedRegion?.districts.find(
        d => city.toLowerCase().includes(d.toLowerCase()) ||
             d.toLowerCase().includes(city.toLowerCase()) ||
             address.toLowerCase().includes(d.toLowerCase())
      );

      onAddressFetched?.(
        address,
        matchedDistrict || city,
        matchedRegion?.name || ""
      );
    } catch {
      // Silently fail — address auto-fill is a bonus, not required
    }
  }

  async function fetchLocation() {
    setIsLocating(true);
    setError(null);

    try {
      const isNative = typeof (window as any).Capacitor !== "undefined" &&
        (window as any).Capacitor.isNativePlatform?.();

      if (isNative) {
        const { Geolocation } = await import("@capacitor/geolocation");
        const status = await Geolocation.requestPermissions();
        if (status.location === "denied") {
          throw new Error("Location permission denied. Enter coordinates manually.");
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
        const latVal = pos.coords.latitude;
        const lngVal = pos.coords.longitude;
        onLocationSet(latVal.toFixed(4), lngVal.toFixed(4));
        reverseGeocode(latVal, lngVal);
        setIsLocating(false);
        return;
      }

      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported on this device");
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          onLocationSet(latitude.toFixed(4), longitude.toFixed(4));
          reverseGeocode(latitude, longitude);
          setIsLocating(false);
        },
        (err) => {
          setIsLocating(false);
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError("Location permission denied. Enter coordinates manually.");
              break;
            case err.POSITION_UNAVAILABLE:
              setError("Location not available. Enter coordinates manually.");
              break;
            case err.TIMEOUT:
              setError("Location request timed out. Enter coordinates manually.");
              break;
            default:
              setError("Failed to fetch location. Enter coordinates manually.");
          }
          setShowManual(true);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } catch (e: any) {
      setIsLocating(false);
      setError(e.message || "Failed to fetch location. Enter coordinates manually.");
      setShowManual(true);
    }
  }

  const hasCoordinates = lat.trim() !== "" && lng.trim() !== "";

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold" style={{ color: "var(--uber-text)" }}>Location *</label>

      {hasCoordinates && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
          <span>✓</span>
          <span>Coordinates set: {lat}°, {lng}°</span>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={fetchLocation}
        disabled={isLocating}
        className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-60"
      >
        {isLocating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Fetching location...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.823 11.821l-7.07-7.071a2.25 2.25 0 00-3.186 0l-7.07 7.07A2.25 2.25 0 009 19.5v.008a2.25 2.25 0 002.25 2.25h.008a2.25 2.25 0 002.25-2.25v-.008a2.25 2.25 0 012.25-2.25h.008a2.25 2.25 0 012.25 2.25v.008a2.25 2.25 0 002.25 2.25h.008a2.25 2.25 0 002.25-2.25V9.75c0-.98-.382-1.92-1.061-2.614z" />
            </svg>
            Use My Location
          </>
        )}
      </button>

      {showManual && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Latitude</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 5.6037"
                value={lat}
                onChange={(e) => onLocationSet(e.target.value, lng)}
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--uber-text)" }}>Longitude</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. -0.1870"
                value={lng}
                onChange={(e) => onLocationSet(lat, e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowManual(false)}
            className="w-full text-xs font-semibold py-2" style={{ color: "var(--uber-muted)" }}
          >
            Done editing coordinates
          </button>
        </div>
      )}

      {!showManual && !hasCoordinates && (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="w-full text-xs font-semibold py-2 underline" style={{ color: "var(--uber-muted)" }}
        >
          Enter coordinates manually
        </button>
      )}
    </div>
  );
}
