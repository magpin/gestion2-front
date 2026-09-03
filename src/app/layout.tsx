import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ERP Gestión",
  description: "Sistema de gestión integral",
};

// El sistema es de tema claro y nada más: no hay clase `dark`, ni conmutador,
// ni script anti-parpadeo. Un solo tema es un solo juego de contrastes que
// verificar, y en una pantalla que se mira ocho horas seguidas eso vale más que
// la opción.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
