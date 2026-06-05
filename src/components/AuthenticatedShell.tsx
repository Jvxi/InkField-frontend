import { Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { ProjectProvider } from "../context/ProjectContext";
import { getAuthToken } from "../utils/authStorage";

export default function AuthenticatedShell(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const token = getAuthToken();

  if (isLoading) {
    return (
      <div className="auth-page auth-page--loading">
        <div className="auth-page-card">
          <h1>砚田</h1>
          <p>正在验证登录状态…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !token) {
    return <></>;
  }

  return (
    <ProjectProvider>
      <Outlet />
    </ProjectProvider>
  );
}
