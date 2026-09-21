import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: la "W" dorada de la marca sobre el fondo oscuro. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080b16",
          borderRadius: 14,
          color: "#f5c451",
          fontSize: 42,
          fontWeight: 800,
        }}
      >
        W
      </div>
    ),
    size
  );
}
