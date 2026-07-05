import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { DURASI } from "./durations";
import { Aksen, KadUI, LangkahBadge, Latar, Lencana, Logo, Muncul, Pil, Senarai, Sub, Taip, Tajuk, UNGU, UNGU_CERAH } from "./kit";

const FPS = 30;
const SELA = Math.round(0.45 * FPS);

// ---------- 1: Salam ----------
const T1: React.FC = () => (
  <Latar>
    <Muncul>
      <Logo saiz={96} />
    </Muncul>
    <Muncul lewat={18}>
      <Tajuk saiz={56} gaya={{ marginTop: 30 }}>
        Panduan <Aksen>langkah demi langkah</Aksen>
      </Tajuk>
    </Muncul>
    <Muncul lewat={38}>
      <Sub gaya={{ marginTop: 24 }}>Dua minit — dan AI anda terus faham bisnes anda</Sub>
    </Muncul>
  </Latar>
);

// ---------- 2: Langkah 1 — daftar & profil ----------
const T2: React.FC = () => {
  const { fps } = useVideoConfig();
  const medan = [
    ["Nama bisnes", "Butik Alia Collection", 3.0],
    ["Kategori", "Runcit & E-dagang", 5.2],
    ["Produk / servis", "Tudung & pakaian muslimah", 7.0],
    ["Pelanggan sasaran", "Wanita bekerja 25-45 tahun", 9.4],
    ["Lokasi", "Shah Alam, Selangor", 11.6],
  ] as const;
  return (
    <Latar>
      <div style={{ position: "absolute", top: 60, left: 80 }}>
        <Muncul><LangkahBadge n={1} label="Daftar & ceritakan bisnes anda" /></Muncul>
      </div>
      <Muncul lewat={14}>
        <KadUI lebar={720} gaya={{ marginTop: 60 }}>
          {medan.map(([label, nilai, t]) => (
            <div key={label} style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 17, color: "#71717a", marginBottom: 4 }}>{label}</div>
              <div style={{ border: "2px solid #e4e4e7", borderRadius: 11, padding: "8px 15px", fontSize: 21, minHeight: 42 }}>
                <Taip teks={nilai} mulai={t * fps} cps={28} />
              </div>
            </div>
          ))}
        </KadUI>
      </Muncul>
    </Latar>
  );
};

// ---------- 3: Langkah 2 — dashboard ----------
const T3: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Latar>
      <div style={{ position: "absolute", top: 60, left: 80 }}>
        <Muncul><LangkahBadge n={2} label="Dashboard anda" /></Muncul>
      </div>
      <Muncul lewat={20}>
        <KadUI lebar={860} gaya={{ marginTop: 70, padding: 26 }}>
          <div style={{ borderRadius: 14, padding: "16px 22px", background: `linear-gradient(90deg, ${UNGU}, #c026d3)`, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, opacity: 0.85 }}>🎁 BULAN INI</div>
              <div style={{ fontSize: 23, fontWeight: 800 }}>Pek Kempen Bulanan</div>
            </div>
            <div style={{ background: "#fff", color: UNGU, borderRadius: 999, padding: "8px 18px", fontWeight: 800, fontSize: 17 }}>Buka Pek →</div>
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, margin: "18px 0 10px" }}>Library Basic Anda — 90+ prompt</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {["Strategi Bisnes", "Pemasaran", "Jualan", "Kewangan", "Sumber Manusia", "Pelanggan", "Undang-undang", "Khas Kategori Anda"].map((t, i) => (
              <Muncul key={t} lewat={2.6 * fps + i * 10}>
                <div style={{ border: "2px solid #e4e4e7", borderRadius: 999, padding: "7px 18px", fontSize: 18, fontWeight: 600 }}>{t}</div>
              </Muncul>
            ))}
          </div>
        </KadUI>
      </Muncul>
    </Latar>
  );
};

// ---------- 4: Langkah 3 — guna prompt ----------
const T4: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Latar>
      <div style={{ position: "absolute", top: 60, left: 80 }}>
        <Muncul><LangkahBadge n={3} label="Klik prompt — dah siap terisi" /></Muncul>
      </div>
      <Muncul lewat={16}>
        <KadUI lebar={820} gaya={{ marginTop: 60 }}>
          <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 12 }}>Kaji pesaing anda</div>
          <div style={{ fontSize: 21, color: "#3f3f46", lineHeight: 1.6 }}>
            Bandingkan kekuatan dan kelemahan pesaing{" "}
            <mark style={{ background: "#ede9fe", color: UNGU, fontWeight: 700, padding: "1px 7px", borderRadius: 6 }}>Butik Alia Collection</mark>{" "}
            dalam industri <mark style={{ background: "#ede9fe", color: UNGU, fontWeight: 700, padding: "1px 7px", borderRadius: 6 }}>Runcit &amp; E-dagang</mark> di{" "}
            <mark style={{ background: "#ede9fe", color: UNGU, fontWeight: 700, padding: "1px 7px", borderRadius: 6 }}>Shah Alam</mark>: [pesaing 1]...
          </div>
          <div style={{ marginTop: 20, background: "#fafafa", border: "2px dashed #d4d4d8", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 16, color: "#71717a", marginBottom: 6 }}>Lengkapkan prompt anda — pesaing 1:</div>
            <div style={{ fontSize: 21, fontWeight: 600 }}>
              <Taip teks="Tudung Cantik Enterprise" mulai={7.5 * fps} cps={22} />
            </div>
          </div>
        </KadUI>
      </Muncul>
    </Latar>
  );
};

