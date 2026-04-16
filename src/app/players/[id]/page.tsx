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
    cancelledAt: string | null;
  };
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
  isKasa: boolean;
  cancelledAt: string | null;
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

  const handleCancelPayment = async (payment: Payment) => {
    const isCancelled = !!payment.cancelledAt;
    const msg = isCancelled ? "Bu ödemeyi geri al?" : "Bu ödemeyi iptal et?";
    if (!confirm(msg)) return;
    await fetch(`/api/payments/${payment.id}`, { method: "PATCH" });
    load();
  };

  const handleMahsup = async () => {
    if (!player) return;
    const kasaTotal = player.payments.filter((p) => p.isKasa).reduce((s, p) => s + p.amount, 0);
    if (kasaTotal <= 0) return;
    if (!confirm(`${player.name} için kasadaki ₺${kasaTotal.toFixed(0)} mahsup edilsin mi? Geçmişte kayıt olarak görünecek.`)) return;
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: player.id, amount: -kasaTotal, notes: "Mahsup edildi", isKasa: true }),
    });
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

      {/* Kasa section */}
      {(() => {
        const kasaEntries = player.payments
          .filter((p) => p.isKasa)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const kasaTotal = kasaEntries.reduce((s, p) => s + p.amount, 0);
        return (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-blue-800">Kasa</h2>
                <p className="text-xs text-blue-500 mt-0.5">Kasa geçmişi</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${kasaTotal > 0 ? "text-blue-700" : kasaTotal < 0 ? "text-red-600" : "text-gray-400"}`}>
                  {kasaTotal > 0 ? "+" : ""}₺{kasaTotal.toFixed(0)}
                </p>
                {kasaTotal > 0 && (
                  <button
                    onClick={handleMahsup}
                    className="mt-1 text-xs text-orange-500 hover:text-orange-700 underline"
                  >
                    Mahsup Et
                  </button>
                )}
              </div>
            </div>
            {kasaEntries.length === 0 ? (
              <p className="text-blue-400 text-sm">Kasa geçmişi yok.</p>
            ) : (
              <div className="space-y-2">
                {kasaEntries.map((p) => {
                  const isDeposit = p.amount > 0;
                  return (
                    <div key={p.id} className="bg-white border border-blue-100 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg leading-none ${isDeposit ? "text-blue-400" : "text-orange-400"}`}>
                          {isDeposit ? "↑" : "↓"}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{format(new Date(p.date), "d MMMM yyyy")}</p>
                          {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${isDeposit ? "text-blue-600" : "text-orange-500"}`}>
                          {isDeposit ? "+" : ""}₺{p.amount.toFixed(0)}
                        </span>
                        <button
                          onClick={() => handleCancelPayment(p)}
                          className="text-xs border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 px-1.5 py-0.5 rounded transition-colors"
                        >
                          {p.cancelledAt ? "Geri Al" : "İptal"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Match History</h2>
          {player.matchPlayers.length === 0 ? (
            <p className="text-gray-400 text-sm">No matches yet.</p>
          ) : (
            <div className="space-y-2">
              {player.matchPlayers.map((mp) => {
                const isCancelled = !!mp.match.cancelledAt;
                return (
                  <div
                    key={mp.id}
                    className={`border rounded-lg px-4 py-3 flex items-center justify-between ${
                      isCancelled ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/matches/${mp.match.id}`}
                          className={`text-sm font-medium ${isCancelled ? "line-through text-gray-400" : "text-gray-900 hover:text-green-700"}`}
                        >
                          {format(new Date(mp.match.date), "MMMM d, yyyy")}
                        </Link>
                        {isCancelled && (
                          <span className="text-xs bg-red-100 text-red-400 px-1.5 py-0.5 rounded">İptal</span>
                        )}
                      </div>
                      {mp.match.location && (
                        <p className="text-xs text-gray-400 mt-0.5">{mp.match.location}</p>
                      )}
                    </div>
                    <span className={`font-semibold text-sm ${isCancelled ? "line-through text-gray-400" : "text-red-600"}`}>
                      -₺{mp.amountOwed.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Payment History</h2>
          {player.payments.filter((p) => !p.isKasa).length === 0 ? (
            <p className="text-gray-400 text-sm">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {player.payments.filter((p) => !p.isKasa).map((payment) => (
                <div
                  key={payment.id}
                  className={`border rounded-lg px-4 py-3 flex items-center justify-between transition-colors ${
                    payment.cancelledAt ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${payment.cancelledAt ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {format(new Date(payment.date), "MMMM d, yyyy")}
                      </p>
                      {payment.cancelledAt && (
                        <span className="text-xs bg-red-100 text-red-400 px-1.5 py-0.5 rounded">İptal</span>
                      )}
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-gray-400 mt-0.5">{payment.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${payment.cancelledAt ? "line-through text-gray-400" : "text-green-600"}`}>
                      +₺{payment.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleCancelPayment(payment)}
                      className={`text-xs border px-1.5 py-0.5 rounded transition-colors ${
                        payment.cancelledAt
                          ? "border-green-200 text-green-500 hover:bg-green-50"
                          : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500"
                      }`}
                    >
                      {payment.cancelledAt ? "Geri Al" : "İptal"}
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
