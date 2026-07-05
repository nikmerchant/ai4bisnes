import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const UNGU = "#7c3aed";
export const UNGU_CERAH = "#a78bfa";
export const GELAP = "#09090b";
export const FONT =
  "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Latar gelap dengan aurora ungu bernafas — identiti jenama
export const Latar: React.FC<{ children: React.ReactNode; cerah?: boolean }> = ({
  children,
  cerah,
}) => {
  const frame = useCurrentFrame();
  const g1 = Math.sin(frame / 55) * 60;
  const g2 = Math.cos(frame / 70) * 80;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: cerah ? "#fafafa" : GELAP,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: 9999,
          filter: "blur(110px)",
          background: `radial-gradient(circle, ${
            cerah ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.45)"
          }, transparent 65%)`,
          top: -180,
          left: -120,
          transform: `translate(${g1}px, ${g2 / 2}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 640,
          height: 640,
          borderRadius: 9999,
          filter: "blur(110px)",
          background: `radial-gradient(circle, ${
            cerah ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.32)"
          }, transparent 65%)`,
          bottom: -200,
          right: -120,
          transform: `translate(${-g2}px, ${-g1 / 2}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: 70,
          color: cerah ? "#18181b" : "#ffffff",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Kemasukan spring (fade + naik) — sama perasaan dengan fade-up landing
export const Muncul: React.FC<{
  children: React.ReactNode;
  lewat?: number; // frame
  gaya?: React.CSSProperties;
}> = ({ children, lewat = 0, gaya }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - lewat, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [36, 0])}px)`,
        ...gaya,
      }}
    >
      {children}
    </div>
  );
};

export const Tajuk: React.FC<{
  children: React.ReactNode;
  saiz?: number;
  gaya?: React.CSSProperties;
}> = ({ children, saiz = 76, gaya }) => (
  <div
    style={{
      fontSize: saiz,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: -1,
      lineHeight: 1.12,
      textAlign: "center",
      ...gaya,
    }}
  >
    {children}
  </div>
);

export const Aksen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      color: UNGU_CERAH,
      fontStyle: "italic",
      textTransform: "none",
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontWeight: 500,
    }}
  >
    {children}
  </span>
);

export const Sub: React.FC<{ children: React.ReactNode; gaya?: React.CSSProperties }> = ({
  children,
  gaya,
}) => (
  <div
    style={{
      fontSize: 30,
      color: "#a1a1aa",
      textAlign: "center",
      lineHeight: 1.5,
      maxWidth: 900,
      ...gaya,
    }}
  >
    {children}
  </div>
);

export const Logo: React.FC<{ saiz?: number }> = ({ saiz = 84 }) => (
  <div style={{ fontSize: saiz, fontWeight: 800, letterSpacing: -2 }}>
    AI4<span style={{ color: UNGU_CERAH }}>BISNES</span>
  </div>
);

export const Pil: React.FC<{
  children: React.ReactNode;
  isi?: boolean;
  saiz?: number;
}> = ({ children, isi = true, saiz = 30 }) => (
  <div
    style={{
      display: "inline-block",
      padding: `${saiz * 0.55}px ${saiz * 1.5}px`,
      borderRadius: 9999,
      fontWeight: 700,
      fontSize: saiz,
      background: isi ? UNGU : "rgba(255,255,255,0.08)",
      color: "#fff",
      border: isi ? "none" : "1.5px solid rgba(255,255,255,0.25)",
    }}
  >
    {children}
  </div>
);

// Kad putih gaya UI app (untuk mockup prompt/borang)
export const KadUI: React.FC<{
  children: React.ReactNode;
  lebar?: number;
  gaya?: React.CSSProperties;
}> = ({ children, lebar = 760, gaya }) => (
  <div
    style={{
      width: lebar,
      background: "#ffffff",
      color: "#18181b",
      borderRadius: 22,
      padding: 34,
      boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
      textAlign: "left",
      fontSize: 24,
      lineHeight: 1.5,
      ...gaya,
    }}
  >
    {children}
  </div>
);

// Teks menaip berdasarkan frame
export const Taip: React.FC<{
  teks: string;
  mulai?: number;
  cps?: number; // aksara per saat
  gaya?: React.CSSProperties;
}> = ({ teks, mulai = 0, cps = 22, gaya }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(0, Math.floor(((frame - mulai) / fps) * cps));
  const tunjuk = teks.slice(0, n);
  const kursor = n < teks.length && frame % 16 < 9;
  return (
    <span style={gaya}>
      {tunjuk}
      {kursor ? "▌" : ""}
    </span>
  );
};

export const Lencana: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "inline-block",
      background: "#ef4444",
      color: "#fff",
      fontWeight: 800,
      fontSize: 22,
      textTransform: "uppercase",
      letterSpacing: 2,
      padding: "8px 22px",
      borderRadius: 9999,
    }}
  >
    {children}
  </div>
);

export const LangkahBadge: React.FC<{ n: number; label: string }> = ({ n, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
    <div
      style={{
        width: 76,
        height: 76,
        borderRadius: 9999,
        background: UNGU,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 40,
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {n}
    </div>
    <div style={{ fontSize: 44, fontWeight: 800, textTransform: "uppercase" }}>
      {label}
    </div>
  </div>
);

// Baris senarai dengan tick, muncul bergilir
export const Senarai: React.FC<{ items: string[]; mula?: number; sela?: number; saiz?: number }> = ({
  items,
  mula = 10,
  sela = 12,
  saiz = 30,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
    {items.map((x, i) => (
      <Muncul key={x} lewat={mula + i * sela}>
        <div style={{ fontSize: saiz, display: "flex", gap: 14 }}>
          <span style={{ color: UNGU_CERAH, fontWeight: 800 }}>✓</span>
          <span>{x}</span>
        </div>
      </Muncul>
    ))}
  </div>
);
