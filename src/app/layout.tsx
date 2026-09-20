import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
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

// Instrument Serif viene en un solo peso, así que `weight` es obligatorio. La
// itálica se carga aparte —no es una inclinación sintética, es otro dibujo— y
// la landing la usa en la frase final de cada titular.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
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
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
