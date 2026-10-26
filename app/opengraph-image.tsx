import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ledgerly: know where it went. Scan receipts, track spending, stay on budget.";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1A1B1C",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
        }}
      >
        <div style={{ width: 84, height: 84, background: "#FF5F14" }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -2, lineHeight: 0.9 }}>LEDGERLY</div>
          <div style={{ marginTop: 20, fontSize: 36 }}>KNOW WHERE IT WENT.</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
