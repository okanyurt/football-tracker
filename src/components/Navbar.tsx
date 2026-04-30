import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();

  const links = [
    { href: "/", label: "Balances" },
    { href: "/players", label: "Players" },
    { href: "/matches", label: "Matches" },
  ];

  return (
    <nav className="bg-green-700 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
            ⚽ Football Tracker
          </Link>
          <div className="flex gap-1">
            {links.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-green-900 text-white"
                    : "hover:bg-green-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
