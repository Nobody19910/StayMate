"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { PropertyType, PropertyCondition, FurnishingLevel, RoomAmenity, RoomType } from "@/lib/types";
import SponsorModal from "@/components/ui/SponsorModal";
import { IconBuilding, IconHome, IconCouch, IconNeighborhood, IconCity, IconSnowflake, IconBolt, IconDroplet, IconFaucet, IconLock, IconFrying, IconTie, IconSparkles, IconPool, IconWifi, IconCar, IconPlant, IconBroom, IconShower, IconThermometer, IconBook, IconShirt, IconUtensils, IconCamera, IconSchool, IconBed, IconFilm, IconShield, IconRuler, IconStar, IconClose, IconCheck, IconWarning } from "@/components/ui/Icons";
import { FREE_LISTING_LIMIT, PER_LISTING_FEE_PESEWAS, PER_LISTING_FEE, AGENT_SUBSCRIPTION_PESEWAS, AGENT_SUBSCRIPTION_PRICE } from "@/lib/sponsor-tiers";
import { usePaystackScript, openPaystackPopup } from "@/lib/paystack";
import { activateAgentSubscription } from "@/lib/api";
import PhoneInput from "@/components/ui/PhoneInput";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PHOTOS = 5;

const PROPERTY_TYPES: { value: PropertyType; label: string; icon: React.ReactNode }[] = [
  { value: "apartment", label: "Apartment / Flat", icon: <IconBuilding /> },
  { value: "house", label: "House", icon: <IconHome /> },
  { value: "studio", label: "Studio", icon: <IconCouch /> },
  { value: "duplex", label: "Duplex", icon: <IconNeighborhood /> },
  { value: "townhouse", label: "Townhouse", icon: <IconCity /> },
];

const ROOM_TYPES: { value: RoomType; label: string; sub: string }[] = [
  { value: "single", label: "Single", sub: "1 person" },
  { value: "double", label: "Double", sub: "2 people" },
  { value: "triple", label: "Triple", sub: "3 people" },
  { value: "quad", label: "Quad", sub: "4 people" },
  { value: "dormitory", label: "Dorm", sub: "5+" },
];

const HOME_AMENITIES: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: "AC", label: "Air Con", icon: <IconSnowflake /> },
  { value: "Generator", label: "Standby Generator", icon: <IconBolt /> },
  { value: "Borehole", label: "Borehole", icon: <IconDroplet /> },
  { value: "Water Supply", label: "Water Supply", icon: <IconFaucet /> },
  { value: "Security", label: "24/7 Security", icon: <IconLock /> },
  { value: "Gated Estate", label: "Gated Estate", icon: <IconNeighborhood /> },
  { value: "Electric Fencing", label: "Electric Fencing", icon: <IconBolt /> },
  { value: "Fitted Kitchen", label: "Fitted Kitchen", icon: <IconFrying /> },
  { value: "Wardrobe", label: "Wardrobe", icon: <IconTie /> },
  { value: "POP Ceiling", label: "POP Ceiling", icon: <IconSparkles /> },
  { value: "Pool", label: "Swimming Pool", icon: <IconPool /> },
  { value: "Boys Quarters", label: "BQ", icon: <IconHome /> },
  { value: "WiFi", label: "Fiber Wi-Fi", icon: <IconWifi /> },
  { value: "Parking", label: "Parking", icon: <IconCar /> },
  { value: "Furnished", label: "Furnished", icon: <IconCouch /> },
  { value: "Garden", label: "Garden", icon: <IconPlant /> },
  { value: "Smart Home", label: "Smart Home", icon: <IconHome /> },
  { value: "Cleaning Service", label: "Cleaning Service", icon: <IconBroom /> },
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

