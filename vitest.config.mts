import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * Pruebas de componente para el frontend.
 *
 * Hasta ahora lo único que se verificaba acá era que compilara. Eso deja pasar
 * todo lo que compila y renderiza mal: un árbol que no agrupa, una lista que
 * pliega lo que no debía, un consecutivo repetido.
 *
 * `jsdom` y no un navegador de verdad: lo que se prueba es qué se renderiza y
 * cómo responde al clic, no cómo se ve. Lo visual sigue siendo mirarlo.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
