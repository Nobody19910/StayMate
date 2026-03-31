"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { PropertyCondition, FurnishingLevel } from "@/lib/types";
import PhoneInput from "@/components/ui/PhoneInput";
import { IconSnowflake, IconBolt, IconDroplet, IconFaucet, IconLock, IconFrying, IconTie, IconSparkles, IconPool, IconWifi, IconCar, IconPlant, IconBroom, IconShower, IconThermometer, IconBook, IconShirt, IconUtensils, IconCamera, IconCouch, IconBuilding, IconHome, IconNeighborhood } from "@/components/ui/Icons";

const HOME_AMENITIES: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: "AC", label: "Air Con", icon: <IconSnowflake /> },
  { value: "Generator", label: "Generator", icon: <IconBolt /> },
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

const HOSTEL_AMENITIES: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: "wifi", label: "WiFi", icon: <IconWifi /> },
  { value: "security", label: "Security", icon: <IconLock /> },
  { value: "generator", label: "Generator", icon: <IconBolt /> },
  { value: "cctv", label: "CCTV", icon: <IconCamera /> },
  { value: "laundry", label: "Laundry", icon: <IconShirt /> },
  { value: "study-room", label: "Study Room", icon: <IconBook /> },
  { value: "canteen", label: "Canteen", icon: <IconUtensils /> },
  { value: "borehole", label: "Borehole", icon: <IconDroplet /> },
  { value: "parking", label: "Parking", icon: <IconCar /> },
  { value: "gym", label: "Gym", icon: <IconBuilding /> },
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

function SectionHeader({ title }: { title: string }) {
  return <p className="text-[11px] font-bold uppercase tracking-widest pt-2" style={{ color: "var(--uber-muted)" }}>{title}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-muted)" }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-3 rounded-xl text-sm font-medium outline-none";
const inputStyle = { background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-text)" };

