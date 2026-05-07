import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "EatDiscounted — Find every deal at any NYC restaurant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fafaf9 0%, #f5f3f0 50%, #fafaf9 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: "96px",
                fontWeight: 900,
                letterSpacing: "-4px",
                background: "linear-gradient(135deg, #ff6b35, #ec4899, #8b5cf6)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Eat
            </span>
            <span
              style={{
                fontSize: "96px",
                fontWeight: 900,
                letterSpacing: "-4px",
                color: "#1c1917",
              }}
            >
              Discounted
            </span>
          </div>

          <div
            style={{
              width: "120px",
              height: "4px",
              borderRadius: "4px",
              background: "linear-gradient(90deg, #ff6b35, #ec4899, #8b5cf6)",
            }}
          />

          <p
            style={{
              fontSize: "32px",
              fontWeight: 500,
              color: "#57534e",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.4,
            }}
          >
            Find every deal, discount & reward at any NYC restaurant
          </p>

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <span
              style={{
                padding: "8px 20px",
                borderRadius: "100px",
                background: "#f0fdf4",
                color: "#15803d",
                fontSize: "18px",
                fontWeight: 700,
                border: "1px solid #bbf7d0",
              }}
            >
              4 verified APIs
            </span>
            <span
              style={{
                padding: "8px 20px",
                borderRadius: "100px",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: "18px",
                fontWeight: 700,
                border: "1px solid #bfdbfe",
              }}
            >
              8 airline programs
            </span>
            <span
              style={{
                padding: "8px 20px",
                borderRadius: "100px",
                background: "#fff7ed",
                color: "#c2410c",
                fontSize: "18px",
                fontWeight: 700,
                border: "1px solid #fed7aa",
              }}
            >
              Cashback & points
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
