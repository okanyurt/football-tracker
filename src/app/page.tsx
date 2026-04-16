"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { TrendingDown, Wallet, Users } from "lucide-react";
import Avatar from "@/components/Avatar";

interface Player {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  totalOwed: number;
  totalPaid: number;
  matchCount: number;
}

export default function DashboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<Player | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [kasaModal, setKasaModal] = useState<Player | null>(null);
  const [kasaAmount, setKasaAmount] = useState("");
  const [kasaNotes, setKasaNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/players");
    const data = await res.json();
    setPlayers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePayment = async () => {
    if (!payModal || !payAmount) return;
    setSaving(true);
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: payModal.id, amount: payAmount, notes: payNotes }),
    });
    setPayModal(null);
    setPayAmount("");
    setPayNotes("");
    setSaving(false);
    load();
  };

  const handleKasa = async () => {
    if (!kasaModal || !kasaAmount) return;
    setSaving(true);
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: kasaModal.id, amount: kasaAmount, notes: kasaNotes || "Kasa yüklemesi", isKasa: true }),
    });
    setKasaModal(null);
    setKasaAmount("");
    setKasaNotes("");
    setSaving(false);
    load();
  };

  const sorted = [...players].sort((a, b) => {
    const rank = (p: Player) => (p.balance < 0 ? 0 : p.balance > 0 ? 1 : 2);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return a.balance - b.balance;
  });

  const totalDebt = players.filter((p) => p.balance < 0).reduce((sum, p) => sum + Math.abs(p.balance), 0);
  const totalKasa = players.filter((p) => p.balance > 0).reduce((sum, p) => sum + p.balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">{players.length} kayıtlı oyuncu</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Oyuncular</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{players.length}</p>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-gradient-to-br from-red-500 to-rose-600 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
            <TrendingDown size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-100 uppercase tracking-wider">Toplam Borç</p>
            <p className="text-2xl font-bold text-white mt-0.5">₺{totalDebt.toFixed(0)}</p>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Kasa</p>
            <p className="text-2xl font-bold text-white mt-0.5">+₺{totalKasa.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Player Table */}
      {players.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <div className="text-4xl mb-3">⚽</div>
          <p className="text-slate-500 font-medium">Henüz oyuncu yok.</p>
          <Link href="/players" className="mt-3 inline-block text-sm text-emerald-600 hover:underline">
            Oyuncu ekle →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Oyuncu Bakiyeleri</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Oyuncu</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Borç</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Ödenen</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Bakiye</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((player) => {
                const isDebt = player.balance < 0;
                return (
                  <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar name={player.name} size="sm" />
                          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-slate-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                            {player.matchCount}
                          </span>
                        </div>
                        <Link href={`/players/${player.id}`} className="font-medium text-slate-800 hover:text-emerald-600 transition-colors">
                          {player.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-slate-400 hidden sm:table-cell">
                      ₺{player.totalOwed.toFixed(0)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-slate-400 hidden sm:table-cell">
                      ₺{player.totalPaid.toFixed(0)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`inline-block font-bold text-sm px-2.5 py-1 rounded-full ${
                          isDebt
                            ? "bg-red-50 text-red-600"
                            : player.balance > 0
                            ? "bg-emerald-50 text-emerald-600"
                            : "text-slate-400"
                        }`}
                      >
                        {isDebt ? "-" : player.balance > 0 ? "+" : ""}₺{Math.abs(player.balance).toFixed(0)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex gap-1.5 justify-end">
                        {isDebt && (
                          <button
                            onClick={() => { setPayModal(player); setPayAmount(String(Math.abs(player.balance))); }}
                            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium transition-colors"
                          >
                            Öde
                          </button>
                        )}
                        <button
                          onClick={() => { setKasaModal(player); setKasaAmount(""); }}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-medium transition-colors"
                        >
                          Kasa+
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {kasaModal && (
        <Modal title={`Kasa Yükle — ${kasaModal.name}`} onClose={() => { setKasaModal(null); setKasaAmount(""); setKasaNotes(""); }}>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 text-sm flex justify-between">
              <span className="text-slate-500">Mevcut bakiye</span>
              <span className={`font-bold ${kasaModal.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {kasaModal.balance >= 0 ? "+" : ""}₺{kasaModal.balance.toFixed(2)}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tutar (₺)</label>
              <input
                type="number"
                value={kasaAmount}
                onChange={(e) => setKasaAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Not (opsiyonel)</label>
              <input
                type="text"
                value={kasaNotes}
                onChange={(e) => setKasaNotes(e.target.value)}
                placeholder="Kasa yüklemesi, nakit..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setKasaModal(null); setKasaAmount(""); setKasaNotes(""); }} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium">
                İptal
              </button>
              <button onClick={handleKasa} disabled={saving || !kasaAmount} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {payModal && (
        <Modal title={`Ödeme Al — ${payModal.name}`} onClose={() => { setPayModal(null); setPayAmount(""); setPayNotes(""); }}>
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-3 text-sm flex justify-between">
              <span className="text-slate-500">Mevcut borç</span>
              <span className="font-bold text-red-600">-₺{Math.abs(payModal.balance).toFixed(2)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tutar (₺)</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Not (opsiyonel)</label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Nakit, banka transferi..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setPayModal(null); setPayAmount(""); setPayNotes(""); }} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium">
                İptal
              </button>
              <button onClick={handlePayment} disabled={saving || !payAmount} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
