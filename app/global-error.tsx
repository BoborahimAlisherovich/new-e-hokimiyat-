"use client"

/**
 * Ildiz xato chegarasi — layout'ning o'zi yiqilganda ishlaydi.
 * Bu holatda globals.css ham yuklanmagan bo'lishi mumkin, shuning uchun
 * uslublar inline berilgan.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          color: "#0d1524",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: 16,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#fff",
            border: "1px solid #e3e8f0",
            borderRadius: 16,
            padding: 24,
            textAlign: "center",
            boxShadow: "0 12px 32px -8px rgba(13,21,36,0.12)",
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
            Tizimda xatolik
          </h1>
          <p style={{ fontSize: 14, color: "#5a6a85", margin: "0 0 20px" }}>
            Ilovani yuklab bo‘lmadi. Sahifani qayta yuklab ko‘ring.
          </p>
          {error?.digest && (
            <p
              style={{
                fontSize: 11,
                color: "#5a6a85",
                background: "#f1f4f9",
                borderRadius: 6,
                padding: "4px 8px",
                margin: "0 0 16px",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              height: 44,
              padding: "0 20px",
              border: 0,
              borderRadius: 10,
              background: "#3366ff",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  )
}
