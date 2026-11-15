import { ImageResponse } from "next/og";

export const alt =
  "Shipboard: plan the work, track every issue and ship with confidence.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The picture a chat app or a social site shows when someone shares a link
// to Shipboard. It's drawn from this JSX, not from a file we keep.
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 96,
        background: "#fafafa",
        color: "#0a0a0a",
      }}
    >
      <div style={{ fontSize: 112 }}>Shipboard</div>
      <div style={{ marginTop: 24, fontSize: 44, color: "#525252" }}>
        Plan the work, track every issue and ship with confidence.
      </div>
    </div>,
    size,
  );
}