const ROOM_AMENITIES: { value: RoomAmenity; label: string; icon: React.ReactNode }[] = [
  { value: "wifi", label: "WiFi", icon: <IconWifi /> },
  { value: "ac", label: "Air Con", icon: <IconSnowflake /> },
  { value: "attached-bath", label: "En-Suite", icon: <IconShower /> },
  { value: "hot-water", label: "Hot Water", icon: <IconThermometer /> },
  { value: "study-desk", label: "Study Desk", icon: <IconBook /> },
  { value: "wardrobe", label: "Wardrobe", icon: <IconTie /> },
  { value: "laundry", label: "Laundry", icon: <IconShirt /> },
  { value: "balcony", label: "Balcony", icon: <IconPlant /> },
  { value: "meal-included", label: "Meals", icon: <IconUtensils /> },
  { value: "security", label: "Security", icon: <IconLock /> },
  { value: "cctv", label: "CCTV", icon: <IconCamera /> },
  { value: "generator", label: "Generator", icon: <IconBolt /> },
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
  // Property rules
  moveIn: string;
  petsAllowed: "yes" | "no" | "ask";
  smokingAllowed: "yes" | "no";
  sublettingAllowed: "yes" | "no";
  // Nearby
  nearbyShops: string;
  nearbyRestaurants: string;
  nearbyTransport: string;
  nearbyHospital: string;
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

const HOME_STEPS = ["Category", "Property Type", "Name", "Description", "Location", "Bedrooms & Bathrooms", "Property Details", "Price", "Contact", "Facilities", "Rules & Nearby", "Photos", "Review"] as const;
const HOSTEL_STEPS = ["Category", "Name", "Description", "Location", "Rooms", "Photos", "Review"] as const;

type HomeStep = typeof HOME_STEPS[number];
type HostelStep = typeof HOSTEL_STEPS[number];

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
  // Admin can post on behalf of another user via ?for_user=<id>
  const forUserId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("for_user") : null;
  const isAdminProxy = !!forUserId && profile?.role === "admin";
  const effectiveUserId = isAdminProxy ? forUserId : (user?.id ?? null);

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
    moveIn: "Flexible — by arrangement",
    petsAllowed: "ask",
    smokingAllowed: "no",
    sublettingAllowed: "no",
    nearbyShops: "",
    nearbyRestaurants: "",
    nearbyTransport: "",
    nearbyHospital: "",
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
  const [listingCount, setListingCount] = useState(0);
  const [listingCountLoaded, setListingCountLoaded] = useState(false);
  const [listingFeePaid, setListingFeePaid] = useState(false);
  const [isActiveAgent, setIsActiveAgent] = useState(false);

  usePaystackScript();

  const photoInputRef = useRef<HTMLInputElement>(null);

  // Check listing count and agent status
  useEffect(() => {
    if (!user) return;
    // Admins posting on behalf of users skip the free limit gate
    if (isAdminProxy) { setListingCountLoaded(true); setIsActiveAgent(true); return; }
    async function checkListings() {
      const [{ count: homeCount }, { count: hostelCount }] = await Promise.all([
        supabase.from("homes").select("id", { count: "exact", head: true }).eq("owner_id", user!.id),
        supabase.from("hostels").select("id", { count: "exact", head: true }).eq("manager_id", user!.id),
      ]);
      setListingCount((homeCount ?? 0) + (hostelCount ?? 0));
      // Check agent subscription
      const { data: prof } = await supabase.from("profiles").select("is_agent, agent_subscription_until").eq("id", user!.id).single();
      if (prof?.is_agent && new Date(prof.agent_subscription_until ?? 0) > new Date()) {
        setIsActiveAgent(true);
      }
      setListingCountLoaded(true);
    }
    checkListings();
  }, [user, isAdminProxy]);

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
    if (currentStep === "Category") return kind !== null;
    if (currentStep === "Property Type") return true;
    if (currentStep === "Name") {
      if (kind === "home") return homeInfo.title.trim() !== "";
      return hostelInfo.title.trim() !== "";
    }
    if (currentStep === "Description") return true;
    // legacy "About" kept for hostel backward compat — not used now
    if (currentStep === "About") {
      if (kind === "home") return homeInfo.title.trim() !== "";
      return hostelInfo.title.trim() !== "";
    }
    if (currentStep === "Location") {
      if (kind === "home") return homeInfo.city.trim() !== "" && homeInfo.lat.trim() !== "" && homeInfo.lng.trim() !== "";
      return hostelInfo.city.trim() !== "" && hostelInfo.lat.trim() !== "" && hostelInfo.lng.trim() !== "";
    }
    if (currentStep === "Bedrooms & Bathrooms") return true;
    if (currentStep === "Property Details") return true;
    if (currentStep === "Specs") return true;
    if (currentStep === "Price") {
      if (kind === "home") return homeInfo.price.trim() !== "";
      return true;
    }
    if (currentStep === "Contact") return true;
    if (currentStep === "Pricing") {
      if (kind === "home") return homeInfo.price.trim() !== "";
      return true;
    }
    if (currentStep === "Facilities") return true;
    if (currentStep === "Rooms") return hostelInfo.rooms.length > 0 && hostelInfo.rooms.every((r) => r.name.trim() !== "" && r.price.trim() !== "");
    if (currentStep === "Photos") return photos.length >= MIN_PHOTOS;
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
          owner_id: effectiveUserId ?? user.id,
          lat: parseFloat(homeInfo.lat) || 0,
          lng: parseFloat(homeInfo.lng) || 0,
          condition: homeInfo.condition,
          furnishing: homeInfo.furnishing,
          service_charge: parseFloat(homeInfo.serviceCharge) || null,
          is_negotiable: homeInfo.isNegotiable,
          land_size: homeInfo.propertyType === "house" ? (parseFloat(homeInfo.landSize) || null) : null,
          video_url: videoUrl,
          rules: {
            move_in: homeInfo.moveIn,
            pets: homeInfo.petsAllowed,
            smoking: homeInfo.smokingAllowed,
            subletting: homeInfo.sublettingAllowed,
          },
          nearby: {
            shops: homeInfo.nearbyShops,
            restaurants: homeInfo.nearbyRestaurants,
            transport: homeInfo.nearbyTransport,
            hospital: homeInfo.nearbyHospital,
          },
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
          manager_id: effectiveUserId ?? user.id,
          lat: parseFloat(hostelInfo.lat) || 0,
          lng: parseFloat(hostelInfo.lng) || 0,
          video_url: videoUrl,
          status: profile?.role === "admin" ? "approved" : "pending_admin",
        });
        if (hostelError) throw hostelError;
        setLastInsertedId(hostelId);
        setLastInsertedKind("hostels");
        // Promote seeker → owner (property owner covers both homes and hostels)
        if (profile?.role === "seeker") {
          await supabase.from("profiles").update({ role: "owner" }).eq("id", user.id);
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
      const msg = err?.message || err?.error_description || "Submission failed. Please try again.";
      const details = err?.details || err?.hint || "";
      const fullError = `${msg}${details ? ` — ${details}` : ""}`;
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

  // Admin bypasses all limits
  const isAdmin = profile?.role === "admin";
  const needsListingFee = !isAdmin && !isActiveAgent && listingCount >= FREE_LISTING_LIMIT && !listingFeePaid;

  function handlePayListingFee() {
    if (!user) return;
    openPaystackPopup({
      email: user.email ?? "",
      amount: PER_LISTING_FEE_PESEWAS,
      currency: "GHS",
      ref: `listing-fee-${user.id}-${Date.now()}`,
      metadata: { type: "listing_fee", user_id: user.id },
      onSuccess: () => { setListingFeePaid(true); },
      onClose: () => {},
    });
  }

  function handlePayAgentSub() {
    if (!user) return;
    openPaystackPopup({
      email: user.email ?? "",
      amount: AGENT_SUBSCRIPTION_PESEWAS,
      currency: "GHS",
      ref: `agent-sub-${user.id}-${Date.now()}`,
      metadata: { type: "agent_subscription", user_id: user.id },
      onSuccess: async (reference: string) => {
        try {
          await activateAgentSubscription(user!.id, reference);
          if (profile?.fullName) {
            await supabase.from("profiles").update({ display_name: profile.fullName }).eq("id", user!.id);
          }
          setIsActiveAgent(true);
        } catch {
          alert("Payment received but activation failed. Contact support.");
        }
      },
      onClose: () => {},
    });
  }

  const STEP_TIPS: Record<string, string[]> = {
    "Category": [
      "Choose 'Home / Apartment' to list residential properties for rent or sale.",
      "Choose 'Hostel / Rooms' if you manage student accommodation with multiple room types.",
    ],
    "Property Type": [
      "Studios are self-contained single-unit spaces.",
      "Duplexes have two separate floors.",
      "Accurate type helps seekers filter effectively.",
    ],
    "Name": [
      "Great titles mention the type, beds, and area: 'Modern 3-Bed in East Legon'.",
      "Include the neighbourhood — it's the first thing seekers search for.",
      "Keep it under 60 characters so it reads cleanly on mobile.",
    ],
    "Description": [
      "Descriptions with nearby landmarks get 40% more inquiries.",
      "Mention what makes this property special — views, renovation, estate name.",
      "Write at least 3 sentences for best results.",
    ],
    "About": [
      "Great titles mention the type, beds, and area: 'Modern 3-Bed in East Legon'.",
      "Descriptions with landmarks get 40% more inquiries.",
    ],
    "Location": [
      "Use 'Detect Location' to auto-fill your address — it's faster and more accurate.",
      "The exact map pin helps seekers know how close you are to their workplace or campus.",
      "If your estate isn't listed, pick the nearest district and add the estate name manually.",
    ],
    "Bedrooms & Bathrooms": [
      "Accurate bedroom and bathroom counts are the most searched filters.",
      "A studio counts as 0 bedrooms — use the correct number.",
    ],
    "Property Details": [
      "Property size (sqft) helps buyers compare value per cedi.",
      "Condition and furnishing level set realistic expectations.",
      "'New build' means completed within the last 2 years.",
    ],
    "Specs": [
      "Accurate bedroom and bathroom counts are the most searched filters.",
      "Property size (sqft) helps buyers compare value.",
    ],
    "Price": [
      "Rental prices should be monthly (e.g. GH₵ 3,500/mo).",
      "Marking a price as negotiable attracts 25% more inquiries.",
      "Service charges should include estate management fees.",
    ],
    "Contact": [
      "Your phone number is only shared after a booking is confirmed.",
      "We recommend using a WhatsApp-enabled number for faster responses.",
    ],
    "Pricing": [
      "Rental prices should be monthly (e.g. GH₵ 3,500/mo).",
      "Marking a price as negotiable attracts 25% more inquiries.",
    ],
    "Facilities": [
      "Listings with 5+ facilities get 2× more views.",
      "Fiber Wi-Fi, Generator and Security are top 3 most-searched amenities in Ghana.",
      "Only select what is actually available — accuracy builds trust.",
    ],
    "Rules & Nearby": [
      "Properties with clear rules get fewer disputes and better reviews.",
      "Nearby landmarks help seekers understand the location before visiting.",
      "Leave nearby fields blank if you're unsure — they are optional.",
    ],
    "Rooms": [
      "Add each distinct room type you offer (e.g. Single, Double, En-suite).",
      "Prices are yearly since most students book per academic year.",
      "More room types listed = more students can find what they need.",
    ],
    "Photos": [
      "Listings with 8+ photos get 3× more inquiries.",
      "Natural daylight photos look best — shoot in the morning.",
      "Always include: entrance, living room, kitchen, bedroom, bathroom, and exterior.",
      "First photo is your cover — make it the best shot.",
    ],
    "Review": [
      "Double-check your price and location before submitting.",
      "Your listing goes to admin review first — usually approved within 24 hours.",
      "After approval, you can boost your listing to the top of search results.",
    ],
  };

  const STEP_QUESTIONS: Record<string, string> = {
    "Category": "What are you listing?",
    "Property Type": "What type of home is it?",
    "Name": "What's the name of your property?",
    "Description": "How would you describe it?",
    "About": "Tell us about your property",
    "Location": "Where is it located?",
    "Bedrooms & Bathrooms": "How many bedrooms and bathrooms?",
    "Property Details": "Size, condition and furnishing",
    "Specs": "Property specifications",
    "Price": "What's the asking price?",
    "Contact": "How should seekers reach you?",
    "Pricing": "Pricing & contact details",
    "Facilities": "What facilities are available?",
    "Rules & Nearby": "Property rules & neighbourhood",
    "Rooms": "Add your room types",
    "Photos": "Show it off with great photos",
    "Review": "Review & publish",
  };

  const STEP_SUBTITLES: Record<string, string> = {
    "Category": "Select the type of property you want to list on StayMate.",
    "Property Type": "This helps seekers find your property with the right filters.",
    "Name": "Give your listing a clear, memorable name.",
    "Description": "Tell seekers what makes this property special.",
    "About": "Give your listing a clear, memorable name and a detailed description.",
    "Location": "Accurate location is the most important factor for seekers.",
    "Bedrooms & Bathrooms": "These are the most-searched filters on StayMate.",
    "Property Details": "Size and condition help seekers compare properties.",
    "Specs": "Size, rooms and condition help seekers compare properties.",
    "Price": "Set a competitive price — you can always mark it as negotiable.",
    "Contact": "Your number is only shared after an inquiry is accepted.",
    "Pricing": "Set your asking price and preferred contact details.",
    "Facilities": "Select all the facilities and amenities your property offers.",
    "Rules & Nearby": "Set house rules and list what's close by — helps seekers decide faster.",
    "Rooms": "Add each type of room available in your hostel.",
    "Photos": "High-quality photos significantly increase inquiries.",
    "Review": "Check everything looks correct before submitting for review.",
  };

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
              <IconStar /> Boost Your Listing
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
      {/* ── Booking.com style header ── */}
      <div style={{ background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        {/* Top bar: logo + step count */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 12px)" }}>
          <div>
            <h1 className="text-lg font-extrabold font-serif" style={{ color: "var(--uber-text)" }}>StayMate</h1>
            <p className="text-xs" style={{ color: "var(--uber-muted)" }}>List your property</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold" style={{ color: "var(--uber-muted)" }}>Step {stepIndex + 1} of {steps.length}</p>
            <p className="text-xs font-semibold" style={{ color: "var(--uber-text)" }}>{currentStep}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex" style={{ height: "3px" }}>
          {steps.map((s, i) => (
            <div
              key={s}
              className="flex-1 transition-colors"
              style={{ background: i <= stepIndex ? "var(--uber-green)" : "var(--uber-surface2)" }}
            />
          ))}
        </div>
        {/* Step circles — desktop */}
        <div className="hidden lg:flex items-center px-6 py-3 gap-0">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={i < stepIndex
                  ? { background: "var(--uber-green)", color: "#fff" }
                  : i === stepIndex
                    ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
                    : { background: "var(--uber-surface2)", color: "var(--uber-muted)" }
                }
              >
                {i < stepIndex ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                ) : i + 1}
              </div>
              <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: i === stepIndex ? "var(--uber-text)" : "var(--uber-muted)" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep + kind}
          className="flex-1 pb-32 lg:pb-8"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
        >
          <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 px-4 py-6 lg:px-6 lg:py-8">

            {/* Main form content */}
            <div className="space-y-5">

              {/* Step heading */}
              <div>
                <h2 className="text-2xl font-extrabold font-serif" style={{ color: "var(--uber-text)" }}>
                  {STEP_QUESTIONS[currentStep as string] || currentStep}
                </h2>
                {STEP_SUBTITLES[currentStep as string] && (
                  <p className="text-sm mt-1" style={{ color: "var(--uber-muted)" }}>
                    {STEP_SUBTITLES[currentStep as string]}
                  </p>
                )}
              </div>

              {/* ── Category ── */}
              {currentStep === "Category" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(["home", "hostel"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setKind(k)}
                      className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all ${kind === k ? "border-emerald-500" : ""}`}
                      style={kind !== k ? { borderColor: "var(--uber-border)", background: "var(--uber-white)" } : { background: "rgba(6,193,103,0.04)" }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl" style={{ background: kind === k ? "rgba(6,193,103,0.12)" : "var(--uber-surface)" }}>
                        {k === "home" ? <IconHome /> : <IconSchool />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold" style={{ color: "var(--uber-text)" }}>{k === "home" ? "Home / Apartment" : "Hostel / Rooms"}</p>
                        <p className="text-sm mt-1" style={{ color: "var(--uber-muted)" }}>{k === "home" ? "List a property for rent or sale — apartments, houses, studios and more." : "Student accommodation with multiple room types and shared facilities."}</p>
                        {kind === k && (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            Selected
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Property Type (home only) ── */}
              {currentStep === "Property Type" && kind === "home" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PROPERTY_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => setHomeInfo((s) => ({ ...s, propertyType: pt.value }))}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${homeInfo.propertyType === pt.value ? "border-emerald-500" : ""}`}
                      style={homeInfo.propertyType !== pt.value ? { borderColor: "var(--uber-border)", background: "var(--uber-white)" } : { background: "rgba(6,193,103,0.04)" }}
                    >
                      <span className="text-2xl">{pt.icon}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>{pt.label}</p>
                        {homeInfo.propertyType === pt.value && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs font-bold text-emerald-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            Selected
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Name (Home) ── */}
              {currentStep === "Name" && kind === "home" && (
                <div>
                  <input
                    type="text"
                    placeholder="e.g. Modern 3-Bedroom Flat in East Legon"
                    value={homeInfo.title}
                    onChange={(e) => setHomeInfo((s) => ({ ...s, title: e.target.value }))}
                    className="w-full rounded-xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                    autoFocus
                  />
                  <p className="text-xs mt-2" style={{ color: "var(--uber-muted)" }}>Good titles include type, beds, and area — e.g. &quot;Modern 3-Bed in East Legon&quot;</p>
                </div>
              )}

              {/* ── Name (Hostel) ── */}
              {currentStep === "Name" && kind === "hostel" && (
                <div>
                  <input
                    type="text"
                    placeholder="e.g. Greenfield Student Lodge"
                    value={hostelInfo.title}
                    onChange={(e) => setHostelInfo((s) => ({ ...s, title: e.target.value }))}
                    className="w-full rounded-xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                    autoFocus
                  />
                  <p className="text-xs mt-2" style={{ color: "var(--uber-muted)" }}>Use a name that students will recognise, e.g. &quot;Greenfield Student Lodge&quot;</p>
                </div>
              )}

              {/* ── Description (Home) ── */}
              {currentStep === "Description" && kind === "home" && (
                <div>
                  <textarea
                    rows={7}
                    placeholder="Describe your property — key features, nearby landmarks, what makes it special…"
                    value={homeInfo.description}
                    onChange={(e) => setHomeInfo((s) => ({ ...s, description: e.target.value }))}
                    className="w-full rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                    autoFocus
                  />
                  <p className="text-xs mt-2" style={{ color: "var(--uber-muted)" }}>Mention nearby landmarks, estate name, and any special features. At least 3 sentences recommended.</p>
                </div>
              )}

              {/* ── Description (Hostel) ── */}
              {currentStep === "Description" && kind === "hostel" && (
                <div>
                  <textarea
                    rows={7}
                    placeholder="Describe your hostel — facilities, security, atmosphere, distance to campus…"
                    value={hostelInfo.description}
                    onChange={(e) => setHostelInfo((s) => ({ ...s, description: e.target.value }))}
                    className="w-full rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                    autoFocus
                  />
                  <p className="text-xs mt-2" style={{ color: "var(--uber-muted)" }}>Mention security features, study environment, and proximity to campus gates.</p>
                </div>
              )}

              {/* ── About (Home) ── */}
              {currentStep === "About" && kind === "home" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Property name / title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Modern 3-Bedroom Flat in East Legon"
                      value={homeInfo.title}
                      onChange={(e) => setHomeInfo((s) => ({ ...s, title: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Make it descriptive — good titles include the type, beds, and area.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Description</label>
                    <textarea
                      rows={5}
                      placeholder="Describe your property — key features, nearby landmarks, what makes it special…"
                      value={homeInfo.description}
                      onChange={(e) => setHomeInfo((s) => ({ ...s, description: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                      style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                    />
                  </div>
                </div>
              )}

              {/* ── About (Hostel) ── */}
              {currentStep === "About" && kind === "hostel" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Hostel name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Greenfield Student Lodge"
                      value={hostelInfo.title}
                      onChange={(e) => setHostelInfo((s) => ({ ...s, title: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Description</label>
                    <textarea
                      rows={5}
                      placeholder="Describe your hostel — facilities, security, atmosphere, distance to campus…"
                      value={hostelInfo.description}
                      onChange={(e) => setHostelInfo((s) => ({ ...s, description: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                      style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                    />
                  </div>
                </div>
              )}

              {/* ── Location (Home) ── */}
              {currentStep === "Location" && kind === "home" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Region *</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {REGION_NAMES.map((r) => (
                        <button key={r} onClick={() => setHomeInfo((s) => ({ ...s, region: r, city: "" }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${homeInfo.region === r ? "bg-emerald-500 text-white" : ""}`}
                          style={homeInfo.region !== r ? { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" } : {}}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {homeInfo.region && (
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>District / Town *</label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {getDistrictsForRegion(homeInfo.region).map((d) => (
                          <button key={d} onClick={() => setHomeInfo((s) => ({ ...s, city: d }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${homeInfo.city === d ? "bg-emerald-500 text-white" : ""}`}
                            style={homeInfo.city !== d ? { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" } : {}}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Street address / Estate</label>
                    <input type="text" placeholder="e.g. 14 Orchid Rd, East Legon" value={homeInfo.address}
                      onChange={(e) => setHomeInfo((s) => ({ ...s, address: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                  </div>
                  <LocationPicker lat={homeInfo.lat} lng={homeInfo.lng}
                    onLocationSet={(lat, lng) => setHomeInfo((s) => ({ ...s, lat, lng }))}
                    onAddressFetched={(addr, city, region) => setHomeInfo((s) => ({
                      ...s,
                      address: addr || s.address,
                      city: city || s.city,
                      region: region || s.region,
                    }))} />
                </div>
              )}

              {/* ── Location (Hostel) ── */}
              {currentStep === "Location" && kind === "hostel" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Region *</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {REGION_NAMES.map((r) => (
                        <button key={r} onClick={() => setHostelInfo((s) => ({ ...s, region: r, city: "" }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${hostelInfo.region === r ? "bg-blue-600 text-white" : ""}`}
                          style={hostelInfo.region !== r ? { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" } : {}}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {hostelInfo.region && (
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>District / Town *</label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {getDistrictsForRegion(hostelInfo.region).map((d) => (
                          <button key={d} onClick={() => setHostelInfo((s) => ({ ...s, city: d }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${hostelInfo.city === d ? "bg-blue-600 text-white" : ""}`}
                            style={hostelInfo.city !== d ? { background: "var(--uber-white)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" } : {}}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Street address</label>
                    <input type="text" placeholder="e.g. 12 University Road, Legon" value={hostelInfo.address}
                      onChange={(e) => setHostelInfo((s) => ({ ...s, address: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                  </div>
                  <LocationPicker lat={hostelInfo.lat} lng={hostelInfo.lng}
                    onLocationSet={(lat, lng) => setHostelInfo((s) => ({ ...s, lat, lng }))}
                    onAddressFetched={(addr, city, region) => setHostelInfo((s) => ({
                      ...s,
                      address: addr || s.address,
                      city: city || s.city,
                      region: region || s.region,
                    }))} />
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Nearby universities / schools</label>
                    <input type="text" placeholder="e.g. University of Ghana, KNUST" value={hostelInfo.nearbyUniversities}
                      onChange={(e) => setHostelInfo((s) => ({ ...s, nearbyUniversities: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                    <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Comma-separated list</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Your phone (shown after booking)</label>
                    <PhoneInput value={hostelInfo.managerPhone} onChange={(e164) => setHostelInfo((s) => ({ ...s, managerPhone: e164 }))} />
                  </div>
                </div>
              )}

              {/* ── Bedrooms & Bathrooms ── */}
              {currentStep === "Bedrooms & Bathrooms" && kind === "home" && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Bedrooms</label>
                    <div className="grid grid-cols-5 gap-3">
                      {["0", "1", "2", "3", "4", "5", "6+"].map((n) => (
                        <button key={n} onClick={() => setHomeInfo((s) => ({ ...s, beds: n === "6+" ? "6" : n }))}
                          className="py-4 rounded-2xl text-base font-bold transition-all border-2"
                          style={homeInfo.beds === (n === "6+" ? "6" : n)
                            ? { borderColor: "#10b981", background: "rgba(6,193,103,0.06)", color: "#059669" }
                            : { borderColor: "var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Bathrooms</label>
                    <div className="grid grid-cols-5 gap-3">
                      {["1", "2", "3", "4", "5+"].map((n) => (
                        <button key={n} onClick={() => setHomeInfo((s) => ({ ...s, baths: n === "5+" ? "5" : n }))}
                          className="py-4 rounded-2xl text-base font-bold transition-all border-2"
                          style={homeInfo.baths === (n === "5+" ? "5" : n)
                            ? { borderColor: "#10b981", background: "rgba(6,193,103,0.06)", color: "#059669" }
                            : { borderColor: "var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Property Details ── */}
              {currentStep === "Property Details" && kind === "home" && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>
                      Property size (sqft) <span style={{ color: "var(--uber-muted)", fontWeight: 400 }}>— optional</span>
                    </label>
                    <div className="relative">
                      <input type="text" inputMode="numeric" placeholder="e.g. 1400" value={homeInfo.sqft}
                        onChange={(e) => setHomeInfo((s) => ({ ...s, sqft: e.target.value }))}
                        className="w-full rounded-xl px-4 py-4 text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                    </div>
                    {homeInfo.propertyType === "house" && (
                      <div className="mt-4">
                        <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Land size (sq meters) — optional</label>
                        <input type="text" inputMode="numeric" placeholder="e.g. 450" value={homeInfo.landSize}
                          onChange={(e) => setHomeInfo((s) => ({ ...s, landSize: e.target.value }))}
                          className="w-full rounded-xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Property condition</label>
                    <div className="grid grid-cols-3 gap-3">
                      {CONDITION_OPTIONS.map((c) => (
                        <button key={c.value} onClick={() => setHomeInfo((s) => ({ ...s, condition: c.value }))}
                          className="py-5 rounded-2xl text-sm font-bold transition-all border-2"
                          style={homeInfo.condition === c.value
                            ? { borderColor: "#10b981", background: "rgba(6,193,103,0.06)", color: "#059669" }
                            : { borderColor: "var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-muted)" }}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Furnishing level</label>
                    <div className="grid grid-cols-3 gap-3">
                      {FURNISHING_OPTIONS.map((f) => (
                        <button key={f.value} onClick={() => setHomeInfo((s) => ({ ...s, furnishing: f.value }))}
                          className="py-5 rounded-2xl text-sm font-bold transition-all border-2"
                          style={homeInfo.furnishing === f.value
                            ? { borderColor: "#10b981", background: "rgba(6,193,103,0.06)", color: "#059669" }
                            : { borderColor: "var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-muted)" }}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Specs (Home) — legacy fallback ── */}
              {currentStep === "Specs" && kind === "home" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Bedrooms</label>
                      <input type="text" inputMode="numeric" placeholder="3" value={homeInfo.beds}
                        onChange={(e) => setHomeInfo((s) => ({ ...s, beds: e.target.value }))}
                        className="w-full rounded-xl px-4 py-3.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Bathrooms</label>
                      <input type="text" inputMode="numeric" placeholder="2" value={homeInfo.baths}
                        onChange={(e) => setHomeInfo((s) => ({ ...s, baths: e.target.value }))}
                        className="w-full rounded-xl px-4 py-3.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Size (sqft)</label>
                      <input type="text" inputMode="numeric" placeholder="1400" value={homeInfo.sqft}
                        onChange={(e) => setHomeInfo((s) => ({ ...s, sqft: e.target.value }))}
                        className="w-full rounded-xl px-4 py-3.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Price (Home) ── */}
              {currentStep === "Price" && kind === "home" && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Is this for rent or sale?</label>
                    <div className="grid grid-cols-2 gap-4">
                      {(["Rent", "Sale"] as const).map((t) => (
                        <button key={t} onClick={() => setHomeInfo((s) => ({ ...s, forSale: t === "Sale" }))}
                          className="py-6 rounded-2xl text-base font-bold transition-all border-2 flex flex-col items-center gap-1"
                          style={(t === "Sale") === homeInfo.forSale
                            ? { borderColor: "#10b981", background: "rgba(6,193,103,0.06)", color: "#059669" }
                            : { borderColor: "var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-muted)" }}>
                          <span className="text-2xl">{t === "Rent" ? "🏠" : "🏷️"}</span>
                          <span>For {t}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>
                      Asking price (GH₵{homeInfo.forSale ? "" : " per month"}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold" style={{ color: "var(--uber-muted)" }}>GH₵</span>
                      <input type="text" inputMode="numeric" placeholder="e.g. 3500" value={homeInfo.price}
                        onChange={(e) => setHomeInfo((s) => ({ ...s, price: e.target.value }))}
                        className="w-full rounded-xl pl-14 pr-4 py-4 text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}
                        autoFocus />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>
                      Service charge (GH₵/mo) <span style={{ color: "var(--uber-muted)", fontWeight: 400 }}>— optional</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: "var(--uber-muted)" }}>GH₵</span>
                      <input type="text" inputMode="numeric" placeholder="0" value={homeInfo.serviceCharge}
                        onChange={(e) => setHomeInfo((s) => ({ ...s, serviceCharge: e.target.value }))}
                        className="w-full rounded-xl pl-14 pr-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-2xl" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Price is negotiable</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--uber-muted)" }}>Allow seekers to make offers</p>
                    </div>
                    <button onClick={() => setHomeInfo((s) => ({ ...s, isNegotiable: !s.isNegotiable }))}
                      className="w-12 h-6 rounded-full transition-colors relative shrink-0"
                      style={{ background: homeInfo.isNegotiable ? "var(--uber-green)" : "var(--uber-surface2)" }}>
                      <div className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all" style={{ background: "var(--uber-white)", left: homeInfo.isNegotiable ? "1.375rem" : "0.125rem" }} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Contact (Home) ── */}
              {currentStep === "Contact" && kind === "home" && (
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>Your phone number</label>
                  <PhoneInput value={homeInfo.ownerPhone} onChange={(e164) => setHomeInfo((s) => ({ ...s, ownerPhone: e164 }))} />
                  <p className="text-xs mt-2" style={{ color: "var(--uber-muted)" }}>Only shared with seekers after their inquiry is accepted. Use a WhatsApp-enabled number for fastest response.</p>
                </div>
              )}

              {/* ── Pricing (Home) — legacy fallback ── */}
              {currentStep === "Pricing" && kind === "home" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--uber-text)" }}>
                      Price (GH₵{homeInfo.forSale ? "" : "/month"}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: "var(--uber-muted)" }}>GH₵</span>
                      <input type="text" inputMode="numeric" placeholder="e.g. 3500" value={homeInfo.price}
                        onChange={(e) => setHomeInfo((s) => ({ ...s, price: e.target.value }))}
                        className="w-full rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        style={{ background: "var(--uber-white)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Facilities (Home) ── */}
              {currentStep === "Facilities" && kind === "home" && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: "var(--uber-muted)" }}>Select all that apply — helps seekers find your listing faster.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {HOME_AMENITIES.map((a) => {
                      const selected = homeInfo.amenities.includes(a.value);
                      return (
                        <button key={a.value}
                          onClick={() => setHomeInfo((s) => ({
                            ...s,
                            amenities: selected ? s.amenities.filter((x) => x !== a.value) : [...s.amenities, a.value],
                          }))}
                          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${selected ? "border-emerald-500" : ""}`}
                          style={!selected ? { borderColor: "var(--uber-border)", background: "var(--uber-white)" } : { background: "rgba(6,193,103,0.04)" }}>
                          <span className="text-xl shrink-0">{a.icon}</span>
                          <span className="text-sm font-semibold flex-1" style={{ color: selected ? "#059669" : "var(--uber-text)" }}>{a.label}</span>
                          {selected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Rooms (Hostel) ── */}
              {currentStep === "Rooms" && kind === "hostel" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm" style={{ color: "var(--uber-muted)" }}>Add each type of room you offer</p>
                    <button
                      onClick={() => {
                        const draft = makeRoomDraft();
                        setHostelInfo((s) => ({ ...s, rooms: [...s.rooms, draft] }));
                        setEditingRoom(draft.id);
                      }}
                      className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
                    >
                      <span className="text-base leading-none">+</span> Add Room
                    </button>
                  </div>
                  <div className="space-y-3">
                    {hostelInfo.rooms.map((room, idx) => (
                      <RoomEditor key={room.id} room={room} index={idx} isOpen={editingRoom === room.id}
                        onToggle={() => setEditingRoom(editingRoom === room.id ? null : room.id)}
                        onChange={(updated) => setHostelInfo((s) => ({ ...s, rooms: s.rooms.map((r) => r.id === updated.id ? updated : r) }))}
                        onRemove={() => setHostelInfo((s) => ({ ...s, rooms: s.rooms.filter((r) => r.id !== room.id) }))} />
                    ))}
                  </div>
                  {hostelInfo.rooms.length === 0 && (
                    <div className="text-center py-12 rounded-2xl" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                      <p className="text-3xl mb-2"><IconBed /></p>
                      <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>No rooms yet</p>
                      <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>Tap &quot;Add Room&quot; to get started</p>
                    </div>
                  )}
                  {hostelInfo.rooms.length > 0 && !hostelInfo.rooms.every((r) => r.name.trim() && r.price.trim()) && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      <p className="text-xs text-amber-700 font-medium">Fill in name and price for all rooms to continue</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Rules & Nearby ── */}
              {currentStep === "Rules & Nearby" && kind === "home" && (
                <div className="space-y-6">
                  {/* Property Rules */}
                  <div>
                    <p className="text-sm font-bold mb-3" style={{ color: "var(--uber-text)" }}>Property rules</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Move-in arrangement</label>
                        <input
                          type="text"
                          value={homeInfo.moveIn}
                          onChange={(e) => setHomeInfo((s) => ({ ...s, moveIn: e.target.value }))}
                          placeholder="e.g. Flexible — by arrangement"
                          className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none"
                          style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: "var(--uber-text)" }}>Pets allowed?</label>
                        <div className="flex gap-2">
                          {([["yes", "Yes"], ["no", "No"], ["ask", "Ask owner"]] as const).map(([v, l]) => (
                            <button key={v} type="button"
                              onClick={() => setHomeInfo((s) => ({ ...s, petsAllowed: v }))}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                              style={homeInfo.petsAllowed === v
                                ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
                                : { background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: "var(--uber-text)" }}>Smoking indoors?</label>
                        <div className="flex gap-2">
                          {([["yes", "Permitted"], ["no", "Not permitted"]] as const).map(([v, l]) => (
                            <button key={v} type="button"
                              onClick={() => setHomeInfo((s) => ({ ...s, smokingAllowed: v }))}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                              style={homeInfo.smokingAllowed === v
                                ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
                                : { background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: "var(--uber-text)" }}>Subletting permitted?</label>
                        <div className="flex gap-2">
                          {([["yes", "Permitted"], ["no", "Not permitted"]] as const).map(([v, l]) => (
                            <button key={v} type="button"
                              onClick={() => setHomeInfo((s) => ({ ...s, sublettingAllowed: v }))}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                              style={homeInfo.sublettingAllowed === v
                                ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
                                : { background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* What's Nearby */}
                  <div>
                    <p className="text-sm font-bold mb-1" style={{ color: "var(--uber-text)" }}>What&apos;s nearby</p>
                    <p className="text-xs mb-3" style={{ color: "var(--uber-muted)" }}>Leave blank if you&apos;re not sure — these are optional.</p>
                    <div className="space-y-3">
                      {([
                        ["nearbyShops",       "🏪", "Shops & Supermarkets", "e.g. Accra Mall, within 5 mins walk"],
                        ["nearbyRestaurants", "🍽️", "Restaurants & Eateries", "e.g. Within 1 km"],
                        ["nearbyTransport",   "🚌", "Public Transport",       "e.g. Trotro stop 2 mins away"],
                        ["nearbyHospital",    "🏥", "Hospital / Clinic",      "e.g. Korle Bu Teaching Hospital, 10 mins"],
                      ] as [keyof HomeInfo, string, string, string][]).map(([field, icon, label, ph]) => (
                        <div key={field} className="flex items-center gap-3">
                          <span className="text-lg shrink-0">{icon}</span>
                          <div className="flex-1">
                            <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--uber-muted)" }}>{label}</label>
                            <input
                              type="text"
                              value={String(homeInfo[field] ?? "")}
                              onChange={(e) => setHomeInfo((s) => ({ ...s, [field]: e.target.value }))}
                              placeholder={ph}
                              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                              style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Photos ── */}
              {currentStep === "Photos" && (
                <div className="space-y-5">
                  <p className="text-sm" style={{ color: "var(--uber-muted)" }}>Minimum {MIN_PHOTOS} photos required. Add up to 10. First photo is your cover image.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: "var(--uber-surface2)" }}>
                        <img src={photoPreviews[i] || ""} alt="" className="w-full h-full object-cover" />
                        {i === 0 && (
                          <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Cover</div>
                        )}
                        <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center"><IconClose /></button>
                        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                          {i > 0 && <button onClick={() => movePhoto(i, i - 1)} className="w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center">←</button>}
                          {i < photos.length - 1 && <button onClick={() => movePhoto(i, i + 1)} className="w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center">→</button>}
                        </div>
                      </div>
                    ))}
                    {photos.length < 10 && (
                      <button onClick={() => photoInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
                        style={{ borderColor: "var(--uber-border)", color: "var(--uber-muted)" }}>
                        <span className="text-2xl">+</span>
                        <span className="text-[10px]">Add Photo</span>
                      </button>
                    )}
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handlePhotoAdd(e.target.files); e.target.value = ""; }} />
                  {compressing && <p className="text-xs font-medium animate-pulse" style={{ color: "var(--uber-muted)" }}>Compressing images…</p>}
                  <div className={`rounded-xl px-4 py-3 ${photos.length >= MIN_PHOTOS ? "bg-emerald-50 border border-emerald-100" : "bg-amber-50 border border-amber-100"}`}>
                    <p className={`text-sm font-medium ${photos.length >= MIN_PHOTOS ? "text-emerald-700" : "text-amber-700"}`}>
                      {photos.length < MIN_PHOTOS
                        ? `Add ${MIN_PHOTOS - photos.length} more photo${MIN_PHOTOS - photos.length > 1 ? "s" : ""} to continue`
                        : `✓ ${photos.length} photo${photos.length !== 1 ? "s" : ""} ready`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Video Tour <span className="text-xs font-normal" style={{ color: "var(--uber-muted)" }}>(optional, max 100 MB)</span></h3>
                    {videoPreview ? (
                      <div className="relative rounded-xl overflow-hidden" style={{ border: "0.5px solid var(--uber-border)" }}>
                        <video src={videoPreview} controls className="w-full max-h-48 object-contain" style={{ background: "#000" }} />
                        <button onClick={removeVideo} className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"><IconClose /></button>
                      </div>
                    ) : (
                      <button onClick={() => videoInputRef.current?.click()}
                        className="w-full py-5 rounded-xl border-2 border-dashed flex flex-col items-center gap-1.5 hover:border-emerald-400 transition-colors"
                        style={{ borderColor: "var(--uber-border)", color: "var(--uber-muted)" }}>
                        <span className="text-2xl"><IconFilm /></span>
                        <span className="text-sm font-medium">Add Video Tour</span>
                        <span className="text-xs">Takes seekers on a virtual walkthrough</span>
                      </button>
                    )}
                    <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { handleVideoAdd(e.target.files); e.target.value = ""; }} />
                  </div>
                </div>
              )}

              {/* ── Review ── */}
              {currentStep === "Review" && (
                <div className="space-y-4">
                  {/* Listing fee paywall */}
                  {needsListingFee && listingCountLoaded && (
                    <div className="rounded-2xl p-5 space-y-3" style={{ background: "#FDF8E7", border: "0.5px solid rgba(212,175,55,0.3)" }}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl"><IconShield /></span>
                        <div>
                          <p className="text-sm font-extrabold" style={{ color: "var(--uber-text)" }}>Listing Limit Reached</p>
                          <p className="text-xs mt-1" style={{ color: "var(--uber-muted)" }}>You already have {listingCount} properties listed. To post 3 or more, you need to become a StayMate Agent.</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <button onClick={handlePayListingFee} className="w-full py-3.5 text-sm font-bold rounded-xl" style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}>Pay GH₵{PER_LISTING_FEE} for This Listing</button>
                        <button onClick={handlePayAgentSub} className="w-full py-3.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2" style={{ background: "#06C167", color: "#fff" }}>Subscribe — GH₵{AGENT_SUBSCRIPTION_PRICE}/mo (Unlimited)</button>
                      </div>
                    </div>
                  )}
                  {/* Preview card */}
                  <div className="rounded-2xl overflow-hidden" style={{ border: "0.5px solid var(--uber-border)" }}>
                    {photoPreviews[0] && (
                      <img src={photoPreviews[0]} alt="" className="w-full h-48 object-cover" />
                    )}
                    <div className="p-5 space-y-3" style={{ background: "var(--uber-white)" }}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{kind === "hostel" ? <IconSchool /> : <IconHome />}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold" style={{ color: "var(--uber-text)" }}>{kind === "home" ? homeInfo.title : hostelInfo.title}</p>
                          <p className="text-sm mt-0.5" style={{ color: "var(--uber-muted)" }}>
                            {kind === "home"
                              ? `${homeInfo.city} · ${PROPERTY_TYPES.find((p) => p.value === homeInfo.propertyType)?.label} · ${homeInfo.forSale ? "For Sale" : "For Rent"}`
                              : `${hostelInfo.city} · ${hostelInfo.rooms.length} room type${hostelInfo.rooms.length !== 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>
                      {kind === "home" && (
                        <>
                          <p className="text-xl font-extrabold text-emerald-600">
                            GH₵{parseFloat(homeInfo.price.replace(/[^\d.]/g, "") || "0").toLocaleString()}{homeInfo.forSale ? "" : "/mo"}
                          </p>
                          <div className="flex gap-4 text-sm" style={{ color: "var(--uber-muted)" }}>
                            {homeInfo.beds && <span><IconBed /> {homeInfo.beds} beds</span>}
                            {homeInfo.baths && <span><IconShower /> {homeInfo.baths} baths</span>}
                            {homeInfo.sqft && <span><IconRuler /> {homeInfo.sqft} sqft</span>}
                          </div>
                        </>
                      )}
                      {kind === "hostel" && (
                        <div className="space-y-1.5 pt-2" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                          {hostelInfo.rooms.map((r) => (
                            <div key={r.id} className="flex items-center justify-between text-sm">
                              <span style={{ color: "var(--uber-text)" }}>{r.name || r.roomType}</span>
                              <span className="font-bold text-blue-600">GH₵{parseFloat(r.price || "0").toLocaleString()}/yr</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs pt-2 flex items-center gap-1.5" style={{ color: "var(--uber-muted)", borderTop: "0.5px solid var(--uber-border)" }}>
                        <IconCamera /> {photos.length} photos
                        {videoPreview && <> · <IconFilm /> Video tour attached</>}
                      </p>
                    </div>
                  </div>
                  {submitError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <p className="text-sm text-red-600 font-medium">{submitError}</p>
                    </div>
                  )}
                  <div className="rounded-xl px-4 py-3" style={{ background: "#FFF8E1", border: "0.5px solid rgba(245,158,11,0.3)" }}>
                    <p className="text-xs font-medium text-amber-700">⚠️ Your listing will be reviewed by our team before going live. This usually takes less than 24 hours.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop right sidebar: tips */}
            <div className="hidden lg:block">
              <div className="sticky top-20 rounded-2xl p-5 space-y-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "var(--uber-surface)" }}>💡</div>
                  <p className="text-sm font-bold" style={{ color: "var(--uber-text)" }}>Tips for this step</p>
                </div>
                <div className="space-y-3">
                  {(STEP_TIPS[currentStep as string] || []).map((tip: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--uber-green)" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--uber-muted)" }}>{tip}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-3 mt-2" style={{ borderTop: "0.5px solid var(--uber-border)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: "rgba(6,193,103,0.1)" }}>🛡️</div>
                    <p className="text-xs font-semibold" style={{ color: "var(--uber-green)" }}>StayMate verifies every listing</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
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
          disabled={!canGoNext() || submitting || (currentStep === "Preview" && needsListingFee)}
          onClick={() => {
            if (currentStep === "Preview") {
              handleSubmit();
            } else {
              setStepIndex((i) => i + 1);
            }
          }}
          className={`flex-1 font-bold py-3 rounded-2xl active:scale-95 transition-all text-sm ${
            canGoNext() && !submitting
              ? ""
              : "cursor-not-allowed"
          }`}
          style={
            !(canGoNext() && !submitting)
              ? { background: "var(--uber-surface2)", color: "var(--uber-muted)" }
              : { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }
          }
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
          <IconCheck />
          <span>Coordinates set: {lat}°, {lng}°</span>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
          <IconWarning />
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
