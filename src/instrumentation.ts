/**
 * Registro de errores del servidor. Next.js llama a `onRequestError` cuando una página o API falla.
 * Deja una línea JSON fácil de buscar en los logs de Vercel (Runtime Logs) sin exponer nada al visitante.
 * Para alertas por correo o Slack se puede conectar Sentry más adelante sin tocar el resto del código.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  const err = error as { message?: string; digest?: string; stack?: string };
  console.error(
    JSON.stringify({
      level: "error",
      at: new Date().toISOString(),
      method: request.method,
      path: request.path,
      route: context.routePath,
      type: context.routeType,
      message: err?.message ?? String(error),
      digest: err?.digest,
      stack: err?.stack?.split("\n").slice(0, 6).join(" | "),
    })
  );
}
