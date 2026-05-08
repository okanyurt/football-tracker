import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Drawer from "@/components/Drawer";
import Avatar from "@/components/Avatar";
import { UserPlus, Pencil, Trash2, ArrowDownUp, UserX, FileDown } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { Player } from "@/types/players";
import { getPlayers, createPlayer, updatePlayer, deletePlayer, removeFromGroup, addToGroup } from "@/services/players";
import { exportPlayersPdf } from "@/utils/exportPlayersPdf";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"normal" | "exempt" | "removed" | "guest">("normal");
  const [saving, setSaving] = useState(false);
  const [missedSort, setMissedSort] = useState<"none" | "desc" | "asc">("none");
  const [balanceSort, setBalanceSort] = useState<"none" | "desc" | "asc">("none");
  const [nameSort, setNameSort] = useState<"none" | "asc" | "desc">("none");
  const [ratingSort, setRatingSort] = useState<"none" | "desc" | "asc">("none");
  const { showError, ToastEl } = useToast();

  const load = useCallback(async () => {
    const { data, error } = await getPlayers();
    if (error) { showError(error); setLoading(false); return; }
    setPlayers(data!);
    setLoading(false);
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const playerStatus = (p: Player) =>
    p.isGuest ? "guest" : p.removedFromGroup ? "removed" : p.isExempt ? "exempt" : "normal";

  // "Gruptan Çıktı" seçeneği sadece şu an grupta olan oyuncuları düzenlerken gösterilir
  const showRemovedOption = editPlayer ? editPlayer.inGroup : false;

  const openAdd = () => {
    setName(""); setPhone(""); setStatus("normal"); setShowAdd(true);
  };

  const openEdit = (player: Player) => {
    setEditPlayer(player);
    setName(player.name);
    setPhone(player.phone || "");
    setStatus(playerStatus(player));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const flags = {
      isExempt: status === "exempt",
      isGuest: status === "guest",
      removedFromGroup: status === "removed",
    };
    if (editPlayer) {
      const { error } = await updatePlayer(editPlayer.id, name, phone, flags.isExempt, undefined, flags.isGuest, flags.removedFromGroup);
      setSaving(false);
      if (error) { showError(error); return; }
      setEditPlayer(null);
    } else {
      const { error } = await createPlayer(name, phone, flags);
      setSaving(false);
      if (error) { showError(error); return; }
      setShowAdd(false);
    }
    load();
  };

  const handleDelete = async (id: string, playerName: string) => {
    if (!confirm(`"${playerName}" silinsin mi? Tüm geçmişi de silinecek.`)) return;
    const { error } = await deletePlayer(id);
    if (error) { showError(error); return; }
    load();
  };

  const handleRemoveFromGroup = async (player: Player) => {
    const { error } = await removeFromGroup(player);
    if (error) { showError(error); return; }
    load();
  };

  const handleAddToGroup = async (player: Player) => {
    const { error } = await addToGroup(player);
    if (error) { showError(error); return; }
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportPlayersPdf(players)}
            disabled={players.length === 0}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl font-medium text-sm transition-colors disabled:opacity-40"
            title="PDF olarak indir"
          >
            <FileDown size={15} />
            PDF
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            <UserPlus size={15} />
            Oyuncu Ekle
          </button>
        </div>
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
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Tüm Oyuncular</h2>
            <button
              onClick={() => { setMissedSort((v) => v === "none" ? "desc" : v === "desc" ? "asc" : "none"); setBalanceSort("none"); setNameSort("none"); setRatingSort("none"); }}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                missedSort !== "none"
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <ArrowDownUp size={12} />
              {missedSort === "desc" ? "Çok → Az" : missedSort === "asc" ? "Az → Çok" : "Eksik Maç"}
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <button
                    onClick={() => { setNameSort((v) => v === "none" ? "asc" : v === "asc" ? "desc" : "none"); setMissedSort("none"); setBalanceSort("none"); setRatingSort("none"); }}
                    className={`inline-flex items-center gap-1 transition-colors ${nameSort !== "none" ? "text-slate-700" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <ArrowDownUp size={11} />
                    {nameSort === "asc" ? "A → Z" : nameSort === "desc" ? "Z → A" : "İsim"}
                  </button>
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Mevki</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                  <button
                    onClick={() => { setRatingSort((v) => v === "none" ? "desc" : v === "desc" ? "asc" : "none"); setMissedSort("none"); setBalanceSort("none"); setNameSort("none"); }}
                    className={`inline-flex items-center gap-1 transition-colors ${ratingSort !== "none" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <ArrowDownUp size={11} />
                    {ratingSort === "desc" ? "Yük → Düş" : ratingSort === "asc" ? "Düş → Yük" : "Ort."}
                  </button>
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Telefon</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <button
                    onClick={() => { setBalanceSort((v) => v === "none" ? "desc" : v === "desc" ? "asc" : "none"); setMissedSort("none"); setNameSort("none"); setRatingSort("none"); }}
                    className={`inline-flex items-center gap-1 ml-auto transition-colors ${balanceSort !== "none" ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <ArrowDownUp size={11} />
                    {balanceSort === "desc" ? "Çok → Az" : balanceSort === "asc" ? "Az → Çok" : "Bakiye"}
                  </button>
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                if (missedSort !== "none") {
                  return [...players].sort((a, b) => {
                    if (missedSort === "desc") return b.missedStreak - a.missedStreak;
                    if (a.missedStreak === 0 && b.missedStreak > 0) return 1;
                    if (b.missedStreak === 0 && a.missedStreak > 0) return -1;
                    return a.missedStreak - b.missedStreak;
                  });
                }
                if (balanceSort !== "none") {
                  return [...players].sort((a, b) =>
                    balanceSort === "desc" ? b.balance - a.balance : a.balance - b.balance
                  );
                }
                if (ratingSort !== "none") {
                  return [...players].sort((a, b) => {
                    const ra = a.avgRating ?? -1;
                    const rb = b.avgRating ?? -1;
                    return ratingSort === "desc" ? rb - ra : ra - rb;
                  });
                }
                if (nameSort !== "none") {
                  return [...players].sort((a, b) =>
                    nameSort === "asc"
                      ? a.name.localeCompare(b.name, "tr")
                      : b.name.localeCompare(a.name, "tr")
                  );
                }
                return players;
              })().map((player) => (
                <tr key={player.id} className={`transition-colors ${player.removedFromGroup ? "bg-red-50 hover:bg-red-100" : player.isGuest ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-slate-50"}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={player.name} size="sm" />
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-slate-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                          {player.matchCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/players/${player.id}`} className="font-medium text-slate-800 hover:text-emerald-600 transition-colors">
                          {player.name}
                        </Link>
                        {player.isGuest && (
                          <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md leading-none">
                            Misafir
                          </span>
                        )}
                        {player.isExempt && (
                          <span className="text-[11px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md leading-none">
                            Muaf
                          </span>
                        )}
                        {player.removedFromGroup && (
                          <span className="text-[11px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md leading-none">
                            Gruptan Çıktı
                          </span>
                        )}
                        {!player.isExempt && !player.removedFromGroup && !player.isGuest && player.missedStreak > 0 && (
                          <span className="text-[11px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md leading-none">
                            -{player.missedStreak} maç
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    {player.positions
                      ? player.positions.split(",").filter(Boolean).map((p) => (
                          <span key={p} className="inline-block text-[11px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md mr-1">
                            {p}
                          </span>
                        ))
                      : <span className="text-slate-300 text-sm">—</span>
                    }
                  </td>
                  <td className="px-3 py-3.5 text-center hidden sm:table-cell">
                    {player.avgRating != null ? (
                      <span className={`inline-flex items-center justify-center w-10 h-8 rounded-xl text-sm font-bold border ${
                        player.avgRating >= 8 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        player.avgRating >= 6 ? "bg-blue-50 text-blue-700 border-blue-200" :
                        player.avgRating >= 4 ? "bg-orange-50 text-orange-700 border-orange-200" :
                        "bg-red-50 text-red-600 border-red-200"
                      }`}>
                        {player.avgRating % 1 === 0 ? player.avgRating : player.avgRating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
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
                    <div className="flex gap-1 justify-end items-center">
                      <button
                        onClick={() => openEdit(player)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      {!player.inGroup ? (
                        <button
                          onClick={() => handleAddToGroup(player)}
                          className="text-xs font-medium px-2 py-1 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Gruba al"
                        >
                          Gruba Al
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRemoveFromGroup(player)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Gruptan çıkart"
                        >
                          <UserX size={14} />
                        </button>
                      )}
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
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Durum</p>
              <div className={`grid gap-2 ${showRemovedOption ? "grid-cols-2" : "grid-cols-3"}`}>
                {([
                  { label: "Normal",         value: "normal",   color: "slate" },
                  { label: "Muaf",           value: "exempt",   color: "blue"  },
                  ...(showRemovedOption ? [{ label: "Gruptan Çıktı", value: "removed", color: "red" }] : []),
                  { label: "Misafir",        value: "guest",    color: "amber" },
                ] as { label: string; value: "normal" | "exempt" | "removed" | "guest"; color: string }[]).map(({ label, value, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                      status === value
                        ? color === "blue"  ? "bg-blue-50 border-blue-300 text-blue-700"
                        : color === "red"   ? "bg-red-50 border-red-300 text-red-600"
                        : color === "amber" ? "bg-amber-50 border-amber-300 text-amber-700"
                        :                    "bg-slate-100 border-slate-300 text-slate-700"
                        : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
