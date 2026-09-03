// Reason: punto único para variables de entorno públicas (NEXT_PUBLIC_*).
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
} as const;
