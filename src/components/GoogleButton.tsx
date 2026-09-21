/** Botón "Continuar con Google". Es un enlace normal: el flujo completo vive en /api/auth/google. */
export function GoogleButton({ next, label = "Continuar con Google" }: { next?: string; label?: string }) {
  const href = `/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <div>
      <a
        href={href}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-ink-700 bg-white px-4 py-3 text-[14px] font-semibold text-carbon transition hover:border-ink-500 hover:bg-ink-900"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.92l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.4v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.36 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.4a12 12 0 0 0 0 10.8l3.96-3.1Z" />
          <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.4 6.6l3.96 3.1A7.16 7.16 0 0 1 12 4.75Z" />
        </svg>
        {label}
      </a>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-400">
        Al continuar aceptas los{" "}
        <a href="/terminos-y-condiciones" target="_blank" className="font-semibold text-brand-600 hover:text-brand-700">
          Términos
        </a>{" "}
        y la{" "}
        <a href="/politica-de-privacidad" target="_blank" className="font-semibold text-brand-600 hover:text-brand-700">
          Política de privacidad
        </a>
        .
      </p>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-ink-500">
      <span className="h-px flex-1 bg-ink-800" />o<span className="h-px flex-1 bg-ink-800" />
    </div>
  );
}
