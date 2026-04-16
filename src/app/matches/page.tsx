"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Drawer from "@/components/Drawer";
import { format } from "date-fns";
import { Plus, MapPin, Users, CircleDollarSign } from "lucide-react";
import { cycleTeam } from "@/utils/teams";

interface Player {
  id: string;
  name: string;
}

interface Match {
  id: string;
  date: string;
  location: string | null;
  totalCost: number;
  notes: string | null;
  cancelledAt: string | null;
  goalkeeperFree: boolean;
  matchPlayers: { isGoalkeeper: boolean; player: Player }[];
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [costMode, setCostMode] = useState<"total" | "perPlayer">("total");
  const [totalCost, setTotalCost] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [goalkeeperFree, setGoalkeeperFree] = useState(false);
  const [goalkeeperPlayerIds, setGoalkeeperPlayerIds] = useState<string[]>([]);
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [team1Name, setTeam1Name] = useState("Takım 1");
  const [team2Name, setTeam2Name] = useState("Takım 2");
  const [playerTeams, setPlayerTeams] = useState<Record<string, 1 | 2>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [matchRes, playerRes] = await Promise.all([fetch("/api/matches"), fetch("/api/players")]);
    setMatches(await matchRes.json());
    setPlayers(await playerRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setLocation("");
    setCostMode("total");
    setTotalCost("");
    setNotes("");
    setSelectedPlayerIds([]);
    setGoalkeeperFree(false);
    setGoalkeeperPlayerIds([]);
    setTeamsEnabled(false);
    setTeam1Name("Takım 1");
    setTeam2Name("Takım 2");
    setPlayerTeams({});
    setShowCreate(true);
  };

