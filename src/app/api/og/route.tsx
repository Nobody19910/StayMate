import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Find Your Perfect Home in Ghana";
  const price = searchParams.get("price") || "";
  const city = searchParams.get("city") || "";
  const image = searchParams.get("image") || "";
  const type = searchParams.get("type") || "home"; // "home" | "hostel"

  const subtitle = [city, price].filter(Boolean).join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "#0f0f0f",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background property image (blurred) */}
        {image ? (
          <img
            src={image}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.25,
            }}
          />
        ) : (
          /* Decorative pattern when no image */
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse at 20% 50%, rgba(6,193,103,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(6,193,103,0.08) 0%, transparent 60%)",
            }}
          />
        )}

        {/* Dark gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
            height: "100%",
          }}
        >
          {/* Top — Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#06C167",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              🏠
            </div>
            <span style={{ color: "#ffffff", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px" }}>
              StayMate
            </span>
            <div
              style={{
                marginLeft: "8px",
                background: "rgba(6,193,103,0.2)",
                border: "1px solid rgba(6,193,103,0.4)",
                borderRadius: "20px",
                padding: "4px 12px",
                color: "#06C167",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              {type === "hostel" ? "STUDENT HOSTEL" : "PROPERTY"}
            </div>
          </div>

          {/* Bottom — Property info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {subtitle ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#06C167", fontSize: "16px", fontWeight: 600 }}>
                  📍 {subtitle}
                </span>
              </div>
            ) : null}

            <div
              style={{
                color: "#ffffff",
                fontSize: title.length > 50 ? "38px" : "48px",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-1px",
                maxWidth: "900px",
              }}
            >
              {title}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" }}>
              <div
                style={{
                  background: "#06C167",
                  color: "#000000",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "15px",
                  fontWeight: 700,
                }}
              >
                View Property →
              </div>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
                staymate-eight.vercel.app
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
