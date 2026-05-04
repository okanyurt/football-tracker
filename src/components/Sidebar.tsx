import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, LogOut, ChevronLeft, ChevronRight } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/players", label: "Players", icon: Users },
  { href: "/matches", label: "Matches", icon: CalendarDays },
];

interface SidebarProps {
  onLogout?: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ onLogout, collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-slate-900 flex-col z-30 hidden md:flex transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Header */}
        <div className={`border-b border-slate-800 flex items-center ${collapsed ? "px-0 py-5 justify-center" : "px-4 py-5 justify-between"}`}>
          {!collapsed && (
            <Link to="/" className="flex items-center gap-3 min-w-0">
              <img src="/favicon.svg" alt="logo" className="w-9 h-9 rounded-xl shadow-lg shrink-0" />
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight">Football</p>
                <p className="text-slate-500 text-xs">Tracker</p>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link to="/">
              <img src="/favicon.svg" alt="logo" className="w-9 h-9 rounded-xl shadow-lg" />
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
              title="Menüyü Daralt"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-4 space-y-0.5 ${collapsed ? "px-2" : "px-3"}`}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                title={collapsed ? label : undefined}
                className={`flex items-center rounded-xl text-sm font-medium transition-all ${
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-slate-800 py-4 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
          {onLogout && (
            <button
              onClick={onLogout}
              title={collapsed ? "Çıkış Yap" : undefined}
              className={`flex items-center w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all ${
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              }`}
            >
              <LogOut size={17} strokeWidth={2} />
              {!collapsed && "Çıkış Yap"}
            </button>
          )}
          {collapsed ? (
            <button
              onClick={onToggle}
              className="flex items-center justify-center w-full p-2.5 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              title="Menüyü Genişlet"
            >
              <ChevronRight size={16} />
            </button>
          ) : (
            <p className="text-slate-700 text-xs px-3">v1.0.11</p>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex md:hidden z-30">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} strokeWidth={2} />
            Çıkış
          </button>
        )}
      </nav>
    </>
  );
}
