import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { bannerAutoDismiss, pulseSuccess, shakeElement } from "../animations/motion";
import AnnouncementModal from "./AnnouncementModal";
import BookSwitcher from "./BookSwitcher";
import BrandMark from "./BrandMark";
import PageTransition from "./PageTransition";
import SettingsModal from "./SettingsModal";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { useAppShellEnter, useFadeReveal, useTextReveal } from "../hooks/useAnimeReveal";

const NAV_ITEMS_ALL = [
  { to: "/books", label: "书库" },
  { to: "/book", label: "书籍信息" },
  { to: "/book/bootstrap", label: "灵感向导", requiresOutline: false },
  { to: "/onboarding", label: "开书问卷", requiresOutline: false },
  { to: "/outline", label: "大纲" },
  { to: "/characters", label: "角色" },
  { to: "/foreshadowing", label: "伏笔" },
  { to: "/write", label: "章节写作" }
] as const;

function isOutlineReady(project: { outlineNodes: { title: string }[]; onboarding: { completed: boolean } } | null | undefined): boolean {
  if (!project) return false;
  const nodes = project.outlineNodes ?? [];
  if (nodes.length === 0) return false;
  return nodes.some(n => n.title && n.title.trim().length > 0);
}

function LibraryShell(props: { children: React.ReactNode }): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const shellRef = useFadeReveal<HTMLDivElement>([]);

  return (
    <div ref={shellRef} className="app-shell app-shell--lite">
      <header className="topbar topbar--lite">
        <div className="topbar-brand">
          <BrandMark size={32} />
          <div>
            <p className="eyebrow">砚田</p>
            <h1>我的书库</h1>
          </div>
        </div>
        <div className="toolbar">
          {user ? <span className="status-chip">{user.email}</span> : null}
          <button
            className="secondary-button"
            onClick={() =>
              void (async () => {
                await logout();
                navigate("/login", { replace: true });
              })()
            }
            type="button"
          >
            退出登录
          </button>
        </div>
      </header>
      <main className="page-content page-content--wide">
        <PageTransition>{props.children}</PageTransition>
      </main>
    </div>
  );
}