// ---------- 5: Langkah 4 — salin & buka ----------
const T5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Latar>
      <div style={{ position: "absolute", top: 60, left: 80 }}>
        <Muncul><LangkahBadge n={4} label="Salin & buka — satu klik" /></Muncul>
      </div>
      <div style={{ display: "flex", gap: 40, alignItems: "center", marginTop: 50 }}>
        <Muncul lewat={16}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {["Salin", "Salin & Buka ChatGPT ↗", "Salin & Buka Claude ↗"].map((b, i) => (
              <div key={b} style={{ borderRadius: 999, padding: "14px 30px", fontSize: 24, fontWeight: 700, background: i === 1 ? UNGU : "rgba(255,255,255,0.08)", border: i === 1 ? "none" : "1.5px solid rgba(255,255,255,0.25)", transform: i === 1 && frame > 2.5 * fps && frame < 3 * fps ? "scale(0.94)" : "scale(1)" }}>
                {b}
              </div>
            ))}
          </div>
        </Muncul>
        {frame > 3.6 * fps && (
          <Muncul lewat={3.6 * fps}>
            <KadUI lebar={560} gaya={{ background: "#18181b", color: "#fafafa" }}>
              <div style={{ color: "#a1a1aa", fontSize: 18, marginBottom: 8 }}>ChatGPT</div>
              <div style={{ fontSize: 21, lineHeight: 1.6 }}>
                <Taip teks="Baik! Ini analisis pesaing untuk Butik Alia Collection di Shah Alam..." mulai={4 * fps} cps={30} />
              </div>
            </KadUI>
          </Muncul>
        )}
      </div>
    </Latar>
  );
};

// ---------- 6: Langkah 5 — Ajar AI ----------
const T6: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Latar>
      <div style={{ position: "absolute", top: 60, left: 80 }}>
        <Muncul><LangkahBadge n={5} label="Ajar AI anda — rahsia paling power" /></Muncul>
      </div>
      <div style={{ display: "flex", gap: 44, alignItems: "center", marginTop: 56 }}>
        <Muncul lewat={20}>
          <KadUI lebar={620}>
            <div style={{ fontWeight: 800, fontSize: 24 }}>🎓 Arahan Induk anda</div>
            <div style={{ marginTop: 12, fontSize: 18, color: "#52525b", background: "#fafafa", borderRadius: 12, padding: 16, lineHeight: 1.55, fontFamily: "monospace" }}>
              <Taip
                teks={"ARAHAN INDUK — Butik Alia Collection\n\nSaya pemilik Butik Alia Collection, perniagaan Runcit & E-dagang di Shah Alam. Produk: tudung & pakaian muslimah..."}
                mulai={2.2 * fps}
                cps={44}
                gaya={{ whiteSpace: "pre-wrap" }}
              />
            </div>
          </KadUI>
        </Muncul>
        <Muncul lewat={12 * fps}>
          <div style={{ maxWidth: 380 }}>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.3 }}>
              Pasang <Aksen>sekali</Aksen> —
              <br />
              AI ingat <Aksen>selamanya</Aksen>
            </div>
            <Sub gaya={{ textAlign: "left", marginTop: 16, fontSize: 24 }}>Tak payah ulang cerita bisnes anda lagi.</Sub>
          </div>
        </Muncul>
      </div>
    </Latar>
  );
};

// ---------- 7: Langkah 6 — carian & kegemaran ----------
const T7: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Latar>
      <div style={{ position: "absolute", top: 60, left: 80 }}>
        <Muncul><LangkahBadge n={6} label="Cari & simpan kegemaran" /></Muncul>
      </div>
      <Muncul lewat={14}>
        <KadUI lebar={720} gaya={{ marginTop: 40 }}>
          <div style={{ border: "2px solid #e4e4e7", borderRadius: 12, padding: "12px 18px", fontSize: 23, color: "#3f3f46" }}>
            🔍 <Taip teks="live selling" mulai={1.2 * fps} cps={14} />
          </div>
          <Muncul lewat={3.4 * fps}>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", border: "2px solid #ede9fe", background: "#faf5ff", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ fontSize: 21, fontWeight: 700 }}>Skrip live selling</div>
              <div style={{ fontSize: 30, color: "#f59e0b" }}>★</div>
            </div>
          </Muncul>
        </KadUI>
      </Muncul>
    </Latar>
  );
};

