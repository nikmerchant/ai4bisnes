import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { DURASI } from "./durations";
import { Aksen, KadUI, Latar, Lencana, Logo, Muncul, Pil, Senarai, Sub, Taip, Tajuk, UNGU, UNGU_CERAH } from "./kit";

const FPS = 30;
const SELA = Math.round(0.45 * FPS); // jeda antara scene

// ---------- Scene 1: Hook — jawapan hambar ----------
const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const capOn = frame > 5.6 * fps;
  const s = spring({ frame: frame - 5.6 * fps, fps, config: { damping: 12 } });
  return (
    <Latar>
      <Muncul>
        <KadUI lebar={860}>
          <div style={{ color: "#71717a", fontSize: 20, marginBottom: 10 }}>Anda → ChatGPT</div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>
            <Taip teks='"tolong buatkan ayat iklan"' mulai={8} cps={16} />
          </div>
          {frame > 2.6 * fps && (
            <div style={{ marginTop: 22, padding: 20, background: "#f4f4f5", borderRadius: 14, color: "#a1a1aa", fontSize: 24 }}>
              <Taip teks="Dapatkan produk berkualiti tinggi kami hari ini! Kepuasan anda adalah keutamaan kami..." mulai={2.7 * fps} cps={38} />
            </div>
          )}
        </KadUI>
      </Muncul>
      {capOn && (
        <div
          style={{
            position: "absolute",
            fontSize: 130,
            fontWeight: 900,
            color: "#ef4444",
            textTransform: "uppercase",
            transform: `rotate(-9deg) scale(${interpolate(s, [0, 1], [2.2, 1])})`,
            opacity: s,
            textShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          Hambar.
        </div>
      )}
    </Latar>
  );
};

// ---------- Scene 2: AI tak kenal bisnes anda ----------
const S2: React.FC = () => (
  <Latar>
    <Muncul>
      <Tajuk>
        AI tu <Aksen>tak kenal</Aksen> bisnes anda
      </Tajuk>
    </Muncul>
    <div style={{ display: "flex", gap: 26, marginTop: 60 }}>
      {["Apa anda jual?", "Siapa pelanggan anda?", "Di mana anda berniaga?"].map((t, i) => (
        <Muncul key={t} lewat={22 + i * 14}>
          <Pil isi={false}>❓ {t}</Pil>
        </Muncul>
      ))}
    </div>
  </Latar>
);

// ---------- Scene 3: Pengenalan ----------
const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <Latar>
      <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`, opacity: s, textAlign: "center" }}>
        <Logo saiz={130} />
      </div>
      <Muncul lewat={26}>
        <Sub gaya={{ marginTop: 36, fontSize: 36, color: "#d4d4d8" }}>
          Platform prompt AI <b style={{ color: "#fff" }}>Bahasa Melayu</b> — dibina khas untuk SME Malaysia
        </Sub>
      </Muncul>
    </Latar>
  );
};

// ---------- Scene 4: Ceritakan bisnes sekali ----------
const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kiraan = Math.round(interpolate(frame, [8.5 * fps, 12 * fps], [0, 177], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const medan = [
    ["Nama bisnes", "Kedai Kopi Pak Man", 1.2],
    ["Produk / servis", "Kopi tarik, roti bakar, nasi lemak", 3.2],
    ["Pelanggan sasaran", "Pekerja pejabat sekitar Bangsar", 5.4],
  ] as const;
  return (
    <Latar>
      <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
        <Muncul>
          <KadUI lebar={640}>
            <div style={{ fontWeight: 800, fontSize: 27, marginBottom: 18 }}>Ceritakan bisnes anda — sekali sahaja</div>
            {medan.map(([label, nilai, t]) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, color: "#71717a", marginBottom: 5 }}>{label}</div>
                <div style={{ border: "2px solid #e4e4e7", borderRadius: 12, padding: "10px 16px", fontSize: 23, minHeight: 46 }}>
                  <Taip teks={nilai} mulai={t * fps} cps={26} />
                </div>
              </div>
            ))}
          </KadUI>
        </Muncul>
        {frame > 8.2 * fps && (
          <Muncul lewat={8.2 * fps}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 150, fontWeight: 900, color: UNGU_CERAH }}>{kiraan}+</div>
              <div style={{ fontSize: 32, fontWeight: 700, maxWidth: 320 }}>prompt terisi secara automatik</div>
            </div>
          </Muncul>
        )}
      </div>
    </Latar>
  );
};

// ---------- Scene 5: Salin → tampal → beza ----------
const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Latar>
      <div style={{ display: "flex", gap: 46, alignItems: "center" }}>
        <Muncul>
          <KadUI lebar={620}>
            <div style={{ fontWeight: 800, fontSize: 25, marginBottom: 12 }}>Idea kandungan seminggu</div>
            <div style={{ fontSize: 21, color: "#3f3f46" }}>
              Berdasarkan bisnes saya <mark style={{ background: "#ede9fe", color: UNGU, fontWeight: 700, padding: "1px 6px", borderRadius: 6 }}>Kedai Kopi Pak Man</mark> yang menjual{" "}
              <mark style={{ background: "#ede9fe", color: UNGU, fontWeight: 700, padding: "1px 6px", borderRadius: 6 }}>kopi tarik &amp; nasi lemak</mark>...
            </div>
            <Muncul lewat={1.6 * fps}>
              <div style={{ marginTop: 20 }}>
                <Pil saiz={21}>Salin &amp; Buka ChatGPT ↗</Pil>
              </div>
            </Muncul>
          </KadUI>
        </Muncul>
        {frame > 4.4 * fps && (
          <Muncul lewat={4.4 * fps}>
            <KadUI lebar={560} gaya={{ background: "#18181b", color: "#fafafa" }}>
              <div style={{ color: "#a1a1aa", fontSize: 19, marginBottom: 10 }}>ChatGPT menjawab...</div>
              <div style={{ fontSize: 22, lineHeight: 1.6 }}>
                <Taip teks="Isnin: 'Pagi Bangsar! Kopi tarik panas menanti korang ☕' — post gambar stim kopi jam 7.30 pagi, waktu orang pejabat keluar rumah..." mulai={4.7 * fps} cps={34} />
              </div>
            </KadUI>
          </Muncul>
        )}
      </div>
    </Latar>
  );
};

// ---------- Scene 6: Kategori Malaysia ----------
const S6: React.FC = () => (
  <Latar>
    <Muncul>
      <Tajuk saiz={56}>
        Semuanya <Aksen>konteks Malaysia</Aksen>
      </Tajuk>
    </Muncul>
    <div style={{ display: "flex", gap: 30, marginTop: 56 }}>
      {[
        ["🍜", "Kedai Makan", "Prompt halal JAKIM & GrabFood"],
        ["🛍️", "Kedai Online", "Skrip live selling TikTok & Shopee"],
        ["🏗️", "Kontraktor", "Template sebut harga & VO"],
      ].map(([e, t, d], i) => (
        <Muncul key={t} lewat={i * 3.6 * FPS + 12}>
          <div
            style={{
              width: 360,
              background: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(167,139,250,0.4)",
              borderRadius: 24,
              padding: 34,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 80 }}>{e}</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 14 }}>{t}</div>
            <div style={{ fontSize: 23, color: "#a1a1aa", marginTop: 10 }}>{d}</div>
          </div>
        </Muncul>
      ))}
    </div>
  </Latar>
);

// ---------- Scene 7: Pro & Max ----------
const S7: React.FC = () => (
  <Latar>
    <div style={{ display: "flex", gap: 36 }}>
      <Muncul lewat={10}>
        <div style={{ width: 500, borderRadius: 26, padding: 38, background: `linear-gradient(135deg, ${UNGU}, #5b21b6)`, color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 42, fontWeight: 800 }}>⚡ PRO</div>
            <Lencana>RM49/bln</Lencana>
          </div>
          <div style={{ fontSize: 25, marginTop: 16, fontWeight: 700 }}>Pek Kempen Bulanan — siap guna:</div>
          <div style={{ marginTop: 14 }}>
            <Senarai items={["Raya · Merdeka · 11.11", "Post, iklan, emel, WhatsApp", "58+ prompt pemasaran lanjutan"]} mula={30} sela={16} saiz={25} />
          </div>
        </div>
      </Muncul>
      <Muncul lewat={9 * FPS}>
        <div style={{ width: 500, borderRadius: 26, padding: 38, background: "#0a0a0a", color: "#fff", border: `3px solid ${UNGU}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 42, fontWeight: 800 }}>🏆 MAX</div>
            <Lencana>RM69/bln</Lencana>
          </div>
          <div style={{ fontSize: 25, marginTop: 16, fontWeight: 700, color: UNGU_CERAH }}>Coach pemasaran AI peribadi</div>
          <div style={{ marginTop: 14 }}>
            <Senarai items={["12 sesi coaching berstruktur", "Bina offer & skrip closing", "Kenal bisnes anda luar dalam"]} mula={9 * FPS + 20} sela={16} saiz={25} />
          </div>
        </div>
      </Muncul>
    </div>
  </Latar>
);

// ---------- Scene 8: CTA ----------
const S8: React.FC = () => (
  <Latar>
    <Muncul>
      <Logo saiz={100} />
    </Muncul>
    <Muncul lewat={16}>
      <div style={{ fontSize: 52, fontWeight: 800, marginTop: 34, color: "#e4e4e7" }}>ai4bisnes.com</div>
    </Muncul>
    <Muncul lewat={34}>
      <div style={{ marginTop: 40 }}>
        <Pil saiz={36}>DAFTAR PERCUMA — 2 MINIT</Pil>
      </div>
    </Muncul>
    <Muncul lewat={52}>
      <Sub gaya={{ marginTop: 28 }}>Tiada kad kredit diperlukan · Bahasa Melayu sepenuhnya</Sub>
    </Muncul>
  </Latar>
);

const SCENES: [string, React.FC][] = [
  ["promo-01", S1],
  ["promo-02", S2],
  ["promo-03", S3],
  ["promo-04", S4],
  ["promo-05", S5],
  ["promo-06", S6],
  ["promo-07", S7],
  ["promo-08", S8],
];

export const jumlahFramePromo = () =>
  SCENES.reduce((a, [id]) => a + Math.ceil(DURASI[id] * FPS) + SELA, 0) + FPS;

export const Promo: React.FC = () => {
  let dari = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b" }}>
      {SCENES.map(([id, Scene]) => {
        const tempoh = Math.ceil(DURASI[id] * FPS) + SELA;
        const seq = (
          <Sequence key={id} from={dari} durationInFrames={tempoh}>
            <Audio src={staticFile(`audio/${id}.mp3`)} />
            <Scene />
          </Sequence>
        );
        dari += tempoh;
        return seq;
      })}
    </AbsoluteFill>
  );
};
