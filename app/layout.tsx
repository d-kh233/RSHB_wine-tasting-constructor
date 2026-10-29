import type { Metadata, Viewport } from "next";
import { Backdrop } from "@/components/ui/Backdrop";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DaVino — конструктор дегустаций", template: "%s · DaVino" },
  applicationName: "DaVino",
  description: "Открытые и слепые дегустации вина: QR-вход для гостей, оценки, итоги и передача в Народный винный рейтинг.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Backdrop />
        {children}
      </body>
    </html>
  );
}
