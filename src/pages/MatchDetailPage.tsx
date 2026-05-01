import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Modal from "@/components/Modal";
import { format } from "date-fns";
import {
  ArrowLeft, CircleDollarSign, Users, UserPlus2, X, Pencil, Check,
  Star, Wand2, Trash2, ChevronDown, ChevronUp, Copy, Check as CheckIcon,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cycleTeam } from "@/utils/teams";
import Avatar from "@/components/Avatar";
import type { MatchDetail, MatchRatingData } from "@/types/matches";
import type { Player } from "@/types/players";
import {
  getMatch, updateTeams, addParticipants, removeParticipant,
  getMatchRatings, submitRatings, deleteRater, suggestTeams,
} from "@/services/matches";
import { getPlayers } from "@/services/players";

export default function MatchDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const [suggestingTeams, setSuggestingTeams] = useState(false);
  const [suggestionRatings, setSuggestionRatings] = useState<Record<string, number> | null>(null);

  // Rating state
  const [matchRatings, setMatchRatings] = useState<MatchRatingData | null>(null);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [raterName, setRaterName] = useState("");
  const [useCustomRater, setUseCustomRater] = useState(false);
  const [customRaterName, setCustomRaterName] = useState("");
  const [ratingInputs, setRatingInputs] = useState<Record<string, number>>({});
  const [expandedRater, setExpandedRater] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadMatch = useCallback(async () => {
    const { data, error } = await getMatch(id);
    if (error) { navigate("/matches"); return; }
    setMatch(data!);
  }, [id, navigate]);

  const loadRatings = useCallback(async () => {
    const { data } = await getMatchRatings(id);
    if (data) setMatchRatings(data);
    setLoadingRatings(false);
  }, [id]);

  useEffect(() => {
    const init = async () => {
      const [matchResult, playerResult] = await Promise.all([getMatch(id), getPlayers()]);
      if (matchResult.error) { navigate("/matches"); return; }
      setMatch(matchResult.data!);
      setAllPlayers(playerResult.data ?? []);
      setLoading(false);
    };
    init();
    loadRatings();
  }, [id, navigate, loadRatings]);

  const openTeamEdit = () => {
    if (!match) return;
    setEditTeam1Name(match.team1Name || "Takım 1");
    setEditTeam2Name(match.team2Name || "Takım 2");
    const teams: Record<string, 1 | 2> = {};
    match.matchPlayers.forEach((mp) => {
      if (mp.team === 1 || mp.team === 2) teams[mp.playerId] = mp.team;
    });
    setEditPlayerTeams(teams);
    setSuggestionRatings(null);
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
    setSuggestionRatings(null);
    loadMatch();
  };

  const handleSuggestTeams = async () => {
    setSuggestingTeams(true);
    const { data, error } = await suggestTeams(id);
    setSuggestingTeams(false);
    if (error) { showError(error); return; }
    const teams: Record<string, 1 | 2> = {};
    data!.team1.forEach((pid) => { teams[pid] = 1; });
    data!.team2.forEach((pid) => { teams[pid] = 2; });
    setEditPlayerTeams(teams);
    setSuggestionRatings(data!.playerRatings);
  };

  const openRatingModal = () => {
    if (!match) return;
    setRaterName("");
    setUseCustomRater(false);
    setCustomRaterName("");
    const inputs: Record<string, number> = {};
    match.matchPlayers.forEach((mp) => { inputs[mp.playerId] = 5; });
    setRatingInputs(inputs);
    setShowRatingModal(true);
  };

  const handleSubmitRatings = async () => {
    const effectiveRaterName = useCustomRater ? customRaterName.trim() : raterName.trim();
    if (!effectiveRaterName) { showError("Puanlayan adını seç veya gir"); return; }
    setSaving(true);
    const { data, error } = await submitRatings(id, effectiveRaterName, ratingInputs);
    setSaving(false);
    if (error) { showError(error); return; }
    setMatchRatings(data!);
    setShowRatingModal(false);
  };

  const handleDeleteRater = async (name: string) => {
    if (!confirm(`"${name}" adlı puanlamayı silmek istiyor musun?`)) return;
    const { data, error } = await deleteRater(id, name);
    if (error) { showError(error); return; }
    setMatchRatings(data!);
    if (expandedRater === name) setExpandedRater(null);
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

  const hasRatings = matchRatings && matchRatings.raters.length > 0;

  const topPlayerId = hasRatings
    ? [...matchRatings!.players]
        .filter((p) => p.count > 0)
        .reduce<(typeof matchRatings.players)[0] | null>(
          (best, p) => (!best || p.average > best.average ? p : best),
          null
        )?.playerId ?? null
    : null;

  const calcTeamAvg = (players: typeof team1Players) => {
    if (!matchRatings) return null;
    const rated = players
      .map((mp) => matchRatings.players.find((p) => p.playerId === mp.playerId))
      .filter((p): p is NonNullable<typeof p> => !!p && p.count > 0);
    if (rated.length === 0) return null;
    return Math.round((rated.reduce((s, p) => s + p.average, 0) / rated.length) * 10) / 10;
  };
  const team1Avg = calcTeamAvg(team1Players);
  const team2Avg = calcTeamAvg(team2Players);

  return (
    <div className="space-y-6">
      {ToastEl}

      {/* Back + Header */}
      <div>
        <Link to="/matches" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
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

      {/* ── Puanlamalar Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-700">Puanlamalar</h2>
            {hasRatings && (
              <span className="text-xs bg-violet-100 text-violet-600 font-semibold px-2 py-0.5 rounded-full">
                {matchRatings.raters.length} kişi
              </span>
            )}
          </div>
          <button
            onClick={openRatingModal}
            className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            <Star size={14} />
            Puan Gir
          </button>
        </div>

        {loadingRatings ? (
          <div className="p-6 text-center text-slate-400 text-sm">Yükleniyor...</div>
        ) : !hasRatings ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 text-sm">Henüz puanlama yapılmamış.</p>
            <button onClick={openRatingModal} className="mt-2 text-violet-600 text-sm hover:underline">
              İlk puanlamayı gir →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Player Averages */}
            <div className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Oyuncu Ortalamaları</p>
              <div className="space-y-2">
                {matchRatings.players.map((p, idx) => {
                  const isTop = p.playerId === topPlayerId;
                  return (
                    <div key={p.playerId} className={`flex items-center gap-3 px-2 py-1 rounded-xl -mx-2 transition-colors ${isTop ? "bg-emerald-50 border border-emerald-200" : ""}`}>
                      <span className="text-xs text-slate-300 w-4 text-right">{idx + 1}</span>
                      <Avatar name={p.playerName} size="sm" />
                      <span className={`text-sm font-medium flex-1 ${isTop ? "text-emerald-700" : "text-slate-700"}`}>{p.playerName}</span>
                      {p.count > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center justify-center w-10 h-8 rounded-xl text-sm font-bold border ${
                            isTop ? "bg-emerald-500 text-white border-emerald-600" :
                            p.average >= 8 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            p.average >= 6 ? "bg-blue-50 text-blue-700 border-blue-200" :
                            p.average >= 4 ? "bg-orange-50 text-orange-700 border-orange-200" :
                            "bg-red-50 text-red-600 border-red-200"
                          }`}>
                            {p.average % 1 === 0 ? p.average : p.average.toFixed(1)}
                          </span>
                          {isTop && <Star size={13} className="text-emerald-500 fill-emerald-400" />}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rater List */}
            <div className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Puan Girenler</p>
              <div className="space-y-1">
                {matchRatings.raters.map((rater) => {
                  const isExpanded = expandedRater === rater;
                  const raterData = matchRatings.players
                    .map((p) => ({ player: p, entry: p.ratings.find((r) => r.raterName === rater) }))
                    .filter((x) => x.entry);
                  return (
                    <div key={rater} className="rounded-xl border border-slate-100 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-violet-700">{rater[0].toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 flex-1">{rater}</span>
                        <span className="text-xs text-slate-400">{raterData.length} oyuncu</span>
                        <button
                          onClick={() => setExpandedRater(isExpanded ? null : rater)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button
                          onClick={() => handleDeleteRater(rater)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          title="Puanlamayı sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-slate-50 border-t border-slate-100">
                          <div className="space-y-1.5">
                            {raterData.map(({ player, entry }) => (
                              <div key={player.playerId} className="flex items-center gap-2.5">
                                <Avatar name={player.playerName} size="sm" />
                                <span className="text-sm text-slate-600 flex-1">{player.playerName}</span>
                                <span className={`inline-flex items-center justify-center w-8 h-7 rounded-lg text-sm font-bold border ${
                                  entry!.rating >= 8 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  entry!.rating >= 6 ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  entry!.rating >= 4 ? "bg-orange-50 text-orange-700 border-orange-200" :
                                  "bg-red-50 text-red-600 border-red-200"
                                }`}>
                                  {entry!.rating}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Teams Section ── */}
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
                <div className="px-4 py-2.5 bg-blue-100/60 border-b border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-700">{t1Name}</p>
                    <p className="text-xs text-blue-400">{team1Players.length} oyuncu</p>
                  </div>
                  {team1Avg !== null && (
                    <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-1 rounded-lg">
                      ⌀ {team1Avg % 1 === 0 ? team1Avg : team1Avg.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  {team1Players.length === 0 ? (
                    <p className="text-xs text-slate-400 px-1">Oyuncu yok</p>
                  ) : [...team1Players].sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper)).map((mp) => {
                    const avg = matchRatings?.players.find((p) => p.playerId === mp.playerId);
                    const isTop = mp.playerId === topPlayerId;
                    return (
                      <div key={mp.id} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg border ${isTop ? "bg-emerald-50 border-emerald-200" : "bg-white border-blue-100"}`}>
                        <Avatar name={mp.player.name} size="sm" />
                        <span className="text-sm font-medium text-slate-700 flex-1">{mp.player.name}</span>
                        {mp.isGoalkeeper && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-md">GK</span>}
                        {avg && avg.count > 0 && (
                          <div className="flex items-center gap-1">
                            <span className={`text-[11px] font-bold border px-1.5 py-0.5 rounded-md ${isTop ? "bg-emerald-500 text-white border-emerald-600" : "bg-violet-100 text-violet-700 border-violet-200"}`}>
                              {avg.average % 1 === 0 ? avg.average : avg.average.toFixed(1)}
                            </span>
                            {isTop && <Star size={11} className="text-emerald-500 fill-emerald-400" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team 2 */}
              <div className="rounded-xl border border-orange-100 bg-orange-50/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-orange-100/60 border-b border-orange-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-orange-700">{t2Name}</p>
                    <p className="text-xs text-orange-400">{team2Players.length} oyuncu</p>
                  </div>
                  {team2Avg !== null && (
                    <span className="text-xs font-bold bg-orange-200 text-orange-800 px-2 py-1 rounded-lg">
                      ⌀ {team2Avg % 1 === 0 ? team2Avg : team2Avg.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  {team2Players.length === 0 ? (
                    <p className="text-xs text-slate-400 px-1">Oyuncu yok</p>
                  ) : [...team2Players].sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper)).map((mp) => {
                    const avg = matchRatings?.players.find((p) => p.playerId === mp.playerId);
                    const isTop = mp.playerId === topPlayerId;
                    return (
                      <div key={mp.id} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg border ${isTop ? "bg-emerald-50 border-emerald-200" : "bg-white border-orange-100"}`}>
                        <Avatar name={mp.player.name} size="sm" />
                        <span className="text-sm font-medium text-slate-700 flex-1">{mp.player.name}</span>
                        {mp.isGoalkeeper && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-md">GK</span>}
                        {avg && avg.count > 0 && (
                          <div className="flex items-center gap-1">
                            <span className={`text-[11px] font-bold border px-1.5 py-0.5 rounded-md ${isTop ? "bg-emerald-500 text-white border-emerald-600" : "bg-violet-100 text-violet-700 border-violet-200"}`}>
                              {avg.average % 1 === 0 ? avg.average : avg.average.toFixed(1)}
                            </span>
                            {isTop && <Star size={11} className="text-emerald-500 fill-emerald-400" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
              <button
                onClick={handleSuggestTeams}
                disabled={suggestingTeams}
                className="flex items-center gap-1.5 text-xs border border-violet-200 bg-violet-50 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-100 disabled:opacity-50"
              >
                <Wand2 size={13} />
                {suggestingTeams ? "Hesaplanıyor..." : "Akıllı Öneri"}
              </button>
              <button onClick={() => { setEditingTeams(false); setSuggestionRatings(null); }} className="text-xs border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50">
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
            {suggestionRatings && (
              <p className="text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                Akıllı öneri oyuncu puanlarına göre dengeli takımlar oluşturdu. Değiştirebilirsin.
              </p>
            )}
            <p className="text-xs text-slate-400">Oyuncuya tıkla → T1 → T2 → Atamasız</p>
            <div className="space-y-1.5">
              {match.matchPlayers.map((mp) => {
                const t = editPlayerTeams[mp.playerId];
                const rating = suggestionRatings?.[mp.playerId];
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
                    {rating != null && (
                      <span className="text-xs text-violet-500 font-semibold">{rating % 1 === 0 ? rating : rating.toFixed(1)}</span>
                    )}
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

      {/* ── Players Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Tüm Oyuncular</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const text = [...match.matchPlayers]
                  .map((mp) => mp.player.name)
                  .sort((a, b) => a.localeCompare(b, "tr"))
                  .map((name, i) => `${i + 1}-${name}`)
                  .join("\n");
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              {copied ? <CheckIcon size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
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
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ort.</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Borç</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...match.matchPlayers].sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper)).map((mp) => {
                const ratingData = matchRatings?.players.find((p) => p.playerId === mp.playerId);
                return (
                  <tr key={mp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={mp.player.name} size="sm" />
                        <div className="flex items-center gap-2">
                          <Link to={`/players/${mp.player.id}`} className="font-medium text-slate-800 hover:text-emerald-600 transition-colors">
                            {mp.player.name}
                          </Link>
                          {mp.isGoalkeeper && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-md">GK</span>}
                          {mp.team === 1 && <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{t1Name}</span>}
                          {mp.team === 2 && <span className="text-xs font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{t2Name}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      {ratingData && ratingData.count > 0 ? (
                        <span className={`inline-flex items-center justify-center w-10 h-8 rounded-xl text-sm font-bold border ${
                          ratingData.average >= 8 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          ratingData.average >= 6 ? "bg-blue-50 text-blue-700 border-blue-200" :
                          ratingData.average >= 4 ? "bg-orange-50 text-orange-700 border-orange-200" :
                          "bg-red-50 text-red-600 border-red-200"
                        }`}>
                          {ratingData.average % 1 === 0 ? ratingData.average : ratingData.average.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Rating Modal ── */}
      {showRatingModal && (
        <Modal title="Puan Gir" onClose={() => setShowRatingModal(false)}>
          <div className="flex flex-col gap-4">
            {/* Rater Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                Puanlayan Kim?
                {!useCustomRater && !raterName && (
                  <span className="ml-2 text-violet-500 font-normal">← birini seç</span>
                )}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[...match.matchPlayers]
                  .sort((a, b) => a.player.name.localeCompare(b.player.name))
                  .map((mp) => {
                    const selected = !useCustomRater && raterName === mp.player.name;
                    return (
                      <button
                        key={mp.playerId}
                        type="button"
                        onClick={() => { setRaterName(mp.player.name); setUseCustomRater(false); }}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-colors ${
                          selected
                            ? "bg-violet-600 border-violet-600 text-white"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          selected ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"
                        }`}>
                          {mp.player.name[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-medium leading-tight line-clamp-2 w-full">{mp.player.name}</span>
                      </button>
                    );
                  })}
                {/* Diğer */}
                <button
                  type="button"
                  onClick={() => { setUseCustomRater(true); setRaterName(""); }}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-colors ${
                    useCustomRater
                      ? "bg-slate-700 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    useCustomRater ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                    +
                  </div>
                  <span className="text-xs font-medium">Diğer</span>
                </button>
              </div>
              {useCustomRater && (
                <input
                  type="text"
                  value={customRaterName}
                  onChange={(e) => setCustomRaterName(e.target.value)}
                  placeholder="Adını gir"
                  className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  autoFocus
                />
              )}
            </div>

            {/* Player Ratings */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Oyuncu Puanları (1–10)</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {[...match.matchPlayers]
                  .sort((a, b) => a.player.name.localeCompare(b.player.name))
                  .map((mp) => (
                    <div key={mp.playerId} className="flex items-center gap-3 px-3 py-2.5">
                      <Avatar name={mp.player.name} size="sm" />
                      <span className="text-sm text-slate-700 flex-1">{mp.player.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRatingInputs((prev) => ({ ...prev, [mp.playerId]: Math.max(1, (prev[mp.playerId] ?? 5) - 1) }))}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className={`w-8 text-center text-sm font-bold ${
                          (ratingInputs[mp.playerId] ?? 5) >= 8 ? "text-emerald-600" :
                          (ratingInputs[mp.playerId] ?? 5) >= 6 ? "text-blue-600" :
                          (ratingInputs[mp.playerId] ?? 5) >= 4 ? "text-orange-600" :
                          "text-red-500"
                        }`}>
                          {ratingInputs[mp.playerId] ?? 5}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRatingInputs((prev) => ({ ...prev, [mp.playerId]: Math.min(10, (prev[mp.playerId] ?? 5) + 1) }))}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Sticky footer buttons */}
            <div className="sticky bottom-0 bg-white pt-2 flex gap-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleSubmitRatings}
                disabled={saving || (useCustomRater ? !customRaterName.trim() : !raterName.trim())}
                className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Players Modal ── */}
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
