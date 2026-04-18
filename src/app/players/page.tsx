"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Drawer from "@/components/Drawer";
import Avatar from "@/components/Avatar";
import { UserPlus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface Player {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  totalOwed: number;
  totalPaid: number;
  matchCount: number;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const { showError, ToastEl } = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/players");
    if (!res.ok) { showError("Oyuncular yüklenemedi"); setLoading(false); return; }
    setPlayers(await res.json());
    setLoading(false);
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setName("");
    setPhone("");
    setShowAdd(true);
  };

  const openEdit = (player: Player) => {
    setEditPlayer(player);
    setName(player.name);
    setPhone(player.phone || "");
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (editPlayer) {
      const res = await fetch(`/api/players/${editPlayer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      setSaving(false);
      if (!res.ok) { const d = await res.json().catch(() => ({})); showError(d.error || "Oyuncu güncellenemedi"); return; }
      setEditPlayer(null);
    } else {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      setSaving(false);
      if (!res.ok) { const d = await res.json().catch(() => ({})); showError(d.error || "Oyuncu eklenemedi"); return; }
      setShowAdd(false);
    }
    load();
  };

  const handleDelete = async (id: string, playerName: string) => {
    if (!confirm(`"${playerName}" silinsin mi? Tüm geçmişi de silinecek.`)) return;
    const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError(d.error || "Oyuncu silinemedi"); return; }
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ToastEl}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Players</h1>
          <p className="text-slate-500 text-sm mt-0.5">{players.length} kayıtlı oyuncu</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <UserPlus size={15} />
          Oyuncu Ekle
        </button>
      </div>

      {players.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-slate-500 font-medium">Henüz oyuncu yok.</p>
          <button onClick={openAdd} className="mt-3 text-emerald-600 hover:underline text-sm">
            İlk oyuncuyu ekle
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Tüm Oyuncular</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">İsim</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Telefon</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Bakiye</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {players.map((player) => (
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
                  <td className="px-5 py-3.5 text-slate-400 text-sm hidden sm:table-cell">
                    {player.phone || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`inline-block font-bold text-sm px-2.5 py-1 rounded-full ${
                        player.balance < 0
                          ? "bg-red-50 text-red-600"
                          : player.balance > 0
                          ? "bg-emerald-50 text-emerald-600"
                          : "text-slate-400"
                      }`}
                    >
                      {player.balance < 0 ? "-" : player.balance > 0 ? "+" : ""}₺{Math.abs(player.balance).toFixed(0)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => openEdit(player)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(player.id, player.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showAdd || editPlayer) && (
        <Drawer
          title={editPlayer ? "Oyuncuyu Düzenle" : "Yeni Oyuncu"}
          onClose={() => { setShowAdd(false); setEditPlayer(null); }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                İsim <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ad soyad"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Telefon (opsiyonel)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowAdd(false); setEditPlayer(null); }}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "Kaydediliyor..." : editPlayer ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