export default function AppLayout(): JSX.Element {
  const {
    project,
    books,
    statusText,
    errorText,
    isSaving,
    hasUnsavedChanges,
    saveProject,
    reloadProject,
    applyProjectUpdate
  } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const statusChipRef = useRef<HTMLSpanElement>(null);
  const shellReady = Boolean(project);
  const { shellRef, navRef } = useAppShellEnter(shellReady);

  const outlineReady = isOutlineReady(project);
  const navItems = outlineReady
    ? NAV_ITEMS_ALL.filter(item => !('requiresOutline' in item))
    : NAV_ITEMS_ALL;

  useTextReveal<HTMLDivElement>(".topbar-brand h1", [project?.meta.title]);

  useEffect(() => {
    if (!errorText || !errorBannerRef.current) {
      return;
    }
    const isShake = errorText.includes("失败") || errorText.includes("错误");
    if (isShake) {
      const animation = shakeElement(errorBannerRef.current);
      return () => {
        animation?.cancel();
      };
    }
    const cleanup = bannerAutoDismiss(errorBannerRef.current, { holdMs: 6000 });
    return () => {
      cleanup?.();
    };
  }, [errorText]);

  useEffect(() => {
    if (!statusText.startsWith("已保存") || !statusChipRef.current) {
      return;
    }
    const animation = pulseSuccess(statusChipRef.current);
    return () => {
      animation?.cancel();
    };
  }, [statusText]);

  // 抽屉菜单 body scroll lock + Escape 键关闭
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isMobileMenuOpen]);

  const sessionExpired =
    errorText.includes("登录") || errorText.includes("请先登录") || errorText.includes("失效");
  const onBooksPage = location.pathname === "/books";
  const libraryEmpty = books.length === 0;

  if (!project) {
    if (!onBooksPage && !sessionExpired) {
      return <Navigate to="/books" replace />;
    }

    if (onBooksPage || libraryEmpty) {
      return (
        <LibraryShell>
          <Outlet />
        </LibraryShell>
      );
    }

    return (
      <div className="loading-shell">
        <div className="loading-card">
          <div className="auth-page-brand loading-card-brand">
            <BrandMark size={40} className="brand-mark--lg" />
            <h1>砚田</h1>
          </div>
          <p>{statusText}</p>
          {errorText ? <p className="error-text">{errorText}</p> : null}
          <div className="loading-card-actions">
            {sessionExpired ? (
              <button
                className="primary-button"
                onClick={() =>
                  void (async () => {
                    await logout();
                    navigate("/login", { replace: true });
                  })()
                }
                type="button"
              >
                重新登录
              </button>
            ) : (
              <button className="primary-button" onClick={() => navigate("/books", { replace: true })} type="button">
                去书库
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const needsOnboarding = !outlineReady;
  if (needsOnboarding && location.pathname === "/write") {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div ref={shellRef} className="app-shell app-shell-routed">
      {/* 移动端顶部栏 */}
      <header className="mobile-topbar">
        <button
          className="hamburger-button"
          onClick={() => setIsMobileMenuOpen(true)}
          type="button"
          aria-label="打开菜单"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="mobile-topbar-title">{project.meta.title || "未命名作品"}</span>
        <button className="secondary-button compact-button" onClick={() => void saveProject()} type="button">
          {isSaving ? "..." : "保存"}
        </button>
      </header>

      {/* 移动端抽屉菜单 */}
      {isMobileMenuOpen ? (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav className="mobile-menu-drawer" aria-label="移动端导航">
            <div className="mobile-menu-header">
              <BrandMark size={32} />
              <span>砚田</span>
              <button
                className="mobile-menu-close"
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
                aria-label="关闭菜单"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="mobile-menu-nav">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  end={item.to === "/book"}
                  className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={location.pathname === item.to ? "page" : undefined}
                >
                  {item.label}
                  {item.to === "/onboarding" && needsOnboarding ? <span className="nav-badge">15问</span> : null}
                </NavLink>
              ))}
              <div className="mobile-menu-actions">
                <button className="secondary-button" onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }} type="button">
                  AI 设置
                </button>
                <button className="primary-button" disabled={isSaving} onClick={() => { void saveProject(); setIsMobileMenuOpen(false); }} type="button">
                  {isSaving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </nav>
        </>
      ) : null}

      {errorText ? (
        <div ref={errorBannerRef} className="error-banner">
          {errorText}
        </div>
      ) : null}

      <div className="app-body-routed">
        <nav ref={navRef} className="main-nav">
          <div className="nav-header">
            <div className="nav-brand">
              <BrandMark size={28} />
              <div className="nav-brand-text">
                <span className="nav-brand-title">{project.meta.title || "未命名作品"}</span>
                <BookSwitcher />
              </div>
            </div>
          </div>

          <div className="nav-links">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                end={item.to === "/book"}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                to={item.to}
                aria-current={location.pathname === item.to ? "page" : undefined}
              >
                {item.label}
                {item.to === "/onboarding" && needsOnboarding ? <span className="nav-badge">15问</span> : null}
              </NavLink>
            ))}
          </div>

          <div className="nav-footer">
            {user ? <div className="nav-user">{user.email}</div> : null}
            <div className="nav-status" aria-live="polite">
              <span ref={statusChipRef} className="nav-status-text">{statusText}</span>
              {hasUnsavedChanges ? <span className="nav-status-warn">未保存</span> : null}
            </div>
            <div className="nav-actions">
              <button className="nav-action-button" onClick={() => setIsSettingsOpen(true)} type="button">
                AI 设置
              </button>
              <button
                className="nav-action-button nav-action-primary"
                disabled={isSaving}
                onClick={() => void saveProject()}
                type="button"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
            {user ? (
              <button
                className="nav-logout"
                onClick={() =>
                  void (async () => {
                    await logout();
                    navigate("/login", { replace: true });
                  })()
                }
                type="button"
              >
                退出登录
              </button>
            ) : null}
          </div>
        </nav>
        <main className="page-content">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      {isSettingsOpen ? (
        <SettingsModal
          aiSettings={project.aiSettings}
          onClose={() => setIsSettingsOpen(false)}
          onChange={(aiSettings) => applyProjectUpdate((current) => ({ ...current, aiSettings }))}
          onSave={saveProject}
        />
      ) : null}

      <AnnouncementModal />
    </div>
  );
}
