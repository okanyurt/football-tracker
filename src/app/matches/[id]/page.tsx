"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { format } from "date-fns";
import { ArrowLeft, CircleDollarSign, Users, UserPlus2, X, Pencil, Check } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cycleTeam } from "@/utils/teams";
import Avatar from "@/components/Avatar";
import type { MatchDetail } from "@/types/matches";
import type { Player } from "@/types/players";
import { getMatch, updateTeams, addParticipants, removeParticipant } from "@/services/matches";
import { getPlayers } from "@/services/players";

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { showError, ToastEl } = useToast();

  // Team editing state
  const [editingTeams, setEditingTeams] = useState(false);
  const [editTeam1Name, setEditTeam1Name] = useState("");
  const [editTeam2Name, setEditTeam2Name] = useState("");
  const [editPlayerTeams, setEditPlayerTeams] = useState<Record<string, 1 | 2>>({});

  const loadMatch = useCallback(async () => {
    const { data, error } = await getMatch(id);
    if (error) { router.push("/matches"); return; }
    setMatch(data!);
  }, [id, router]);

  useEffect(() => {
    const init = async () => {
      const [matchResult, playerResult] = await Promise.all([getMatch(id), getPlayers()]);
      if (matchResult.error) { router.push("/matches"); return; }
      setMatch(matchResult.data!);
      setAllPlayers(playerResult.data ?? []);
      setLoading(false);
    };
    init();
  }, [id, router]);

  const openTeamEdit = () => {
    if (!match) return;
    setEditTeam1Name(match.team1Name || "Takım 1");
    setEditTeam2Name(match.team2Name || "Takım 2");
    const teams: Record<string, 1 | 2> = {};
    match.matchPlayers.forEach((mp) => {
      if (mp.team === 1 || mp.team === 2) teams[mp.playerId] = mp.team;
    });
    setEditPlayerTeams(teams);
    setEditingTeams(true);
  };

  const handleCycleTeam = (pid: string) => {
    setEditPlayerTeams((prev) => cycleTeam(prev, pid));
  };

  const saveTeams = async () => {
    setSaving(true);
    const { error } = await updateTeams(id, { team1Name: editTeam1Name, team2Name: editTeam2Name, playerTeams: editPlayerTeams });
    setSaving(false);
    if (error) { showError(error); return; }
    setEditingTeams(false);
    loadMatch();
  };

  const participantIds = match?.matchPlayers.map((mp) => mp.playerId) ?? [];
  const availablePlayers = allPlayers.filter((p) => !participantIds.includes(p.id));

  const togglePlayer = (pid: string) => {
    setSelectedIds((prev) => prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]);
  };

  const handleAddPlayers = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    const { error } = await addParticipants(id, selectedIds);
    setSaving(false);
    if (error) { showError(error); return; }
    setShowAddPlayers(false);
    loadMatch();
  };

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`"${playerName}" bu maçtan çıkarılsın mı?`)) return;
    const { error } = await removeParticipant(id, playerId);
    if (error) { showError(error); return; }
    loadMatch();
  };

  if (loading || !match) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  const payingCount = match.matchPlayers.filter((mp) => mp.amountOwed > 0).length;
  const perPlayer = payingCount > 0 ? match.totalCost / payingCount : 0;
  const hasTeams = !!(match.team1Name || match.team2Name || match.matchPlayers.some((mp) => mp.team));

  const t1Name = match.team1Name || "Takım 1";
  const t2Name = match.team2Name || "Takım 2";
  const team1Players = match.matchPlayers.filter((mp) => mp.team === 1);
  const team2Players = match.matchPlayers.filter((mp) => mp.team === 2);
  const unassigned = match.matchPlayers.filter((mp) => !mp.team);

  return (
    <div className="space-y-6">
      {ToastEl}
      {/* Back + Header */}
      <div>
        <Link href="/matches" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
          <ArrowLeft size={15} />
          Matches
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">
          {match.location || "Futbol"} — {format(new Date(match.date), "d MMMM yyyy")}
        </h1>
        {match.notes && <p className="text-slate-400 text-sm mt-1">{match.notes}</p>}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign size={15} className="text-emerald-200" />
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Toplam</p>
          </div>
          <p className="text-xl font-bold text-white">₺{match.totalCost.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign size={15} className="text-blue-200" />
            <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Kişi Başı</p>
          </div>
          <p className="text-xl font-bold text-white">₺{perPlayer.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users size={15} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Oyuncular</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{match.matchPlayers.length}</p>
        </div>
      </div>

      {/* Teams Section */}
      {!editingTeams ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Takımlar</h2>
            <button
              onClick={openTeamEdit}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              <Pencil size={13} />
              {hasTeams ? "Düzenle" : "Takım Ata"}
            </button>
          </div>

          {!hasTeams ? (
            <div className="p-6 text-center">
              <p className="text-slate-400 text-sm">Henüz takım atanmamış.</p>
              <button onClick={openTeamEdit} className="mt-2 text-emerald-600 text-sm hover:underline">
                Takım oluştur →
              </button>
            </div>
          ) : (
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              {/* Team 1 */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-blue-100/60 border-b border-blue-100">
                  <p className="text-sm font-bold text-blue-700">{t1Name}</p>
                  <p className="text-xs text-blue-400">{team1Players.length} oyuncu</p>
                </div>
                <div className="p-3 space-y-1.5">
                  {team1Players.length === 0 ? (
                    <p className="text-xs text-slate-400 px-1">Oyuncu yok</p>
                  ) : [...team1Players].sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper)).map((mp) => (
                    <div key={mp.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white border border-blue-100">
                      <Avatar name={mp.player.name} size="sm" />
                      <span className="text-sm font-medium text-slate-700 flex-1">{mp.player.name}</span>
                      {mp.isGoalkeeper && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-md">GK</span>}
                      <span className="text-xs text-red-500 font-semibold">₺{mp.amountOwed.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team 2 */}
              <div className="rounded-xl border border-orange-100 bg-orange-50/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-orange-100/60 border-b border-orange-100">
                  <p className="text-sm font-bold text-orange-700">{t2Name}</p>
                  <p className="text-xs text-orange-400">{team2Players.length} oyuncu</p>
                </div>
                <div className="p-3 space-y-1.5">
                  {team2Players.length === 0 ? (
                    <p className="text-xs text-slate-400 px-1">Oyuncu yok</p>
                  ) : [...team2Players].sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper)).map((mp) => (
                    <div key={mp.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white border border-orange-100">
                      <Avatar name={mp.player.name} size="sm" />
                      <span className="text-sm font-medium text-slate-700 flex-1">{mp.player.name}</span>
                      {mp.isGoalkeeper && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-md">GK</span>}
                      <span className="text-xs text-red-500 font-semibold">₺{mp.amountOwed.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unassigned */}
              {unassigned.length > 0 && (
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200">
                    <p className="text-sm font-semibold text-slate-500">Unassigned</p>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2">
                    {[...unassigned].sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper)).map((mp) => (
                      <div key={mp.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200">
                        <Avatar name={mp.player.name} size="sm" />
                        <span className="text-sm text-slate-600">{mp.player.name}</span>
                        {mp.isGoalkeeper && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-md">GK</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Team Edit Mode */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Takım Düzenle</h2>
            <div className="flex gap-2">
              <button onClick={() => setEditingTeams(false)} className="text-xs border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                Vazgeç
              </button>
              <button onClick={saveTeams} disabled={saving} className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                <Check size={13} />
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={editTeam1Name}
                onChange={(e) => setEditTeam1Name(e.target.value)}
                placeholder="Takım 1"
                className="border border-blue-200 bg-blue-50 text-blue-700 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                value={editTeam2Name}
                onChange={(e) => setEditTeam2Name(e.target.value)}
                placeholder="Takım 2"
                className="border border-orange-200 bg-orange-50 text-orange-700 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <p className="text-xs text-slate-400">Oyuncuya tıkla → T1 → T2 → Atamasız</p>
            <div className="space-y-1.5">
              {match.matchPlayers.map((mp) => {
                const t = editPlayerTeams[mp.playerId];
                return (
                  <button
                    key={mp.id}
                    type="button"
                    onClick={() => handleCycleTeam(mp.playerId)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                      t === 1 ? "bg-blue-50 border-blue-200" :
                      t === 2 ? "bg-orange-50 border-orange-200" :
                      "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Avatar name={mp.player.name} size="sm" />
                    <span className="text-sm font-medium text-slate-700 flex-1">{mp.player.name}</span>
                    {t === 1 && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{editTeam1Name || "T1"}</span>}
                    {t === 2 && <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">{editTeam2Name || "T2"}</span>}
                    {!t && <span className="text-xs text-slate-300 px-2.5 py-1">—</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Players Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Tüm Oyuncular</h2>
          {availablePlayers.length > 0 && (
            <button
              onClick={() => { setSelectedIds([]); setShowAddPlayers(true); }}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <UserPlus2 size={15} />
              Oyuncu Ekle
            </button>
          )}
        </div>

        {match.matchPlayers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">Bu maçta henüz oyuncu yok.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Oyuncu</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Borç</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...match.matchPlayers].sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper)).map((mp) => (
                <tr key={mp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={mp.player.name} size="sm" />
                      <div className="flex items-center gap-2">
                        <Link href={`/players/${mp.player.id}`} className="font-medium text-slate-800 hover:text-emerald-600 transition-colors">
                          {mp.player.name}
                        </Link>
                        {mp.isGoalkeeper && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-md">GK</span>}
                        {mp.team === 1 && <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{t1Name}</span>}
                        {mp.team === 2 && <span className="text-xs font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{t2Name}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-bold text-sm bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
                      ₺{mp.amountOwed.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleRemovePlayer(mp.player.id, mp.player.name)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Çıkar"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddPlayers && (
        <Modal title="Oyuncu Ekle" onClose={() => setShowAddPlayers(false)}>
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
              {availablePlayers.map((player) => (
                <label key={player.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(player.id)}
                    onChange={() => togglePlayer(player.id)}
                    className="accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700">{player.name}</span>
                </label>
              ))}
            </div>
            {selectedIds.length > 0 && match.totalCost > 0 && (
              <p className="text-xs text-emerald-700 font-medium">
                Yeni kişi başı: ₺{(match.totalCost / (match.matchPlayers.length + selectedIds.length)).toFixed(0)}
                {" "}({match.matchPlayers.length + selectedIds.length} oyuncu)
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAddPlayers(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium">
                İptal
              </button>
              <button onClick={handleAddPlayers} disabled={saving || selectedIds.length === 0} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">
                {saving ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
