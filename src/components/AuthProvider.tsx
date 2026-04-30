import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

const REFRESH_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes — refresh before 15-min expiry
const PUBLIC_PATHS = ["/login"];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPublic = PUBLIC_PATHS.includes(pathname);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          scheduleRefresh(); // reset timer on success
        } else {
          logout(); // refresh token expired (4h passed) → go to login
        }
      } catch {
        logout();
      }
    }, REFRESH_INTERVAL_MS);
  }, [logout]);

  useEffect(() => {
    if (isPublic) return;

    scheduleRefresh();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPublic, scheduleRefresh]);

  // Login page — no sidebar, no wrapper
  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar onLogout={logout} />
      <main className="md:ml-60 min-h-screen">
        <div className="px-6 py-7 pb-24 md:pb-8 max-w-5xl mx-auto">{children}</div>
      </main>
    </>
  );
}
