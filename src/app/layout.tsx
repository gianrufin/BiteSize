import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AutosaveIndicator } from "@/components/AutosaveIndicator";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { Toast } from "@/components/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BiteSize — Split it fair. Pay it easy.",
  description:
    "Scan a receipt, share a QR code, and let everyone claim what they ordered. BiteSize splits the bill automatically.",
  appleWebApp: {
    capable: true,
    title: "BiteSize",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a16" },
  ],
};

// Runs before paint so explicit theme/text-size/motion choices apply immediately,
// instead of flashing the default first. Each setting's "System"/"Default" value
// leaves no attribute set, so the matching media query in globals.css keeps
// handling it.
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('bitesize_settings');
    var settings = stored ? JSON.parse(stored) : {};
    if (settings.theme === 'light' || settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    if (settings.textSize === 'large' || settings.textSize === 'xl') {
      document.documentElement.setAttribute('data-text-size', settings.textSize);
    }
    if (settings.motion === 'reduced') {
      document.documentElement.setAttribute('data-motion', 'reduced');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <OfflineBanner />
        <AutosaveIndicator />
        {children}
        <Toast />
      </body>
    </html>
  );
}
