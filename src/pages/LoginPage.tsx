import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import BrandMark from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import { useFadeReveal } from "../hooks/useAnimeReveal";

export default function LoginPage(): JSX.Element {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useFadeReveal<HTMLElement>([]);

  if (isAuthenticated) {
    return <Navigate to="/books" replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-page-bg" aria-hidden />
      <section ref={cardRef} className="auth-page-card">
        <header className="auth-page-header">
          <div className="auth-page-brand">
            <BrandMark size={48} className="brand-mark--lg" />
            <div>
              <p className="eyebrow">砚田</p>
              <h1>欢迎回来</h1>
            </div>
          </div>
          <p className="auth-page-subtitle">登录后可管理书库、大纲与 AI 续写。</p>
        </header>

        <form
          className="auth-page-form"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              try {
                setIsSubmitting(true);
                setErrorText("");
                await login(email.trim(), password);
                navigate("/books", { replace: true });
              } catch (error) {
                setErrorText(error instanceof Error ? error.message : "登录失败");
              } finally {
                setIsSubmitting(false);
              }
            })();
          }}
        >
          <div className="auth-field">
            <label htmlFor="login-email">邮箱</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="login-password">密码</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {errorText ? <p className="auth-hint auth-hint--error">{errorText}</p> : null}
          <button className="primary-button auth-submit-btn" disabled={isSubmitting} type="submit">
            {isSubmitting ? "登录中…" : "登录"}
          </button>
        </form>

        <p className="auth-page-footer">
          还没有账号？<Link to="/register">去注册</Link>
        </p>
      </section>
    </div>
  );
}
