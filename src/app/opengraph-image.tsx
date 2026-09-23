import { ImageResponse } from "next/og";

/**
 * Lo que se ve cuando pasan el enlace por WhatsApp.
 *
 * La cara de María a la izquierda y la promesa a la derecha, como en
 * `Fuera.dc.html`. Va **plana, sin ondas ni animación**: una imagen estática
 * no puede mover nada, y las ondas quietas son un garabato alrededor de la
 * cara.
 *
 * Los colores van escritos y no como tokens: esto lo dibuja el servidor, que
 * no tiene hoja de estilos. Son los mismos valores de `globals.css` en claro.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Contabilidad auditada por IA";

const TINTA = "#171717";
const HUECO = "#ffffff";
const MARCA = "#f25623";

export default function ImagenParaCompartir() {
  // Las mismas proporciones de siempre, sobre una cara de 280 px.
  const cara = 280;
  const ojo = { width: cara * 0.085, height: cara * 0.22, borderRadius: 999 };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 72,
          padding: "0 110px",
          background: HUECO,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            width: cara,
            height: cara,
            borderRadius: 999,
            background: TINTA,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: cara * 0.26,
            flexShrink: 0,
          }}
        >
          <div style={{ ...ojo, background: HUECO }} />
          <div style={{ ...ojo, background: HUECO }} />
          {/* El punto de la coronilla: acá también, y del mismo naranja. */}
          <div
            style={{
              position: "absolute",
              top: cara * 0.075,
              width: cara * 0.075,
              height: cara * 0.075,
              borderRadius: 999,
              background: MARCA,
            }}
          />
        </div>

        {/* El ancho fijo es lo que parte el titular en dos líneas: sin él,
            satori lo estira hasta salirse de la imagen. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, width: 640 }}>
          <div style={{ fontSize: 62, fontWeight: 600, color: TINTA, lineHeight: 1.15 }}>
            Contabilidad auditada por IA
          </div>
          <div style={{ fontSize: 30, color: "#6b6b6b" }}>ERP Gestión · con María</div>
        </div>
      </div>
    ),
    size,
  );
}
