import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16: "Proxy" reemplaza a "Middleware" (misma funcionalidad).

/** Entrar tiene dos etapas, y cada una abre distintas puertas. */
const COOKIE_SESION = "sesion";
const COOKIE_EMPRESA = "empresa";

/**
 * Tres niveles de acceso, no dos.
 *
 * Sin token, solo `/login`. Con token de sesión, `/empresa` (entra sola a una empresa). Con
 * empresa elegida, todo lo demás.
 *
 * El nivel intermedio existe porque el token de sesión no puede leer datos
 * contables: el backend aísla por empresa y sin ella las consultas vuelven
 * vacías. Dejar entrar al dashboard en esa etapa mostraría tablas en blanco en
 * vez de decir qué falta.
 */
export function proxy(request: NextRequest) {
  const sesion = request.cookies.get(COOKIE_SESION)?.value;
  const empresa = request.cookies.get(COOKIE_EMPRESA)?.value;
  const { pathname } = request.nextUrl;

  const esLogin = pathname.startsWith("/login");
  const esSelector = pathname.startsWith("/empresa");

  if (esLogin) {
    if (sesion && empresa) return NextResponse.redirect(new URL("/dashboard", request.url));
    if (sesion) return NextResponse.redirect(new URL("/empresa", request.url));
    return NextResponse.next();
  }

  if (!sesion) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Crear la primera empresa ocurre, por definicion, sin empresa elegida. Exigir
  // la cookie aca dejaba al director dando vueltas: `/empresa` lo mandaba a crear
  // una y el proxy lo devolvia a `/empresa`.
  const esAltaDeEmpresa = pathname.startsWith("/configuracion/empresa-nueva");

  if (esSelector || esAltaDeEmpresa) {
    return NextResponse.next();
  }

  // Todo lo demás —dashboard y el resto de la configuración— exige empresa elegida.
  if (!empresa) {
    return NextResponse.redirect(new URL("/empresa", request.url));
  }

  return NextResponse.next();
}

// `/plataforma` queda fuera a proposito: es otro sistema, con otro token y otra
// salida. Si entrara acá, el proxy lo mandaría al login de clientes.
export const config = {
  matcher: ["/dashboard/:path*", "/configuracion/:path*", "/empresa", "/login"],
};
