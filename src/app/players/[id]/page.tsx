"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, TrendingDown, TrendingUp, Shield, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import Avatar from "@/components/Avatar";
import { useToast } from "@/hooks/useToast";

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
  matchCount: number;
  matchPlayers: MatchPlayer[];
  payments: Payment[];
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError, ToastEl } = useToast();

  const load = useCallback(async () => {
    const res = await fetch(`/api/players/${id}`);
    if (!res.ok) { router.push("/players"); return; }
    const data = await res.json();
    setPlayer(data);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const handleCancelPayment = async (payment: Payment) => {
    const msg = payment.cancelledAt ? "Bu ödemeyi geri al?" : "Bu ödemeyi iptal et?";
    if (!confirm(msg)) return;
    const res = await fetch(`/api/payments/${payment.id}`, { method: "PATCH" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError(d.error || "Ödeme güncellenemedi"); return; }
    load();
  };

  const handleMahsup = async () => {
    if (!player) return;
    const kasaTotal = player.payments.filter((p) => p.isKasa).reduce((s, p) => s + p.amount, 0);
    if (kasaTotal <= 0) return;
    if (!confirm(`${player.name} için kasadaki ₺${kasaTotal.toFixed(0)} mahsup edilsin mi?`)) return;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: player.id, amount: -kasaTotal, notes: "Mahsup edildi", isKasa: true }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError(d.error || "Mahsup yapılamadı"); return; }
    load();
  };

  if (loading || !player) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  const kasaEntries = player.payments
    .filter((p) => p.isKasa)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const kasaTotal = kasaEntries.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      {ToastEl}
      {/* Back + Header */}
      <div>
        <Link href="/players" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
          <ArrowLeft size={15} />
          Players
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={player.name} size="lg" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{player.name}</h1>
              {player.phone && <p className="text-slate-400 text-sm mt-0.5">{player.phone}</p>}
            </div>
          </div>
          <div
            className={`px-4 py-2 rounded-2xl text-right ${
              player.balance < 0 ? "bg-red-50" : player.balance > 0 ? "bg-emerald-50" : "bg-slate-100"
            }`}
          >
            <p className="text-xs text-slate-400 mb-0.5">Bakiye</p>
            <p className={`text-2xl font-bold ${player.balance < 0 ? "text-red-600" : player.balance > 0 ? "text-emerald-600" : "text-slate-400"}`}>
              {player.balance < 0 ? "-" : player.balance > 0 ? "+" : ""}₺{Math.abs(player.balance).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={15} className="text-red-200" />
            <p className="text-xs font-semibold text-red-100 uppercase tracking-wider">Toplam Borç</p>
          </div>
          <p className="text-xl font-bold text-white">₺{player.totalOwed.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-emerald-200" />
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Toplam Ödeme</p>
          </div>
          <p className="text-xl font-bold text-white">₺{player.totalPaid.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={15} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Maçlar</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{player.matchCount}</p>
        </div>
      </div>

      {/* Kasa Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Kasa</h2>
            <p className="text-xs text-slate-400 mt-0.5">Kasa geçmişi</p>
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${kasaTotal > 0 ? "text-blue-600" : kasaTotal < 0 ? "text-red-600" : "text-slate-400"}`}>
              {kasaTotal > 0 ? "+" : ""}₺{kasaTotal.toFixed(0)}
            </p>
            {kasaTotal > 0 && (
              <button onClick={handleMahsup} className="text-xs text-orange-500 hover:text-orange-700 underline mt-0.5">
                Mahsup Et
              </button>
            )}
          </div>
        </div>
        <div className="p-5">
          {kasaEntries.length === 0 ? (
            <p className="text-slate-400 text-sm">Kasa geçmişi yok.</p>
          ) : (
            <div className="space-y-2">
              {kasaEntries.map((p) => {
                const isDeposit = p.amount > 0;
                return (
                  <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      {isDeposit
                        ? <ArrowUpCircle size={18} className="text-blue-400 shrink-0" />
                        : <ArrowDownCircle size={18} className="text-orange-400 shrink-0" />
                      }
                      <div>
                        <p className="text-sm font-medium text-slate-700">{format(new Date(p.date), "d MMM yyyy")}</p>
                        {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold text-sm ${isDeposit ? "text-blue-600" : "text-orange-500"}`}>
                        {isDeposit ? "+" : ""}₺{p.amount.toFixed(0)}
                      </span>
                      <button
                        onClick={() => handleCancelPayment(p)}
                        className={`text-xs border px-2 py-1 rounded-lg transition-colors ${
                          p.cancelledAt
                            ? "border-emerald-200 text-emerald-500 hover:bg-emerald-50"
                            : "border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500"
                        }`}
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
      </div>

      {/* History columns */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Maç Geçmişi</h2>
          </div>
          <div className="p-5">
            {player.matchPlayers.length === 0 ? (
              <p className="text-slate-400 text-sm">Henüz maç yok.</p>
            ) : (
              <div className="space-y-2">
                {player.matchPlayers.map((mp) => {
                  const isCancelled = !!mp.match.cancelledAt;
                  return (
                    <div
                      key={mp.id}
                      className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${
                        isCancelled ? "opacity-50 bg-slate-50" : "bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/matches/${mp.match.id}`}
                            className={`text-sm font-medium ${isCancelled ? "line-through text-slate-400" : "text-slate-700 hover:text-emerald-600"}`}
                          >
                            {format(new Date(mp.match.date), "d MMM yyyy")}
                          </Link>
                          {isCancelled && (
                            <span className="text-xs bg-red-100 text-red-400 px-1.5 py-0.5 rounded-md">İptal</span>
                          )}
                        </div>
                        {mp.match.location && <p className="text-xs text-slate-400 mt-0.5">{mp.match.location}</p>}
                      </div>
                      <span className={`font-semibold text-sm ${isCancelled ? "line-through text-slate-400" : "text-red-500"}`}>
                        -₺{mp.amountOwed.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Ödeme Geçmişi</h2>
          </div>
          <div className="p-5">
            {player.payments.filter((p) => !p.isKasa).length === 0 ? (
              <p className="text-slate-400 text-sm">Henüz ödeme yok.</p>
            ) : (
              <div className="space-y-2">
                {player.payments.filter((p) => !p.isKasa).map((payment) => (
                  <div
                    key={payment.id}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${
                      payment.cancelledAt ? "opacity-50 bg-slate-50" : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${payment.cancelledAt ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {format(new Date(payment.date), "d MMM yyyy")}
                        </p>
                        {payment.cancelledAt && (
                          <span className="text-xs bg-red-100 text-red-400 px-1.5 py-0.5 rounded-md">İptal</span>
                        )}
                      </div>
                      {payment.notes && <p className="text-xs text-slate-400 mt-0.5">{payment.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${payment.cancelledAt ? "line-through text-slate-400" : "text-emerald-600"}`}>
                        +₺{payment.amount.toFixed(0)}
                      </span>
                      <button
                        onClick={() => handleCancelPayment(payment)}
                        className={`text-xs border px-2 py-1 rounded-lg transition-colors ${
                          payment.cancelledAt
                            ? "border-emerald-200 text-emerald-500 hover:bg-emerald-50"
                            : "border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500"
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
    </div>
  );
}
