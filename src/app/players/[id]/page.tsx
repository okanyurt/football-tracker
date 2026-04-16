"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

interface MatchPlayer {
  id: string;
  amountOwed: number;
  match: {
    id: string;
    date: string;
    location: string | null;
    totalCost: number;
  };
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
}

interface PlayerDetail {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  totalOwed: number;
  totalPaid: number;
  matchPlayers: MatchPlayer[];
  payments: Payment[];
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/players/${id}`);
    if (!res.ok) {
      router.push("/players");
      return;
    }
    const data = await res.json();
    setPlayer(data);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment?")) return;
    await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
    load();
  };

  if (loading || !player) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/players" className="text-green-600 hover:underline text-sm">
          ← Back to Players
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{player.name}</h1>
            {player.phone && <p className="text-gray-500 text-sm mt-0.5">{player.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Balance</p>
            <p
              className={`text-2xl font-bold ${
                player.balance < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              ₺{player.balance.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Stat label="Total Owed" value={`₺${player.totalOwed.toFixed(2)}`} color="red" />
        <Stat label="Total Paid" value={`₺${player.totalPaid.toFixed(2)}`} color="green" />
        <Stat label="Matches Played" value={String(player.matchPlayers.length)} color="blue" />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Match History</h2>
          {player.matchPlayers.length === 0 ? (
            <p className="text-gray-400 text-sm">No matches yet.</p>
          ) : (
            <div className="space-y-2">
              {player.matchPlayers.map((mp) => (
                <div
                  key={mp.id}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <Link
                      href={`/matches/${mp.match.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-green-700"
                    >
                      {format(new Date(mp.match.date), "MMMM d, yyyy")}
                    </Link>
                    {mp.match.location && (
                      <p className="text-xs text-gray-400 mt-0.5">{mp.match.location}</p>
                    )}
                  </div>
                  <span className="text-red-600 font-semibold text-sm">
                    -₺{mp.amountOwed.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Payment History</h2>
          {player.payments.length === 0 ? (
            <p className="text-gray-400 text-sm">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {player.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(payment.date), "MMMM d, yyyy")}
                    </p>
                    {payment.notes && (
                      <p className="text-xs text-gray-400 mt-0.5">{payment.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-semibold text-sm">
                      +₺{payment.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      className="text-gray-300 hover:text-red-500 text-lg leading-none"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "red" | "green" | "blue";
}) {
  const colorMap = {
    red: "bg-red-50 text-red-700",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
