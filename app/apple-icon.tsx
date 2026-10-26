import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same look as icon.svg: orange square with an ink border on the cream-grey background.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#E3E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 148, height: 148, background: "#FF5F14", border: "16px solid #1A1B1C" }} />
      </div>
    ),
    { ...size },
  );
}
