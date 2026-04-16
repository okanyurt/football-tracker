"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";

interface Player {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  totalOwed: number;
  totalPaid: number;
}

export default function DashboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<Player | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
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

  const sorted = [...players].sort((a, b) => a.balance - b.balance);
  const totalDebt = players.filter((p) => p.balance < 0).reduce((sum, p) => sum + Math.abs(p.balance), 0);
  const debtorCount = players.filter((p) => p.balance < 0).length;
  const settledCount = players.filter((p) => p.balance >= 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
        <div className="text-4xl mb-3">⚽</div>
        <p className="text-gray-500 font-medium">No players yet.</p>
        <Link href="/players" className="mt-3 inline-block text-sm text-green-600 hover:underline">
          Go add some players →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Players</p>
          <p className="text-2xl font-bold text-gray-800 mt-0.5">{players.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 px-4 py-3">
          <p className="text-xs text-red-400 uppercase tracking-wider">Outstanding Debt</p>
          <p className="text-2xl font-bold text-red-600 mt-0.5">₺{totalDebt.toFixed(0)}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 px-4 py-3">
          <p className="text-xs text-green-500 uppercase tracking-wider">Settled / Owes</p>
          <p className="text-2xl font-bold text-green-700 mt-0.5">
            {settledCount}
            <span className="text-base font-normal text-gray-400 mx-1">/</span>
            <span className="text-red-500">{debtorCount}</span>
          </p>
        </div>
      </div>

      {/* Player table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Owed</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((player) => {
              const isDebt = player.balance < 0;
              return (
                <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${player.id}`}
                      className="font-medium text-gray-900 hover:text-green-700"
                    >
                      {player.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                    ₺{player.totalOwed.toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                    ₺{player.totalPaid.toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${isDebt ? "text-red-600" : "text-green-600"}`}>
                      {isDebt ? "-" : "+"}₺{Math.abs(player.balance).toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isDebt && (
                      <button
                        onClick={() => { setPayModal(player); setPayAmount(String(Math.abs(player.balance))); }}
                        className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-md font-medium transition-colors"
                      >
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {payModal && (
        <Modal title={`Record Payment — ${payModal.name}`} onClose={() => { setPayModal(null); setPayAmount(""); setPayNotes(""); }}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm flex justify-between">
              <span className="text-gray-500">Current balance</span>
              <span className="font-bold text-red-600">₺{payModal.balance.toFixed(2)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₺)</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Cash, bank transfer..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setPayModal(null); setPayAmount(""); setPayNotes(""); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={saving || !payAmount}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
