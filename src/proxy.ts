import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Enlaces de correo de Supabase que no llegan a /auth/confirm (p. ej. si la URL de
 * redirección no está permitida, Supabase usa la "Site URL"):
 * - ?code=…           → se envía a /auth/confirm para crear la sesión.
 * - ?error_code=…     → enlace vencido, usado o reemplazado: se explica en /recuperar.
 */
function authLanding(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith("/auth/")) return null;
  const errorCode = searchParams.get("error_code");
  if (errorCode || (searchParams.get("error") === "access_denied" && searchParams.has("error_description"))) {
    const url = new URL("/recuperar", request.url);
    url.searchParams.set("error", errorCode === "otp_expired" ? "expired" : "link");
    return NextResponse.redirect(url);
  }
  const code = searchParams.get("code");
  if (code && /^[0-9a-f-]{20,64}$/i.test(code)) {
    const url = new URL("/auth/confirm", request.url);
    url.searchParams.set("code", code);
    url.searchParams.set("next", pathname === "/actualizar-clave" ? "/actualizar-clave" : "/");
    return NextResponse.redirect(url);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  return authLanding(request) ?? updateSession(request);
}

export const config = {
  matcher: [
    // Todo excepto estáticos, imágenes y webhooks (que no usan cookies de sesión)
    "/((?!_next/static|_next/image|favicon.ico|api/payments/.*/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
