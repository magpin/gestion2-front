import { redirect } from "next/navigation";

export default function Home() {
  // Reason: la raíz siempre entra por login; el proxy (§9.5) redirige a /dashboard si hay sesión.
  redirect("/login");
}
