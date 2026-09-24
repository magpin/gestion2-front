import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La imagen de producción corre `.next/standalone/server.js`, que trae solo
  // las dependencias que las páginas usan. Ver `Dockerfile`, etapa `produccion`.
  output: "standalone",
};

export default nextConfig;
