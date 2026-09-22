import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SincronizarTema } from "@/components/shared/SincronizarTema";
import { COOKIE_EFECTIVO } from "@/lib/tema.constantes";
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

// Claro, oscuro o el del sistema.
//
// El tema vive en `data-theme` del `<html>` —es lo que leen los roles de
// color— y se arma **en el servidor**, con la cookie que deja el botón. Así la
// página nace del color correcto: con la preferencia guardada solo en el
// navegador, el servidor no podría saberla y quien usa oscuro vería un
// destello blanco en cada carga.
//
// Hasta el 22 de septiembre de 2026 el sistema era de tema claro y nada más.
// Cambió porque el diseño llegó en los dos modos y los roles de color ya los
// tenían: mantener el CSS oscuro sin forma de encenderlo era lo peor de las
// dos opciones.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Sin cookie se manda claro, y `SincronizarTema` lo corrige una sola vez
  // en quien tiene el sistema operativo en oscuro.
  const tema = (await cookies()).get(COOKIE_EFECTIVO)?.value === "dark" ? "dark" : "light";

  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full`}
      data-theme={tema}
    >
      <body className="min-h-full">
        <SincronizarTema />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
