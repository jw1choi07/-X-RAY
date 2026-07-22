import type { Metadata } from "next";
import { IBM_Plex_Sans_KR, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { SideMenu } from "@/components/side-menu";
import "./globals.css";

// A technical/report typeface, not a default choice — this is the family
// used on actual radiology readouts and lab reports. Ties the type directly
// to the "X-ray reading" concept instead of a neutral UI sans.
const plexSans = IBM_Plex_Sans_KR({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "약관 X-ray",
  description: "이용약관·개인정보처리방침을 AI가 읽고, 위험 조항을 원문 근거와 함께 짚어드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <SideMenu />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
