import { ImageResponse } from "next/og";

export const alt = "Win Condition TCG — Compra y vende cartas TCG en Chile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen que se ve al compartir el sitio en WhatsApp, Instagram, Facebook o X. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #080b16 0%, #1a1030 55%, #7a1330 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 700, color: "#f5c451" }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#f5c451" }} />
          MARKETPLACE TCG DE CHILE
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.05 }}>Win Condition TCG</div>
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.78)", lineHeight: 1.25 }}>
            Compra y vende cartas de Magic, Pokémon, One Piece y Mitos y Leyendas
          </div>
        </div>
        <div style={{ display: "flex", gap: 36, fontSize: 28, color: "rgba(255,255,255,0.65)" }}>
          <span>Stock reservado</span>
          <span>Pago por transferencia</span>
          <span>Envíos a todo Chile</span>
        </div>
      </div>
    ),
    size
  );
}
