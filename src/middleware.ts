import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "comarca_session";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://http2.mlstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cards.scryfall.io https://images.pokemontcg.io https://images.scrydex.com https://static.dotgg.gg https://api.myl.cl https://assets.tcgdex.net https://http2.mlstatic.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://api.mercadopago.com https://api.scryfall.com https://api.pokemontcg.io https://api.dotgg.gg https://api.myl.cl https://*.supabase.co",
  "frame-src 'self' https://www.mercadopago.cl https://sdk.mercadopago.com",
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
      issuer: "comarca-tcg",
      audience: "comarca-tcg",
    });
    return payload as { sub?: string; role?: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPanel = pathname.startsWith("/panel");
  const isLogin = pathname === "/ingresar";

  if (!isPanel && !isLogin) return securityHeaders(NextResponse.next());

  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (isPanel && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return securityHeaders(NextResponse.redirect(url));
  }

  if (isLogin && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/panel";
    url.search = "";
    return securityHeaders(NextResponse.redirect(url));
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.png$|.*\.svg$).*)"],
};
