import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "dreamdeck_session";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cards.scryfall.io https://images.pokemontcg.io https://images.scrydex.com https://static.dotgg.gg https://api.myl.cl https://assets.tcgdex.net https://*.supabase.co https://upload.wikimedia.org https://static.wikia.nocookie.net https://en.onepiece-cardgame.com https://img.pokemondb.net https://i0.wp.com https://i1.wp.com https://i2.wp.com https://bleedingcool.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.scryfall.com https://api.pokemontcg.io https://api.dotgg.gg https://api.myl.cl https://*.supabase.co",
  "frame-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

function securityHeaders(res: NextResponse) {
  res.headers.set("Content-Security-Policy", CSP);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  return res;
}

async function readSession(token: string | undefined) {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: "dreamdeck-tcg",
      audience: "dreamdeck-tcg",
    });
    return payload as { sub?: string; role?: string };
  } catch {
    return null;
  }
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Defensa extra contra CSRF: una petición que modifica datos vía /api debe venir de este mismo sitio.
 * Si el navegador manda Origin (o Sec-Fetch-Site), tiene que coincidir; las peticiones sin esas cabeceras
 * (cron de Vercel con Bearer, herramientas de servidor) no son de navegador y se dejan pasar.
 */
function crossSiteMutation(req: NextRequest): boolean {
  if (!MUTATING.has(req.method) || !req.nextUrl.pathname.startsWith("/api/")) return false;
  if (req.nextUrl.pathname.startsWith("/api/cron/")) return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
      return new URL(origin).host !== host;
    } catch {
      return true;
    }
  }
  const site = req.headers.get("sec-fetch-site");
  return site === "cross-site";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (crossSiteMutation(req)) {
    return securityHeaders(
      NextResponse.json({ error: "Petición bloqueada: origen no permitido." }, { status: 403 })
    );
  }
  const isPanel = pathname.startsWith("/panel");
  const isAccount = pathname.startsWith("/cuenta");
  const isCheckout = pathname === "/checkout";
  const isLogin = pathname === "/ingresar";

  if (!isPanel && !isAccount && !isCheckout && !isLogin) {
    return securityHeaders(NextResponse.next());
  }

  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);

  if ((isPanel || isAccount || isCheckout) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return securityHeaders(NextResponse.redirect(url));
  }

  // El filtro fino de "comprador no entra al panel de vendedor" vive en
  // panel/layout.tsx (con el rol recién leído de la base), no acá: el rol
  // dentro de este JWT puede quedar desactualizado si un admin recién le
  // aprobó la solicitud de vendedor a alguien que no ha vuelto a iniciar
  // sesión, y este middleware no puede refrescarlo sin pegarle a la base.

  if (isLogin && session) {
    const url = req.nextUrl.clone();
    url.pathname = session.role === "BUYER" ? "/cuenta" : "/panel";
    url.search = "";
    return securityHeaders(NextResponse.redirect(url));
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.png$|.*\.svg$).*)"],
};
