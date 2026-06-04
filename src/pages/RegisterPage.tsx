import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import BrandMark from "../components/BrandMark";
import { checkCaptcha, fetchCaptcha, sendRegisterCode } from "../api";
import { useAuth } from "../context/AuthContext";
import { useFadeReveal } from "../hooks/useAnimeReveal";

const EMAIL_SUFFIXES = ["@126.com", "@163.com", "@qq.com", "@gmail.com", "@outlook.com", "@foxmail.com"];

function emailLocalPart(email: string): string {
  const at = email.indexOf("@");
  return at >= 0 ? email.slice(0, at) : email;
}

export default function RegisterPage(): JSX.Element {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [captchaId, setCaptchaId] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaHint, setCaptchaHint] = useState("");
  const [captchaStatus, setCaptchaStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [verifiedCaptchaCode, setVerifiedCaptchaCode] = useState("");
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useFadeReveal<HTMLElement>([]);

  const emailSuggestions = useMemo(() => {
    const local = emailLocalPart(email).trim();
    if (!local || email.includes("@")) {
      return [];
    }
    return EMAIL_SUFFIXES.map((suffix) => `${local}${suffix}`);
  }, [email]);

  const canSendCode =
    captchaCode.length === 4 && captchaStatus === "valid" && verifiedCaptchaCode === captchaCode && !emailCodeSent;

  const canRegister =
    emailCodeSent && emailCode.length === 6 && password.length >= 6 && !isSubmitting;

  async function loadCaptcha(): Promise<void> {
    const challenge = await fetchCaptcha();
    setCaptchaId(challenge.captchaId);
    setCaptchaHint(challenge.question);
    setCaptchaCode("");
    setCaptchaStatus("idle");
    setVerifiedCaptchaCode("");
    setEmailCodeSent(false);
  }

  useEffect(() => {
    void loadCaptcha().catch(() => setErrorText("无法加载人机验证"));
  }, []);

  useEffect(() => {
    if (!captchaId || captchaCode.length !== 4) {
      setCaptchaStatus("idle");
      setVerifiedCaptchaCode("");
      return;
    }

    const codeSnapshot = captchaCode;
    const timer = window.setTimeout(() => {
      setCaptchaStatus("checking");
      void checkCaptcha({ captchaId, captchaAnswer: codeSnapshot.trim() })
        .then((result) => {
          if (codeSnapshot !== captchaCode) {
            return;
          }
          if (result.valid) {
            setCaptchaStatus("valid");
            setVerifiedCaptchaCode(codeSnapshot);
          } else {
            setCaptchaStatus("invalid");
            setVerifiedCaptchaCode("");
          }
        })
        .catch(() => {
          if (codeSnapshot === captchaCode) {
            setCaptchaStatus("invalid");
            setVerifiedCaptchaCode("");
          }
        });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [captchaId, captchaCode]);

  if (isAuthenticated) {
    return <Navigate to="/books" replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-page-bg" aria-hidden />
      <section ref={cardRef} className="auth-page-card auth-page-card--register">
        <header className="auth-page-header">
          <div className="auth-page-brand">
            <BrandMark size={48} className="brand-mark--lg" />
            <div>
              <p className="eyebrow">网文助手</p>
              <h1>创建写作账号</h1>
            </div>
          </div>
          <p className="auth-page-subtitle">
            先完成人机验证并发送邮箱验证码（3 分钟内有效），再设置密码完成注册。
          </p>
        </header>

        <form
          className="auth-page-form"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              try {
                setIsSubmitting(true);
                setErrorText("");
                await register(email.trim(), password, emailCode.trim());
                navigate("/books", { replace: true });
              } catch (error) {
                const message = error instanceof Error ? error.message : "注册失败";
                if (message.includes("登录已失效") || message.includes("请先登录")) {
                  setErrorText("注册未完成，请检查邮箱验证码是否过期，或稍后使用相同邮箱直接登录。");
                } else {
                  setErrorText(message);
                }
              } finally {
                setIsSubmitting(false);
              }
            })();
          }}
        >
          <div className="auth-field">
            <label htmlFor="register-email">邮箱</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailCodeSent(false);
              }}
            />
            {emailSuggestions.length > 0 ? (
              <div className="email-suffix-list">
                {emailSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="email-suffix-chip"
                    onClick={() => {
                      setEmail(suggestion);
                      setEmailCodeSent(false);
                    }}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={`auth-field auth-field--captcha ${emailCodeSent ? "auth-field--done" : ""}`}>
            <div className="auth-field-row">
              <label htmlFor="register-captcha">人机验证</label>
              <button
                className="auth-text-button"
                disabled={emailCodeSent}
                onClick={() => void loadCaptcha()}
                type="button"
              >
                换一组
              </button>
              {emailCodeSent ? <span className="auth-done-badge">已用于发信</span> : null}
            </div>
            <div className="captcha-box">
              <div className="captcha-code-block">
                <span className="captcha-code-label">验证码</span>
                <span className="captcha-code" title="请输入右侧 4 位字符">
                  {captchaHint || "加载中"}
                </span>
              </div>
              <div className="captcha-input-wrap">
                <input
                  id="register-captcha"
                  autoComplete="off"
                  disabled={emailCodeSent}
                  maxLength={4}
                  placeholder="4 位字母或数字"
                  value={captchaCode}
                  onChange={(event) => {
                    const next = event.target.value.toUpperCase();
                    setCaptchaCode(next);
                    if (next !== verifiedCaptchaCode) {
                      setCaptchaStatus("idle");
                    }
                  }}
                />
                {captchaStatus === "checking" ? <span className="captcha-pending">校验中…</span> : null}
                {captchaStatus === "valid" && captchaCode === verifiedCaptchaCode ? (
                  <span className="captcha-ok">✓ 验证通过</span>
                ) : null}
                {captchaStatus === "invalid" ? <span className="captcha-bad">不匹配，请重新输入</span> : null}
              </div>
            </div>
            {emailCodeSent ? (
              <p className="auth-field-note">人机验证已用于发送邮件，无需再次填写。</p>
            ) : null}
          </div>

          <div className="auth-field auth-field--code">
            <label htmlFor="register-code">邮箱验证码</label>
            <div className="auth-inline-row">
              <input
                id="register-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="6 位数字"
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, ""))}
              />
              <button
                className="secondary-button auth-send-code-btn"
                disabled={isSendingCode || !canSendCode}
                onClick={() =>
                  void (async () => {
                    try {
                      setIsSendingCode(true);
                      setErrorText("");
                      const result = await sendRegisterCode({
                        email: email.trim(),
                        captchaId,
                        captchaAnswer: captchaCode.trim()
                      });
                      setEmailCodeSent(true);
                      if (result.devCode) {
                        setEmailCode(result.devCode);
                      }
                      setStatusText(
                        result.devCode
                          ? `${result.message}（开发模式已自动填入）`
                          : `${result.message}，请填写邮件中的验证码与密码。`
                      );
                    } catch (error) {
                      setErrorText(error instanceof Error ? error.message : "发送失败");
                    } finally {
                      setIsSendingCode(false);
                    }
                  })()
                }
                type="button"
              >
                {isSendingCode ? "发送中…" : emailCodeSent ? "已发送" : "发送验证码"}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="register-password">密码</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="至少 6 位"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {statusText ? <p className="auth-hint auth-hint--ok">{statusText}</p> : null}
          {errorText ? <p className="auth-hint auth-hint--error">{errorText}</p> : null}

          <button className="primary-button auth-submit-btn" disabled={!canRegister} type="submit">
            {isSubmitting ? "注册中…" : "完成注册并进入"}
          </button>
        </form>

        <p className="auth-page-footer">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </section>
    </div>
  );
}
