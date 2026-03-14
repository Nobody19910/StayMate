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
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const path = formData.get("path") as string;

    if (!file || !userId || !path) {
      return NextResponse.json(
        { error: "Missing file, userId, or path" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error, data } = await supabase.storage
      .from("listing-images")
      .upload(path, buffer, { upsert: false });

    if (error) {
      console.error("Storage error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path,
    });
  } catch (err: any) {
    console.error("Upload API error:", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
