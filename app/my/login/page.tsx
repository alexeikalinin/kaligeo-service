import { Metadata } from "next"
import MagicLinkForm from "@/components/portal/MagicLinkForm"
import LoginPreview from "@/components/portal/LoginPreview"

export const metadata: Metadata = {
  title: "Войти — KaliGEO",
}

interface Props {
  searchParams: Promise<{ error?: string; sent?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const error = params?.error
  const sent = params?.sent

  return (
    <div
      style={{ minHeight: "100vh", background: "var(--bone)" }}
      className="flex flex-col md:flex-row"
    >
      {/* Left — form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-16 md:py-0 max-w-lg mx-auto md:mx-0 md:max-w-md">
        <a
          href="/"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink)",
            textDecoration: "none",
            marginBottom: "48px",
            display: "block",
          }}
        >
          KaliGEO
        </a>

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(28px,4vw,36px)",
            fontWeight: 400,
            margin: "0 0 8px",
            lineHeight: 1.15,
          }}
        >
          Личный кабинет
        </h1>
        <p style={{ fontSize: "15px", color: "var(--ink-3)", margin: "0 0 32px" }}>
          Введите email — пришлём ссылку для входа.
        </p>

        {sent ? (
          <div
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Ссылка отправлена. Проверьте почту.
          </div>
        ) : (
          <MagicLinkForm error={error} />
        )}

        <p style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "24px" }}>
          Без пароля. Ссылка действительна 15 минут.
        </p>
      </div>

      {/* Right — animated preview (hidden on mobile) */}
      <div
        className="hidden md:flex flex-1 items-center justify-center"
        style={{ background: "var(--bone-2)", padding: "48px" }}
      >
        <LoginPreview />
      </div>
    </div>
  )
}