export default function EditListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();

  const id = params.id as string;
  const type = searchParams.get("type") as "home" | "hostel";

  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Shared
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");

  // Home fields
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [forSale, setForSale] = useState(false);
  const [beds, setBeds] = useState(1);
  const [baths, setBaths] = useState(1);
  const [sqft, setSqft] = useState("");
  const [condition, setCondition] = useState<PropertyCondition>("new");
  const [furnishing, setFurnishing] = useState<FurnishingLevel>("unfurnished");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [serviceCharge, setServiceCharge] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [moveIn, setMoveIn] = useState("Flexible — by arrangement");
  const [petsAllowed, setPetsAllowed] = useState("ask");
  const [smokingAllowed, setSmokingAllowed] = useState("no");
  const [sublettingAllowed, setSublettingAllowed] = useState("no");
  const [nearbyShops, setNearbyShops] = useState("");
  const [nearbyRestaurants, setNearbyRestaurants] = useState("");
  const [nearbyTransport, setNearbyTransport] = useState("");
  const [nearbyHospital, setNearbyHospital] = useState("");

  // Hostel fields
  const [hostelName, setHostelName] = useState("");
  const [nearbyUniversities, setNearbyUniversities] = useState("");
  const [hostelAmenities, setHostelAmenities] = useState<string[]>([]);

  // Video
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [videoUploading, setVideoUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!id || !type) { router.push("/dashboard"); return; }

    async function load() {
      setLoading(true);

      // Check if current user is an admin — admins bypass ownership checks
      const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
      const userIsAdmin = profileData?.role === "admin";
      setIsAdmin(userIsAdmin);

      if (type === "home") {
        const { data } = await supabase.from("homes").select("*").eq("id", id).single();
        if (data) {
          // Ownership check — admins skip this
          if (!userIsAdmin && data.owner_id && data.owner_id !== user!.id) {
            router.push("/dashboard");
            return;
          }
          setTitle(data.title ?? "");
          setDescription(data.description ?? "");
          setPrice(data.price ? data.price.toString() : "");
          setForSale(!!data.for_sale);
          setBeds(data.beds ?? 1);
          setBaths(data.baths ?? 1);
          setSqft(data.sqft ? data.sqft.toString() : "");
          setCondition(data.condition ?? "new");
          setFurnishing(data.furnishing ?? "unfurnished");
          setAmenities(data.amenities ?? []);
          setServiceCharge(data.service_charge ? data.service_charge.toString() : "");
          setNegotiable(!!data.is_negotiable);
          setContactPhone(data.owner_phone ?? "");
          setCity(data.city ?? "");
          if (data.video_url) setVideoUrl(data.video_url);
          const r = data.rules ?? {};
          setMoveIn(r.move_in || "Flexible — by arrangement");
          setPetsAllowed(r.pets || "ask");
          setSmokingAllowed(r.smoking || "no");
          setSublettingAllowed(r.subletting || "no");
          const nb = data.nearby ?? {};
          setNearbyShops(nb.shops || "");
          setNearbyRestaurants(nb.restaurants || "");
          setNearbyTransport(nb.transport || "");
          setNearbyHospital(nb.hospital || "");
        }
      } else {
        const { data } = await supabase.from("hostels").select("*").eq("id", id).single();
        if (data) {
          // Ownership check — admins skip this
          if (!userIsAdmin && data.manager_id && data.manager_id !== user!.id) {
            router.push("/dashboard");
            return;
          }
          setHostelName(data.name ?? "");
          setDescription(data.description ?? "");
          setCity(data.city ?? "");
          setNearbyUniversities((data.nearby_universities ?? []).join(", "));
          setHostelAmenities(data.amenities ?? []);
          if (data.video_url) setVideoUrl(data.video_url);
          setContactPhone(data.manager_phone ?? "");
        }
      }
      setLoading(false);
    }
    load();
  }, [id, type, user, authLoading, router]);

  function toggleAmenity(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter(a => a !== val) : [...list, val]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSaved(false);

    try {
      // Upload video if a new file was selected
      let finalVideoUrl: string | null = videoUrl || null;
      if (videoFile) {
        setVideoUploading(true);
        const vForm = new FormData();
        vForm.append("file", videoFile);
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token ?? "";
        const vRes = await fetch("/api/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: vForm,
        });
        if (vRes.ok) {
          const { url: vUrl } = await vRes.json();
          finalVideoUrl = vUrl;
        }
        setVideoUploading(false);
      }

      if (type === "home") {
        const priceNum = parseFloat(price.replace(/[^\d.]/g, "")) || 0;
        const priceLabel = `GH₵${priceNum.toLocaleString()}${forSale ? "" : "/mo"}`;
        const scNum = serviceCharge ? parseFloat(serviceCharge.replace(/[^\d.]/g, "")) : null;

        const { error: updateError } = await supabase.from("homes").update({
          title,
          description,
          city,
          price: priceNum,
          price_label: priceLabel,
          for_sale: forSale,
          beds,
          baths,
          sqft: sqft ? parseInt(sqft) : null,
          condition,
          furnishing,
          amenities,
          service_charge: scNum,
          is_negotiable: negotiable,
          owner_phone: contactPhone || null,
          rules: { move_in: moveIn, pets: petsAllowed, smoking: smokingAllowed, subletting: sublettingAllowed },
          nearby: { shops: nearbyShops, restaurants: nearbyRestaurants, transport: nearbyTransport, hospital: nearbyHospital },
          video_url: finalVideoUrl,
        }).eq("id", id);

        if (updateError) throw updateError;
      } else {
        const unis = nearbyUniversities.split(",").map(s => s.trim()).filter(Boolean);
        const { error: updateError } = await supabase.from("hostels").update({
          name: hostelName,
          description,
          city,
          nearby_universities: unis,
          amenities: hostelAmenities,
          manager_phone: contactPhone || null,
          video_url: finalVideoUrl,
        }).eq("id", id);
        if (updateError) throw updateError;
      }

      setSaved(true);
      setTimeout(() => router.push("/profile"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--uber-surface)" }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--uber-green)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--uber-surface)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4" style={{ height: 56, background: "var(--uber-white)", borderBottom: "0.5px solid var(--uber-border)" }}>
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--uber-surface2)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ color: "var(--uber-text)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-base font-extrabold" style={{ color: "var(--uber-text)" }}>
          Edit {type === "home" ? "Home Listing" : "Hostel"}
        </h1>
      </header>

      <form onSubmit={handleSave} className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="text-sm font-semibold px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "0.5px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}
        {saved && (
          <div className="text-sm font-semibold px-4 py-3 rounded-xl" style={{ background: "rgba(6,193,103,0.08)", color: "var(--uber-green)", border: "0.5px solid rgba(6,193,103,0.2)" }}>
            Saved! Redirecting…
          </div>
        )}

        <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
          <SectionHeader title="Basic Info" />

          {type === "home" ? (
            <Field label="Listing Title *">
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} style={inputStyle} required />
            </Field>
          ) : (
            <Field label="Hostel Name *">
              <input type="text" value={hostelName} onChange={e => setHostelName(e.target.value)} className={inputCls} style={inputStyle} required />
            </Field>
          )}

          <Field label="City / Area">
            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. East Legon, Accra" className={inputCls} style={inputStyle} />
          </Field>

          <Field label="Description *">
            <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)} className={`${inputCls} resize-none`} style={inputStyle} required />
          </Field>

          <Field label="Contact Phone">
            <PhoneInput value={contactPhone} onChange={(e164) => setContactPhone(e164)} />
          </Field>
        </div>

        {/* Home-specific */}
        {type === "home" && (
          <>
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <SectionHeader title="Pricing" />

              {/* Rent / Sale toggle */}
              <div className="grid grid-cols-2 gap-2">
                {[{ v: false, l: "For Rent" }, { v: true, l: "For Sale" }].map(({ v, l }) => (
                  <button key={l} type="button" onClick={() => setForSale(v)}
                    className="py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={forSale === v
                      ? { background: "rgba(6,193,103,0.12)", border: "1.5px solid var(--uber-green)", color: "var(--uber-green)" }
                      : { background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}>
                    {l}
                  </button>
                ))}
              </div>

              <Field label={forSale ? "Sale Price (GH₵) *" : "Monthly Rent (GH₵) *"}>
                <input type="text" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 4500" className={inputCls} style={inputStyle} required />
              </Field>

              <Field label="Service Charge (GH₵/mo) — optional">
                <input type="text" inputMode="numeric" value={serviceCharge} onChange={e => setServiceCharge(e.target.value)} placeholder="e.g. 200" className={inputCls} style={inputStyle} />
              </Field>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setNegotiable(v => !v)}
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors"
                  style={negotiable ? { background: "var(--uber-green)", border: "none" } : { border: "1.5px solid var(--uber-border)", background: "transparent" }}>
                  {negotiable && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                </button>
                <span className="text-sm font-medium" style={{ color: "var(--uber-text)" }}>Price is negotiable</span>
              </div>
            </div>

            <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <SectionHeader title="Property Details" />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Bedrooms">
                  <div className="flex gap-1 flex-wrap">
                    {[0, 1, 2, 3, 4, 5, 6].map(n => (
                      <button key={n} type="button" onClick={() => setBeds(n)}
                        className="w-9 h-9 rounded-lg text-sm font-bold transition-all"
                        style={beds === n ? { background: "var(--uber-green)", color: "#fff" } : { background: "var(--uber-surface)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}>
                        {n === 6 ? "6+" : n}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Bathrooms">
                  <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setBaths(n)}
                        className="w-9 h-9 rounded-lg text-sm font-bold transition-all"
                        style={baths === n ? { background: "var(--uber-green)", color: "#fff" } : { background: "var(--uber-surface)", color: "var(--uber-muted)", border: "0.5px solid var(--uber-border)" }}>
                        {n === 5 ? "5+" : n}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Floor Area (sqft) — optional">
                <input type="text" inputMode="numeric" value={sqft} onChange={e => setSqft(e.target.value)} placeholder="e.g. 1200" className={inputCls} style={inputStyle} />
              </Field>

              <Field label="Condition">
                <div className="grid grid-cols-3 gap-2">
                  {CONDITION_OPTIONS.map(c => (
                    <button key={c.value} type="button" onClick={() => setCondition(c.value)}
                      className="py-2 rounded-xl text-xs font-bold transition-all"
                      style={condition === c.value
                        ? { background: "rgba(6,193,103,0.12)", border: "1.5px solid var(--uber-green)", color: "var(--uber-green)" }
                        : { background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Furnishing">
                <div className="grid grid-cols-3 gap-2">
                  {FURNISHING_OPTIONS.map(f => (
                    <button key={f.value} type="button" onClick={() => setFurnishing(f.value)}
                      className="py-2 rounded-xl text-xs font-bold transition-all"
                      style={furnishing === f.value
                        ? { background: "rgba(6,193,103,0.12)", border: "1.5px solid var(--uber-green)", color: "var(--uber-green)" }
                        : { background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <SectionHeader title="Amenities & Facilities" />
              <div className="grid grid-cols-2 gap-2">
                {HOME_AMENITIES.map(a => {
                  const on = amenities.includes(a.value);
                  return (
                    <button key={a.value} type="button" onClick={() => toggleAmenity(amenities, setAmenities, a.value)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all"
                      style={on
                        ? { background: "rgba(6,193,103,0.1)", border: "1.5px solid var(--uber-green)", color: "var(--uber-green)" }
                        : { background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}>
                      <span className="text-sm">{a.icon}</span>{a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Hostel-specific */}
        {type === "hostel" && (
          <>
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <SectionHeader title="Location" />
              <Field label="Nearby Universities (comma-separated)">
                <input type="text" value={nearbyUniversities} onChange={e => setNearbyUniversities(e.target.value)} placeholder="e.g. University of Ghana, KNUST" className={inputCls} style={inputStyle} />
              </Field>
            </div>

            <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
              <SectionHeader title="Building Amenities" />
              <div className="grid grid-cols-2 gap-2">
                {HOSTEL_AMENITIES.map(a => {
                  const on = hostelAmenities.includes(a.value);
                  return (
                    <button key={a.value} type="button" onClick={() => toggleAmenity(hostelAmenities, setHostelAmenities, a.value)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all"
                      style={on
                        ? { background: "rgba(6,193,103,0.1)", border: "1.5px solid var(--uber-green)", color: "var(--uber-green)" }
                        : { background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}>
                      <span className="text-sm">{a.icon}</span>{a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Rules & Nearby — homes only */}
        {type === "home" && (
          <>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>Property Rules</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--uber-text)" }}>Move-in arrangement</label>
                  <input type="text" value={moveIn} onChange={e => setMoveIn(e.target.value)} className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none" style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "var(--uber-text)" }}>Pets allowed?</label>
                  <div className="flex gap-2">
                    {([["yes", "Yes"], ["no", "No"], ["ask", "Ask owner"]] as [string, string][]).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setPetsAllowed(v)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                        style={petsAllowed === v ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" } : { background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "var(--uber-text)" }}>Smoking indoors?</label>
                  <div className="flex gap-2">
                    {([["yes", "Permitted"], ["no", "Not permitted"]] as [string, string][]).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setSmokingAllowed(v)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                        style={smokingAllowed === v ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" } : { background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "var(--uber-text)" }}>Subletting permitted?</label>
                  <div className="flex gap-2">
                    {([["yes", "Permitted"], ["no", "Not permitted"]] as [string, string][]).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setSublettingAllowed(v)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                        style={sublettingAllowed === v ? { background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" } : { background: "var(--uber-surface)", color: "var(--uber-text)", border: "0.5px solid var(--uber-border)" }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--uber-muted)" }}>What&apos;s Nearby <span className="normal-case font-normal">(optional)</span></p>
              <div className="space-y-3">
                {([
                  ["🏪", "Shops & Supermarkets", nearbyShops, setNearbyShops, "e.g. Accra Mall, 5 mins walk"],
                  ["🍽️", "Restaurants & Eateries", nearbyRestaurants, setNearbyRestaurants, "e.g. Within 1 km"],
                  ["🚌", "Public Transport", nearbyTransport, setNearbyTransport, "e.g. Trotro stop 2 mins away"],
                  ["🏥", "Hospital / Clinic", nearbyHospital, setNearbyHospital, "e.g. Korle Bu Teaching Hospital, 10 mins"],
                ] as [string, string, string, (v: string) => void, string][]).map(([icon, label, val, setter, ph]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-lg shrink-0">{icon}</span>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--uber-muted)" }}>{label}</label>
                      <input type="text" value={val} onChange={e => setter(e.target.value)} placeholder={ph} className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                        style={{ border: "0.5px solid var(--uber-border)", background: "var(--uber-white)", color: "var(--uber-text)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Video Tour */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--uber-white)", border: "0.5px solid var(--uber-border)" }}>
          <SectionHeader title="Video Tour" />
          <p className="text-xs" style={{ color: "var(--uber-muted)" }}>Optional — max 100 MB. Replace the existing video by selecting a new file.</p>
          {(videoPreview || videoUrl) && (
            <div className="relative rounded-xl overflow-hidden" style={{ border: "0.5px solid var(--uber-border)" }}>
              <video src={videoPreview || videoUrl} controls className="w-full max-h-48 object-contain" style={{ background: "#000" }} />
              <button
                type="button"
                onClick={() => { if (videoPreview) URL.revokeObjectURL(videoPreview); setVideoFile(null); setVideoPreview(""); setVideoUrl(""); }}
                className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center font-bold"
              >✕</button>
            </div>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 100 * 1024 * 1024) { alert("Video must be under 100 MB"); return; }
              if (videoPreview) URL.revokeObjectURL(videoPreview);
              setVideoFile(file);
              setVideoPreview(URL.createObjectURL(file));
            }}
          />
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{ background: "var(--uber-surface)", border: "0.5px solid var(--uber-border)", color: "var(--uber-muted)" }}
          >
            {videoFile ? "Change Video" : videoUrl ? "Replace Video" : "Add Video Tour"}
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting || saved || videoUploading}
          className="w-full font-bold py-4 rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-50"
          style={{ background: "var(--uber-btn-bg)", color: "var(--uber-btn-text)" }}
        >
          {videoUploading ? "Uploading video…" : submitting ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