// ---------- 8: Upsell PRO ----------
const T8: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Latar>
      <Muncul>
        <div style={{ textAlign: "center" }}>
          <Lencana>Untuk ahli PRO</Lencana>
          <Tajuk saiz={54} gaya={{ marginTop: 18 }}>
            🎁 Pek Kempen <Aksen>Bulanan</Aksen>
          </Tajuk>
        </div>
      </Muncul>
      <div style={{ display: "flex", gap: 44, marginTop: 44, alignItems: "flex-start" }}>
        <Muncul lewat={2 * fps}>
          <div style={{ width: 460, borderRadius: 24, padding: 32, background: `linear-gradient(135deg, ${UNGU}, #c026d3)` }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Setiap bulan, siap tulis:</div>
            <div style={{ marginTop: 14 }}>
              <Senarai items={["Strategi kempen penuh", "Post media sosial", "Skrip iklan", "Emel & WhatsApp"]} mula={2.4 * fps} sela={26} saiz={26} />
            </div>
            <div style={{ marginTop: 16, fontSize: 22, fontWeight: 700, color: "#fce7f3" }}>Raya · Merdeka · 11.11 · Cuti sekolah</div>
          </div>
        </Muncul>
        <Muncul lewat={15 * fps}>
          <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(167,139,250,0.4)", borderRadius: 18, padding: 24, fontSize: 25, fontWeight: 700 }}>+ 58 prompt pemasaran lanjutan</div>
            <div style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(167,139,250,0.4)", borderRadius: 18, padding: 24, fontSize: 25, fontWeight: 700 }}>+ 🗄 Vault simpan hasil kerja</div>
            <Muncul lewat={21 * fps}>
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Pil saiz={30}>RM49 / bulan</Pil>
              </div>
            </Muncul>
          </div>
        </Muncul>
      </div>
    </Latar>
  );
};

// ---------- 9: Upsell MAX ----------
const T9: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Latar>
      <Muncul>
        <div style={{ textAlign: "center" }}>
          <Lencana>Untuk yang serius</Lencana>
          <Tajuk saiz={54} gaya={{ marginTop: 18 }}>
            🏆 Coach <Aksen>Max</Aksen>
          </Tajuk>
          <Sub gaya={{ marginTop: 14 }}>Coach pemasaran AI peribadi anda</Sub>
        </div>
      </Muncul>
      <Muncul lewat={4 * fps}>
        <div style={{ marginTop: 40, width: 780, borderRadius: 24, padding: 34, background: "#0a0a0a", border: `3px solid ${UNGU}` }}>
          <Senarai
            items={["Sesi diagnostik — coach kenal pasti kelemahan bisnes anda", "12 sesi berstruktur: offer, harga, closing, iklan, skala", "Kerja rumah & KPI setiap sesi — macam coach sebenar"]}
            mula={4.5 * fps}
            sela={2.6 * fps}
            saiz={27}
          />
        </div>
      </Muncul>
      <Muncul lewat={16.5 * fps}>
        <div style={{ marginTop: 32, fontSize: 38, fontWeight: 800 }}>
          Tambah <span style={{ color: UNGU_CERAH }}>RM20</span> je dari Pro
        </div>
      </Muncul>
    </Latar>
  );
};

// ---------- 10: Penutup ----------
const T10: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const langkah = ["Mula percuma", "Guna prompt basic", "Ajar AI anda", "Naik taraf bila sedia"];
  return (
    <Latar>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {langkah.map((t, i) => (
          <React.Fragment key={t}>
            <Muncul lewat={i * 1.6 * fps + 10}>
              <Pil isi={i === 3} saiz={24}>{t}</Pil>
            </Muncul>
            {i < 3 && (
              <Muncul lewat={i * 1.6 * fps + 24}>
                <div style={{ fontSize: 34, color: UNGU_CERAH, fontWeight: 800 }}>→</div>
              </Muncul>
            )}
          </React.Fragment>
        ))}
      </div>
      {frame > 8.5 * fps && (
        <Muncul lewat={8.5 * fps}>
          <div style={{ marginTop: 56, textAlign: "center" }}>
            <Logo saiz={76} />
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 14, color: "#d4d4d8" }}>Selamat mencuba! 🚀</div>
          </div>
        </Muncul>
      )}
    </Latar>
  );
};

const SCENES: [string, React.FC][] = [
  ["tutorial-01", T1],
  ["tutorial-02", T2],
  ["tutorial-03", T3],
  ["tutorial-04", T4],
  ["tutorial-05", T5],
  ["tutorial-06", T6],
  ["tutorial-07", T7],
  ["tutorial-08", T8],
  ["tutorial-09", T9],
  ["tutorial-10", T10],
];

export const jumlahFrameTutorial = () =>
  SCENES.reduce((a, [id]) => a + Math.ceil(DURASI[id] * FPS) + SELA, 0) + FPS;

export const Tutorial: React.FC = () => {
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
