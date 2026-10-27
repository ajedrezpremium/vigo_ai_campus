import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 renombró `middleware` a `proxy`. Mantiene la misma semántica:
 * refresca la sesión de Supabase y protege las rutas privadas.
 *
 * Además asigna un `x-request-id` a cada petición para poder correlacionar
 * logs, Sentry y el panel de auditoría.
 */
export async function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  request.headers.set("x-request-id", requestId);

  const withRequestId = (response: NextResponse) => {
    response.headers.set("x-request-id", requestId);
    return response;
  };

  const path = request.nextUrl.pathname;
  // El historial es local al navegador; las solicitudes y el panel requieren
  // cuenta. La demo pública vive en /app y /app/chat.
  const needsAuth =
    path.startsWith("/admin") || path.startsWith("/solicitudes") || path.startsWith("/app") || path === "/login";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !needsAuth) return withRequestId(NextResponse.next({ request }));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPath = path.startsWith("/admin") || path.startsWith("/solicitudes");
  if (protectedPath && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return withRequestId(NextResponse.redirect(redirect));
  }
  return withRequestId(response);
}

export const config = {
  // Todo excepto assets estáticos: así los logs de API y páginas comparten id.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff|woff2)$).*)",
  ],
};
