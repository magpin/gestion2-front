import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La imagen de producción corre `.next/standalone/server.js`, que trae solo
  // las dependencias que las páginas usan. Ver `Dockerfile`, etapa `produccion`.
  output: "standalone",

  // Rutas que cambiaron con el menú nuevo: los enlaces y favoritos viejos
  // siguen llegando. 307 y no 308 a propósito: si hubiera que volver atrás,
  // los navegadores no se quedan con la redirección guardada.
  async redirects() {
    return [
      // Tesorería se partió en dos; la entrada es la parte operativa.
      { source: "/dashboard/tesoreria", destination: "/dashboard/caja-bancos", permanent: false },
      // El PUC y el CIIU quedaron juntos en Referencia.
      { source: "/dashboard/catalogos/puc", destination: "/dashboard/referencia", permanent: false },
      {
        source: "/dashboard/catalogos/ciiu",
        destination: "/dashboard/referencia?catalogo=ciiu",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
