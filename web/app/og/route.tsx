import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const KIND_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  article: { label: "MAQOLA & QO'LLANMA", color: "#3995ff", bg: "rgba(57,149,255,0.16)" },
  video: { label: "VIDEO DARSLIK", color: "#10b981", bg: "rgba(16,185,129,0.16)" },
  news: { label: "TEXNOLOGIYA YANGILIGI", color: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  hub: { label: "BILIMLAR BAZASI", color: "#3995ff", bg: "rgba(57,149,255,0.16)" },
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = (searchParams.get("title") || "Geters — Dasturchilar va IT Media Ekotizimi").slice(0, 120);
  const kind = searchParams.get("kind") || "article";
  const author = (searchParams.get("author") || "Geters Editorial").slice(0, 48);
  const category = (searchParams.get("category") || "IT & Texnologiya").slice(0, 32).toUpperCase();
  const meta = (searchParams.get("meta") || "").slice(0, 40);

  const badge = KIND_LABELS[kind] || KIND_LABELS.article;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0b0c13",
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(57, 149, 255, 0.18), transparent 45%), radial-gradient(circle at 15% 90%, rgba(16, 185, 129, 0.10), transparent 40%)",
          padding: "56px 64px",
          fontFamily: "sans-serif",
          color: "#f8fafc",
        }}
      >
        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#101117",
                border: "1px solid #24252f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3995ff",
                fontSize: "24px",
                fontWeight: 800,
              }}
            >
              G
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                Geters.uz
              </span>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                Bilim. Video Darsliklar. Yangiliklar.
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                padding: "8px 18px",
                borderRadius: "999px",
                backgroundColor: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.color}`,
                letterSpacing: "0.06em",
              }}
            >
              {badge.label}
            </span>
          </div>
        </div>

        {/* Center Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            backgroundColor: "rgba(16, 17, 23, 0.86)",
            border: "1px solid #24252f",
            borderRadius: "24px",
            padding: "42px 48px",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#3995ff",
              letterSpacing: "0.08em",
            }}
          >
            {category}
          </span>
          <div
            style={{
              fontSize: title.length > 72 ? "40px" : "48px",
              fontWeight: 800,
              lineHeight: 1.2,
              color: "#ffffff",
              letterSpacing: "-0.025em",
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom Meta Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #1e202b",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "999px",
                backgroundColor: "#3995ff",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 700,
              }}
            >
              {author.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: "20px", fontWeight: 600, color: "#e2e8f0" }}>
              {author}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "18px", color: "#94a3b8" }}>
            {meta ? <span>{meta}</span> : null}
            <span style={{ color: "#3995ff", fontWeight: 700 }}>geters.uz</span>
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
