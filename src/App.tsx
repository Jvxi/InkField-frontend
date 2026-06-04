import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import HomeRedirect from "./components/HomeRedirect";
import AuthenticatedShell from "./components/AuthenticatedShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import BooksPage from "./pages/BooksPage";
import BookBootstrapPage from "./pages/BookBootstrapPage";
import BookOverviewPage from "./pages/BookOverviewPage";
import BookSettingsPage from "./pages/BookSettingsPage";
import ChapterDetailPage from "./pages/ChapterDetailPage";
import CharactersPage from "./pages/CharactersPage";
import ForeshadowingPage from "./pages/ForeshadowingPage";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import OutlinePage from "./pages/OutlinePage";
import RegisterPage from "./pages/RegisterPage";
import WritePage from "./pages/WritePage";

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AuthenticatedShell />}>
              <Route element={<AppLayout />}>
                <Route index element={<HomeRedirect />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/book" element={<BookOverviewPage />} />
                <Route path="/book/bootstrap" element={<BookBootstrapPage />} />
                <Route path="/book/settings" element={<BookSettingsPage />} />
                <Route path="/chapter/:chapterId" element={<ChapterDetailPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/outline" element={<OutlinePage />} />
                <Route path="/characters" element={<CharactersPage />} />
                <Route path="/foreshadowing" element={<ForeshadowingPage />} />
                <Route path="/write" element={<WritePage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