  const handleCycleTeam = (id: string) => {
    setPlayerTeams((prev) => cycleTeam(prev, id));
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      setGoalkeeperPlayerIds((gk) => gk.filter((gkId) => next.includes(gkId)));
      return next;
    });
  };

  const toggleGoalkeeper = (id: string) => {
    setGoalkeeperPlayerIds((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const payingCount = goalkeeperFree && goalkeeperPlayerIds.length
    ? selectedPlayerIds.filter((id) => !goalkeeperPlayerIds.includes(id)).length
    : selectedPlayerIds.length;

  const computedTotal = costMode === "perPlayer" && totalCost && payingCount > 0
    ? Number(totalCost) * payingCount
    : Number(totalCost);

  const perPlayer = payingCount > 0 && totalCost
    ? costMode === "perPlayer" ? Number(totalCost).toFixed(2) : (Number(totalCost) / payingCount).toFixed(2)
    : null;

  const handleCreate = async () => {
    if (!date || !totalCost || selectedPlayerIds.length === 0) return;
    setSaving(true);
    await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date, location, totalCost: computedTotal, notes, playerIds: selectedPlayerIds,
        goalkeeperFree, goalkeeperPlayerIds: goalkeeperFree ? goalkeeperPlayerIds : [],
        ...(costMode === "perPlayer" && { perPlayerAmount: Number(totalCost) }),
        ...(teamsEnabled && { team1Name, team2Name, playerTeams }),
      }),
    });
    setShowCreate(false);
    setSaving(false);
    load();
  };

  const handleCancel = async (match: Match) => {
    const isCancelled = !!match.cancelledAt;
    const msg = isCancelled ? "Bu maçın iptali geri alınsın mı?" : "Bu maçı iptal etmek istediğine emin misin?";
    if (!confirm(msg)) return;
    await fetch(`/api/matches/${match.id}`, { method: "PATCH" });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Matches</h1>
          <p className="text-slate-500 text-sm mt-0.5">{matches.length} maç kaydedildi</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Plus size={15} />
          Yeni Maç
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="text-4xl mb-3">🏟️</div>
          <p className="text-slate-500 font-medium">Henüz maç yok.</p>
          <button onClick={openCreate} className="mt-3 text-emerald-600 hover:underline text-sm">
            İlk maçı oluştur
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const payingCount = match.goalkeeperFree
              ? match.matchPlayers.filter((mp) => !mp.isGoalkeeper).length
              : match.matchPlayers.length;
            const perPlayerCost = payingCount > 0 ? (match.totalCost / payingCount).toFixed(0) : "0";

            return (
              <div
                key={match.id}
                className={`bg-white rounded-2xl border p-5 flex items-center justify-between transition-all shadow-sm ${
                  match.cancelledAt ? "opacity-50 border-slate-200" : "border-slate-200 hover:border-emerald-200 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-xl p-3 text-center min-w-[56px] ${match.cancelledAt ? "bg-slate-100" : "bg-emerald-50"}`}>
                    <p className={`text-xs font-bold uppercase ${match.cancelledAt ? "text-slate-400" : "text-emerald-600"}`}>
                      {format(new Date(match.date), "MMM")}
                    </p>
                    <p className={`text-xl font-bold leading-tight ${match.cancelledAt ? "text-slate-400" : "text-emerald-800"}`}>
                      {format(new Date(match.date), "d")}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/matches/${match.id}`}
                        className={`font-semibold text-base ${match.cancelledAt ? "line-through text-slate-400" : "text-slate-800 hover:text-emerald-600"}`}
                      >
                        {match.location || "Futbol"}
                      </Link>
                      {match.cancelledAt && (
                        <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-medium">İptal</span>
                      )}
                      {match.goalkeeperFree && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">GK Ücretsiz</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Users size={12} /> {match.matchPlayers.length} oyuncu
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <CircleDollarSign size={12} /> ₺{match.totalCost.toFixed(0)}
                      </span>
                      {match.location && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin size={12} /> {match.location}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {match.matchPlayers.map((mp) => mp.player.name).join(", ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {!match.cancelledAt && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400">Kişi başı</p>
                      <p className="font-bold text-slate-800">₺{perPlayerCost}</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleCancel(match)}
                    className={`text-xs border px-3 py-1.5 rounded-xl font-medium transition-colors ${
                      match.cancelledAt
                        ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        : "border-red-200 text-red-400 hover:bg-red-50"
                    }`}
                  >
                    {match.cancelledAt ? "Geri Al" : "İptal Et"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <Drawer title="Yeni Maç" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tarih <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {costMode === "total" ? "Toplam (₺)" : "Kişi başı (₺)"} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCostMode("total")}
                      className={`px-2 py-0.5 ${costMode === "total" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                      Toplam
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostMode("perPlayer")}
                      className={`px-2 py-0.5 ${costMode === "perPlayer" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                      Kişi
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder={costMode === "total" ? "600" : "50"}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Konum (opsiyonel)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Spor Kompleksi"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Oyuncular <span className="text-red-500">*</span>
              </label>
              {players.length === 0 ? (
                <p className="text-sm text-slate-400">Önce oyuncu ekleyin.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-slate-100">
                  {players.map((player) => (
                    <label key={player.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.includes(player.id)}
                        onChange={() => togglePlayer(player.id)}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-slate-700">{player.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {perPlayer && (
                <p className="text-xs text-emerald-700 mt-1.5 font-medium">
                  {costMode === "perPlayer"
                    ? `Toplam: ₺${computedTotal.toFixed(0)} · ₺${perPlayer}/kişi`
                    : `₺${perPlayer}/kişi`}
                  {" "}({payingCount} ödeyici{goalkeeperFree && goalkeeperPlayerIds.length > 0 ? `, ${goalkeeperPlayerIds.length} GK ücretsiz` : ""})
                </p>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={goalkeeperFree}
                  onChange={(e) => {
                    setGoalkeeperFree(e.target.checked);
                    if (!e.target.checked) setGoalkeeperPlayerIds([]);
                  }}
                  className="accent-emerald-600"
                />
                <span className="text-sm font-medium text-slate-700">Kaleci ücretsiz oynar</span>
              </label>
              {goalkeeperFree && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Kaleci(leri) seç</label>
                  {selectedPlayerIds.length === 0 ? (
                    <p className="text-xs text-slate-400">Önce oyuncu seçin.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {players.filter((p) => selectedPlayerIds.includes(p.id)).map((p) => (
                        <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={goalkeeperPlayerIds.includes(p.id)}
                            onChange={() => toggleGoalkeeper(p.id)}
                            className="accent-yellow-500"
                          />
                          <span className="text-sm text-slate-700">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Teams */}
            <div className="border border-slate-200 rounded-xl p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teamsEnabled}
                  onChange={(e) => {
                    setTeamsEnabled(e.target.checked);
                    if (!e.target.checked) setPlayerTeams({});
                  }}
                  className="accent-emerald-600"
                />
                <span className="text-sm font-medium text-slate-700">Takım oluştur</span>
              </label>
              {teamsEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={team1Name}
                      onChange={(e) => setTeam1Name(e.target.value)}
                      placeholder="Takım 1"
                      className="border border-blue-200 bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                    />
                    <input
                      type="text"
                      value={team2Name}
                      onChange={(e) => setTeam2Name(e.target.value)}
                      placeholder="Takım 2"
                      className="border border-orange-200 bg-orange-50 text-orange-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                    />
                  </div>
                  {selectedPlayerIds.length === 0 ? (
                    <p className="text-xs text-slate-400">Önce oyuncu seçin.</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400 mb-1">Oyuncuya tıkla → T1 → T2 → Atsız</p>
                      {players.filter((p) => selectedPlayerIds.includes(p.id)).map((p) => {
                        const t = playerTeams[p.id];
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleCycleTeam(p.id)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors hover:bg-slate-50 border-slate-200"
                          >
                            <span className="text-sm text-slate-700">{p.name}</span>
                            {t === 1 && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{team1Name || "T1"}</span>}
                            {t === 2 && <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{team2Name || "T2"}</span>}
                            {!t && <span className="text-xs text-slate-300">—</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Not (opsiyonel)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ek bilgi..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium">
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !date || !totalCost || selectedPlayerIds.length === 0}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
