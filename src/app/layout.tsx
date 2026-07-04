import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif-aksen",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai4bisnes.com"),
  title: {
    default: "AI4Bisnes — Prompt AI Bahasa Melayu untuk Bisnes Anda",
    template: "%s · AI4Bisnes",
  },
  description:
    "177+ prompt AI dalam Bahasa Melayu yang siap diisi maklumat bisnes anda. Salin, tampal ke ChatGPT atau Claude, dan AI terus faham bisnes anda. Percuma untuk SME Malaysia.",
  keywords: [
    "prompt AI Bahasa Melayu",
    "prompt ChatGPT Melayu",
    "AI untuk bisnes",
    "AI untuk SME Malaysia",
    "prompt marketing Malaysia",
    "ChatGPT untuk perniagaan",
    "Claude AI bisnes",
  ],
  openGraph: {
    type: "website",
    locale: "ms_MY",
    url: "https://ai4bisnes.com",
    siteName: "AI4Bisnes",
    title: "AI4Bisnes — Prompt AI Bahasa Melayu untuk Bisnes Anda",
    description:
      "177+ prompt AI Bahasa Melayu siap diisi maklumat bisnes anda. Untuk SME & usahawan Malaysia.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI4Bisnes — Prompt AI Bahasa Melayu untuk Bisnes Anda",
    description:
      "177+ prompt AI Bahasa Melayu siap diisi maklumat bisnes anda. Untuk SME & usahawan Malaysia.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ms"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
