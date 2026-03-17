import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Server-side Supabase client - use service key if available, otherwise use anon key
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from auth header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const propertyId = formData.get("propertyId") as string;
    const propertyType = formData.get("propertyType") as string; // "home" or "hostel"

    if (!file || !propertyId || !propertyType) {
      return NextResponse.json(
        { error: "Missing file, propertyId, or propertyType" },
        { status: 400 }
      );
    }

    // Verify user owns the property
    const table = propertyType === "home" ? "homes" : "hostels";
    const ownerField = propertyType === "home" ? "owner_id" : "manager_id";

    const { data: property } = await supabase
      .from(table)
      .select("id")
      .eq("id", propertyId)
      .eq(ownerField, user.id)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate safe path using UUID to prevent path traversal
    const buffer = Buffer.from(await file.arrayBuffer());
    const safePath = `${propertyType}/${propertyId}/${crypto.randomUUID()}.jpg`;
    const { error, data } = await supabase.storage
      .from("listing-images")
      .upload(safePath, buffer, { upsert: false });

    if (error) {
      console.error("Storage error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(safePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: safePath,
    });
  } catch (err: any) {
    console.error("Upload API error:", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
