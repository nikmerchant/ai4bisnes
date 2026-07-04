import { ImageResponse } from "next/og";

// Imej preview WhatsApp/Facebook/Twitter — dijana secara kod, tiada aset manual
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AI4Bisnes — Prompt AI Bahasa Melayu untuk Bisnes Anda";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #09090b 0%, #1e1b4b 55%, #7c3aed 130%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 6,
            color: "#c4b5fd",
            marginBottom: 24,
          }}
        >
          UNTUK SME & USAHAWAN MALAYSIA
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, display: "flex" }}>
          AI4<span style={{ color: "#a78bfa" }}>BISNES</span>
        </div>
        <div
          style={{
            fontSize: 36,
            marginTop: 28,
            color: "#e4e4e7",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          177+ prompt AI Bahasa Melayu, siap diisi maklumat bisnes anda
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 28,
            fontWeight: 700,
            background: "#7c3aed",
            padding: "16px 48px",
            borderRadius: 999,
          }}
        >
          ai4bisnes.com — Mula Percuma
        </div>
      </div>
    ),
    size
  );
}
