import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Modal from "@/components/Modal";
import { format } from "date-fns";
import {
  ArrowLeft, CircleDollarSign, Users, X, Pencil, Check,
  Star, Wand2, Trash2, ChevronDown, ChevronUp, Copy, Check as CheckIcon, Trophy,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cycleTeam } from "@/utils/teams";
import Avatar from "@/components/Avatar";
import type { MatchDetail, MatchRatingData } from "@/types/matches";
import type { Player } from "@/types/players";
import {
  getMatch, updateTeams, updateParticipants, removeParticipant,
  getMatchRatings, submitRatings, deleteRater, suggestTeams, toggleHasPaid, payFromKasa,
  updateScore, updatePlayerStats, setTopRunner,
} from "@/services/matches";
import { getPlayers } from "@/services/players";

function StatControl({ label, value, activeColor, onDec, onInc }: {
  label: string; value: number; activeColor: string;
  onDec: () => void; onInc: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5">
      <span className="text-[10px] font-bold text-slate-400 w-3">{label}</span>
      <button onClick={onDec} disabled={value === 0} className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold leading-none">−</button>
      <span className={`w-4 text-center text-xs font-bold ${value > 0 ? activeColor : "text-slate-300"}`}>{value}</span>
      <button onClick={onInc} className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 text-xs font-bold leading-none">+</button>
    </div>
  );
}

export default function MatchDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [goalkeeperIds, setGoalkeeperIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { showError, ToastEl } = useToast();

  // Team editing state
  const [editingTeams, setEditingTeams] = useState(false);
  const [editTeam1Name, setEditTeam1Name] = useState("");
  const [editTeam2Name, setEditTeam2Name] = useState("");
  const [editPlayerTeams, setEditPlayerTeams] = useState<Record<string, 1 | 2>>({});
  const [suggestingTeams, setSuggestingTeams] = useState(false);
  const [suggestionRatings, setSuggestionRatings] = useState<Record<string, number> | null>(null);

  // Score editing state
  const [editingScore, setEditingScore] = useState(false);
  const [editScore1, setEditScore1] = useState("");
  const [editScore2, setEditScore2] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  // Rating state
  const [matchRatings, setMatchRatings] = useState<MatchRatingData | null>(null);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [raterName, setRaterName] = useState("");
  const [useCustomRater, setUseCustomRater] = useState(false);
  const [customRaterName, setCustomRaterName] = useState("");
  const [ratingInputs, setRatingInputs] = useState<Record<string, number>>({});
  const [expandedRater, setExpandedRater] = useState<string | null>(null);
  const [confirmEditRater, setConfirmEditRater] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRater, setCopiedRater] = useState<string | null>(null);

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

  // ── Award computation — only recalculates when match data or ratings change ──
  const fmtN = useCallback((n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1)), []);

  type Award = { key: string; emoji: string; title: string; playerName: string; stat: string; bg: string; statColor: string };

  const { awards, momRanked } = useMemo(() => {
    if (!match) return { awards: [] as Award[], momRanked: [] as { mp: (typeof match extends null ? never : typeof match)["matchPlayers"][0]; score: number; avg: number; wb: number }[] };

    const awards: Award[] = [];

    const t1Won = match.team1Score != null && match.team2Score != null && match.team1Score > match.team2Score;
    const t2Won = match.team1Score != null && match.team2Score != null && match.team2Score > match.team1Score;
    const isWinner = (mp: typeof match.matchPlayers[0]) =>
      (mp.team === 1 && t1Won) || (mp.team === 2 && t2Won);

    const topByStat = (
      getStat: (mp: typeof match.matchPlayers[0]) => number
    ) => {
      const filtered = match.matchPlayers.filter((mp) => getStat(mp) > 0);
      if (filtered.length === 0) return null;
      const max = Math.max(...filtered.map(getStat));
      const tied = filtered.filter((mp) => getStat(mp) === max);
      if (tied.length === 1) return tied[0];
      const fromWinner = tied.filter(isWinner);
      return fromWinner.length > 0 ? fromWinner[0] : tied[0];
    };

    // 🔥 En Skorer
    const topScorer = topByStat((mp) => mp.goals);
    if (topScorer) awards.push({ key: "scorer", emoji: "🔥", title: "En Skorer", playerName: topScorer.player.name, stat: `${topScorer.goals} gol`, bg: "bg-orange-50 border-orange-200", statColor: "text-orange-600" });

    // 🎯 En Çok Asist
    const topAssister = topByStat((mp) => mp.assists);
    if (topAssister) awards.push({ key: "assist", emoji: "🎯", title: "En Çok Asist", playerName: topAssister.player.name, stat: `${topAssister.assists} asist`, bg: "bg-blue-50 border-blue-200", statColor: "text-blue-600" });

    // ⚽ En Çok Gol Katkısı (gol + asist)
    const topContrib = topByStat((mp) => mp.goals + mp.assists);
    if (topContrib && (topContrib !== topScorer || topContrib !== topAssister)) {
      awards.push({ key: "contrib", emoji: "⚽", title: "Gol Katkısı", playerName: topContrib.player.name, stat: `${topContrib.goals + topContrib.assists} katkı`, bg: "bg-green-50 border-green-200", statColor: "text-green-600" });
    }

    // 👟 En Çok Şut
    const topShooter = topByStat((mp) => mp.shots);
    if (topShooter) awards.push({ key: "shots", emoji: "👟", title: "En Çok Şut", playerName: topShooter.player.name, stat: `${topShooter.shots} şut`, bg: "bg-yellow-50 border-yellow-200", statColor: "text-yellow-600" });

    // 🛡️ Defansif Kilit
    const topKeyPlays = topByStat((mp) => mp.keyPlays);
    if (topKeyPlays) {
      const label = topKeyPlays.isGoalkeeper ? "kurtarış" : "müdahale";
      awards.push({ key: "keyplays", emoji: "🛡️", title: "Defansif Kilit", playerName: topKeyPlays.player.name, stat: `${topKeyPlays.keyPlays} ${label}`, bg: "bg-cyan-50 border-cyan-200", statColor: "text-cyan-600" });
    }

    // 🏃 En Çok Koşan
    if (match.topRunnerId) {
      const runner = match.matchPlayers.find((mp) => mp.playerId === match.topRunnerId);
      if (runner) awards.push({ key: "runner", emoji: "🏃", title: "En Çok Koşan", playerName: runner.player.name, stat: "Seçildi", bg: "bg-lime-50 border-lime-200", statColor: "text-lime-600" });
    }

    const fmt = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1));

    if (matchRatings) {
      // 🧠 En Faydalı Oyuncu — non-GK, saf rating
      const nonGkIds = new Set(match.matchPlayers.filter((mp) => !mp.isGoalkeeper).map((mp) => mp.playerId));
      const topRated = [...matchRatings.players].filter((p) => p.count > 0 && nonGkIds.has(p.playerId)).sort((a, b) => b.average - a.average)[0] ?? null;
      if (topRated) awards.push({ key: "useful", emoji: "🧠", title: "En Faydalı", playerName: topRated.playerName, stat: `${fmt(topRated.average)} puan`, bg: "bg-violet-50 border-violet-200", statColor: "text-violet-600" });

      // 🧱 Savunma Duvarı — defans mevkisindeki (D) en yüksek ratingli oyuncu
      const topDef = match.matchPlayers
        .filter((mp) => !mp.isGoalkeeper && mp.player.positions.split(",").includes("D"))
        .map((mp) => ({ mp, rd: matchRatings.players.find((p) => p.playerId === mp.playerId) }))
        .filter((x) => x.rd && x.rd.count > 0)
        .sort((a, b) => b.rd!.average - a.rd!.average)[0] ?? null;
      if (topDef) awards.push({ key: "defense", emoji: "🧱", title: "Savunma Duvarı", playerName: topDef.mp.player.name, stat: `${fmt(topDef.rd!.average)} puan`, bg: "bg-slate-100 border-slate-300", statColor: "text-slate-600" });

      // 🏆 Maçın Adamı — ağırlıklı formül
      const fieldMPs = match.matchPlayers.filter((mp) => !mp.isGoalkeeper);
      const momHasAssists = fieldMPs.some((mp) => mp.assists > 0);
      const momMaxGoals = Math.max(0, ...fieldMPs.map((mp) => mp.goals));
      const momMaxAssists = momHasAssists ? Math.max(0, ...fieldMPs.map((mp) => mp.assists)) : 0;
      const momRW = momHasAssists ? 0.5 : 0.65;
      const momAW = momHasAssists ? 0.15 : 0;
      const momRanked = match.matchPlayers
        .map((mp) => {
          const rd = matchRatings.players.find((p) => p.playerId === mp.playerId);
          if (!rd || rd.count === 0) return null;
          const wb = (mp.team === 1 && t1Won) || (mp.team === 2 && t2Won) ? 1 : 0;
          const score = mp.isGoalkeeper
            ? 0.9 * (rd.average / 10) + 0.1 * wb
            : momRW * (rd.average / 10) + 0.2 * (momMaxGoals > 0 ? mp.goals / momMaxGoals : 0) + momAW * (momMaxAssists > 0 ? mp.assists / momMaxAssists : 0) + 0.1 * wb;
          return { mp, score, avg: rd.average, wb };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.score - a.score);

      if (momRanked.length > 0) {
        const mom = momRanked[0];
        awards.push({ key: "mom", emoji: "🏆", title: "Maçın Adamı", playerName: mom.mp.player.name, stat: `${(mom.score * 100).toFixed(1)} puan`, bg: "bg-amber-50 border-amber-200", statColor: "text-amber-600" });
      }

      // 🧤 Maçın Kalecisi — en yüksek ratingli kaleci
      const gkRanked = match.matchPlayers
        .filter((mp) => mp.isGoalkeeper)
        .map((mp) => ({ mp, rd: matchRatings.players.find((p) => p.playerId === mp.playerId) }))
        .filter((x) => x.rd && x.rd.count > 0)
        .sort((a, b) => b.rd!.average - a.rd!.average)[0] ?? null;
      if (gkRanked) awards.push({ key: "gk", emoji: "🧤", title: "Maçın Kalecisi", playerName: gkRanked.mp.player.name, stat: `${fmt(gkRanked.rd!.average)} puan`, bg: "bg-teal-50 border-teal-200", statColor: "text-teal-600" });

      return { awards, momRanked };
    }

    return { awards, momRanked: [] };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, matchRatings]);

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

  const openScoreEdit = () => {
    if (!match) return;
    setEditScore1(match.team1Score != null ? String(match.team1Score) : "");
    setEditScore2(match.team2Score != null ? String(match.team2Score) : "");
    setEditingScore(true);
  };

  const saveScore = async () => {
    if (!match) return;
    const s1 = editScore1 === "" ? null : parseInt(editScore1, 10);
    const s2 = editScore2 === "" ? null : parseInt(editScore2, 10);

    const t1Goals = match.matchPlayers.filter((p) => p.team === 1).reduce((s, p) => s + p.goals, 0);
    const t2Goals = match.matchPlayers.filter((p) => p.team === 2).reduce((s, p) => s + p.goals, 0);

    if (s1 !== null && t1Goals > 0 && s1 > t1Goals) {
      showError(`${match.team1Name || "Takım 1"} skoru, oyuncu gollerinin toplamını (${t1Goals}) aşamaz`);
      return;
    }
    if (s2 !== null && t2Goals > 0 && s2 > t2Goals) {
      showError(`${match.team2Name || "Takım 2"} skoru, oyuncu gollerinin toplamını (${t2Goals}) aşamaz`);
      return;
    }

    setSavingScore(true);
    const { error } = await updateScore(id, s1, s2);
    setSavingScore(false);
    if (error) { showError(error); return; }
    setEditingScore(false);
    loadMatch();
  };

  const handleGoalChange = async (playerId: string, delta: number) => {
    if (!match) return;
    const mp = match.matchPlayers.find((p) => p.playerId === playerId);
    if (!mp) return;
    const newGoals = Math.max(0, mp.goals + delta);
    setMatch((prev) => prev ? {
      ...prev,
      matchPlayers: prev.matchPlayers.map((p) =>
        p.playerId === playerId ? { ...p, goals: newGoals } : p
      ),
    } : prev);
    const { error } = await updatePlayerStats(id, playerId, newGoals, mp.assists, mp.keyPlays, mp.shots);
    if (error) { showError(error); loadMatch(); }
  };

  const handleAssistChange = async (playerId: string, delta: number) => {
    if (!match) return;
    const mp = match.matchPlayers.find((p) => p.playerId === playerId);
    if (!mp) return;
    const newAssists = Math.max(0, mp.assists + delta);
    setMatch((prev) => prev ? {
      ...prev,
      matchPlayers: prev.matchPlayers.map((p) =>
        p.playerId === playerId ? { ...p, assists: newAssists } : p
      ),
    } : prev);
    const { error } = await updatePlayerStats(id, playerId, mp.goals, newAssists, mp.keyPlays, mp.shots);
    if (error) { showError(error); loadMatch(); }
  };

  const handleKeyPlaysChange = async (playerId: string, delta: number) => {
    if (!match) return;
    const mp = match.matchPlayers.find((p) => p.playerId === playerId);
    if (!mp) return;
    const newKeyPlays = Math.max(0, mp.keyPlays + delta);
    setMatch((prev) => prev ? {
      ...prev,
      matchPlayers: prev.matchPlayers.map((p) =>
        p.playerId === playerId ? { ...p, keyPlays: newKeyPlays } : p
      ),
    } : prev);
    const { error } = await updatePlayerStats(id, playerId, mp.goals, mp.assists, newKeyPlays, mp.shots);
    if (error) { showError(error); loadMatch(); }
  };

  const handleShotChange = async (playerId: string, delta: number) => {
    if (!match) return;
    const mp = match.matchPlayers.find((p) => p.playerId === playerId);
    if (!mp) return;
    const newShots = Math.max(0, mp.shots + delta);
    setMatch((prev) => prev ? {
      ...prev,
      matchPlayers: prev.matchPlayers.map((p) =>
        p.playerId === playerId ? { ...p, shots: newShots } : p
      ),
    } : prev);
    const { error } = await updatePlayerStats(id, playerId, mp.goals, mp.assists, mp.keyPlays, newShots);
    if (error) { showError(error); loadMatch(); }
  };

  const handleTopRunnerChange = async (playerId: string) => {
    if (!match) return;
    const newId = match.topRunnerId === playerId ? null : playerId;
    setMatch((prev) => prev ? { ...prev, topRunnerId: newId } : prev);
    const { error } = await setTopRunner(id, newId);
    if (error) { showError(error); loadMatch(); }
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
    setIsEditingRating(false);
    setRaterName("");
    setUseCustomRater(false);
    setCustomRaterName("");
    const inputs: Record<string, number> = {};
    match.matchPlayers.forEach((mp) => { inputs[mp.playerId] = 5; });
    setRatingInputs(inputs);
    setShowRatingModal(true);
  };

  const openEditRatingModal = (rater: string) => {
    if (!match || !matchRatings) return;
    const inputs: Record<string, number> = {};
    match.matchPlayers.forEach((mp) => {
      const existing = matchRatings.players
        .find((p) => p.playerId === mp.playerId)
        ?.ratings.find((r) => r.raterName === rater);
      inputs[mp.playerId] = existing?.rating ?? 5;
    });
    setConfirmEditRater(null);
    setIsEditingRating(true);
    setRaterName(rater);
    setUseCustomRater(false);
    setCustomRaterName("");
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
    if (selectedIds.includes(pid)) {
      setSelectedIds((prev) => prev.filter((p) => p !== pid));
      setGoalkeeperIds((prev) => prev.filter((g) => g !== pid));
    } else {
      setSelectedIds((prev) => [...prev, pid]);
    }
  };

  const toggleGk = (pid: string) => {
    setGoalkeeperIds((prev) => prev.includes(pid) ? prev.filter((g) => g !== pid) : [...prev, pid]);
  };

  const handleUpdatePlayers = async () => {
    setSaving(true);
    const { error } = await updateParticipants(id, selectedIds, goalkeeperIds.length > 0 ? goalkeeperIds : undefined);
    setSaving(false);
    if (error) { showError(error); return; }
    setShowAddPlayers(false);
    setSelectedIds([]);
    setGoalkeeperIds([]);
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

      {/* Back + Header + Awards — screenshot-friendly block */}
      <div className="space-y-4">
        <div>
          <Link to="/matches" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
            <ArrowLeft size={15} />
            Matches
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">
            {match.location || "Futbol"} — {format(new Date(match.date), "d MMMM yyyy")}
            {match.team1Score != null && match.team2Score != null && (
              <span className="ml-3 text-xl font-black text-slate-500 tabular-nums">
                ({match.team1Score} — {match.team2Score})
              </span>
            )}
          </h1>
          {match.notes && <p className="text-slate-400 text-sm mt-1">{match.notes}</p>}
        </div>

        {/* ── Awards Grid ── */}
        {awards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {awards.map((award) => (
              <div key={award.key} className={`rounded-2xl border p-3.5 ${award.bg}`}>
                <div className="text-xl mb-2 leading-none">{award.emoji}</div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{award.title}</p>
                <p className="text-sm font-bold text-slate-800 truncate">{award.playerName}</p>
                <p className={`text-xs font-semibold mt-0.5 ${award.statColor}`}>{award.stat}</p>
              </div>
            ))}
          </div>
        )}
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

      {/* ── Performans Sıralaması ── */}
      {momRanked.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Trophy size={15} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">Performans Sıralaması</h2>
          </div>
          <div className="p-4 space-y-1">
            {momRanked.map(({ mp, score, avg, wb }, i) => (
              <div key={mp.playerId} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${i === 0 ? "bg-amber-50 border border-amber-200" : "hover:bg-slate-50"}`}>
                <span className={`text-xs font-bold w-4 text-right shrink-0 ${i === 0 ? "text-amber-500" : "text-slate-300"}`}>{i + 1}</span>
                <Avatar name={mp.player.name} size="sm" />
                <span className={`text-sm font-medium flex-1 truncate ${i === 0 ? "text-amber-700" : "text-slate-700"}`}>{mp.player.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {mp.goals > 0 && <span className="text-[11px] text-emerald-600 font-semibold">{mp.goals}G</span>}
                  {mp.assists > 0 && <span className="text-[11px] text-blue-500 font-semibold">{mp.assists}A</span>}
                  {wb === 1 && <span className="text-[10px] text-amber-500 font-bold">W</span>}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${i === 0 ? "bg-amber-200 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                    {(score * 100).toFixed(1)}
                  </span>
                  <span className="text-[11px] text-slate-400 w-6 text-right">{fmtN(avg)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Oyuncu Ortalamaları</p>
                <button
                  onClick={() => {
                    const text = [...matchRatings.players]
                      .filter((p) => p.count > 0)
                      .sort((a, b) => a.playerName.localeCompare(b.playerName, "tr"))
                      .map((p) => {
                        const avg = p.average % 1 === 0 ? p.average : p.average.toFixed(1);
                        return `${p.playerName}: ${avg}`;
                      })
                      .join("\n");
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  {copied ? <CheckIcon size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Puan Girenler</p>
                <button
                  onClick={() => {
                    const text = [...matchRatings.raters]
                      .sort((a, b) => a.localeCompare(b, "tr"))
                      .join("\n");
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  {copied ? <CheckIcon size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
              </div>
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
                        {confirmEditRater === rater ? (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-xs text-slate-500">Değiştirmek istiyor musunuz?</span>
                            <button
                              onClick={() => openEditRatingModal(rater)}
                              className="text-xs bg-violet-600 text-white px-2.5 py-1 rounded-lg hover:bg-violet-700 font-medium"
                            >
                              Evet
                            </button>
                            <button
                              onClick={() => setConfirmEditRater(null)}
                              className="text-xs border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg hover:bg-slate-50 font-medium"
                            >
                              Hayır
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs text-slate-400">{raterData.length} oyuncu</span>
                            <button
                              onClick={() => {
                                const text =
                                  `${rater}:\n` +
                                  [...raterData]
                                    .sort((a, b) => a.player.playerName.localeCompare(b.player.playerName, "tr"))
                                    .map(({ player, entry }) => `${player.playerName}: ${entry!.rating}`)
                                    .join("\n");
                                navigator.clipboard.writeText(text);
                                setCopiedRater(rater);
                                setTimeout(() => setCopiedRater(null), 2000);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Kopyala"
                            >
                              {copiedRater === rater ? <CheckIcon size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                            <button
                              onClick={() => setConfirmEditRater(rater)}
                              className="p-1 text-slate-300 hover:text-violet-500 transition-colors"
                              title="Puanları düzenle"
                            >
                              <Pencil size={13} />
                            </button>
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
                          </>
                        )}
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
            <div className="flex items-center gap-3">
              {hasTeams && !editingScore && (
                <button
                  onClick={openScoreEdit}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
                >
                  <Pencil size={13} />
                  Skor
                </button>
              )}
              {editingScore && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={editScore1}
                    onChange={(e) => setEditScore1(e.target.value)}
                    placeholder="0"
                    className="w-14 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg px-2 py-1 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="text-slate-400 font-bold">—</span>
                  <input
                    type="number"
                    min={0}
                    value={editScore2}
                    onChange={(e) => setEditScore2(e.target.value)}
                    placeholder="0"
                    className="w-14 border border-orange-200 bg-orange-50 text-orange-700 rounded-lg px-2 py-1 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    onClick={saveScore}
                    disabled={savingScore}
                    className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={12} />
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingScore(false)}
                    className="text-xs border border-slate-200 text-slate-500 px-2.5 py-1 rounded-lg hover:bg-slate-50"
                  >
                    Vazgeç
                  </button>
                </div>
              )}
              {hasTeams && (
                <button
                  onClick={() => {
                    const formatTeam = (name: string, players: typeof team1Players) =>
                      `${name}\n` +
                      [...players]
                        .sort((a, b) => a.player.name.localeCompare(b.player.name, "tr"))
                        .map((mp, i) => `${i + 1}-${mp.player.name}`)
                        .join("\n");

                    const text = [
                      formatTeam(t1Name, team1Players),
                      formatTeam(t2Name, team2Players),
                    ].join("\n\n");

                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                >
                  {copied ? <CheckIcon size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
              )}
              <button
                onClick={openTeamEdit}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                <Pencil size={13} />
                {hasTeams ? "Düzenle" : "Takım Ata"}
              </button>
            </div>
          </div>

          {!hasTeams ? (
            <div className="p-6 text-center">
              <p className="text-slate-400 text-sm">Henüz takım atanmamış.</p>
              <button onClick={openTeamEdit} className="mt-2 text-emerald-600 text-sm hover:underline">
                Takım oluştur →
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {(match.team1Score != null || match.team2Score != null) && (
                <div className="flex items-center justify-center gap-4 py-2">
                  <span className="text-blue-700 font-semibold text-sm">{t1Name}</span>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-1.5">
                    <span className="text-2xl font-black text-blue-700 min-w-[1.5rem] text-center">{match.team1Score ?? 0}</span>
                    <span className="text-slate-400 font-bold text-lg">—</span>
                    <span className="text-2xl font-black text-orange-600 min-w-[1.5rem] text-center">{match.team2Score ?? 0}</span>
                  </div>
                  <span className="text-orange-600 font-semibold text-sm">{t2Name}</span>
                </div>
              )}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Team 1 */}
              {(() => {
                const team1Goals = team1Players.reduce((s, p) => s + p.goals, 0);
                return (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-blue-100/60 border-b border-blue-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-blue-700">{t1Name}</p>
                        <p className="text-xs text-blue-400">
                          {team1Players.length} oyuncu
                          {team1Goals > 0 && <span className="ml-1.5 font-semibold text-emerald-600">· {team1Goals} gol</span>}
                        </p>
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
                          <div key={mp.id} className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1.5 rounded-lg border ${isTop ? "bg-emerald-50 border-emerald-200" : "bg-white border-blue-100"}`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Avatar name={mp.player.name} size="sm" />
                              <span className="text-sm font-medium text-slate-700 truncate">{mp.player.name}</span>
                              {mp.isGoalkeeper && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-md shrink-0">GK</span>}
                              {avg && avg.count > 0 && (
                                <span className={`text-[11px] font-bold border px-1.5 py-0.5 rounded-md shrink-0 ${isTop ? "bg-emerald-500 text-white border-emerald-600" : "bg-violet-100 text-violet-700 border-violet-200"}`}>
                                  {avg.average % 1 === 0 ? avg.average : avg.average.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <StatControl label="G" value={mp.goals} activeColor="text-emerald-600" onDec={() => handleGoalChange(mp.playerId, -1)} onInc={() => handleGoalChange(mp.playerId, 1)} />
                              <StatControl label="A" value={mp.assists} activeColor="text-blue-600" onDec={() => handleAssistChange(mp.playerId, -1)} onInc={() => handleAssistChange(mp.playerId, 1)} />
                              <StatControl label="Ş" value={mp.shots} activeColor="text-yellow-600" onDec={() => handleShotChange(mp.playerId, -1)} onInc={() => handleShotChange(mp.playerId, 1)} />
                              <StatControl label={mp.isGoalkeeper ? "K" : "D"} value={mp.keyPlays} activeColor="text-cyan-600" onDec={() => handleKeyPlaysChange(mp.playerId, -1)} onInc={() => handleKeyPlaysChange(mp.playerId, 1)} />
                              <button
                                onClick={() => handleTopRunnerChange(mp.playerId)}
                                title="En çok koşan"
                                className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-colors ${match.topRunnerId === mp.playerId ? "bg-lime-100 text-lime-600" : "text-slate-300 hover:text-lime-500 hover:bg-lime-50"}`}
                              >🏃</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Team 2 */}
              {(() => {
                const team2Goals = team2Players.reduce((s, p) => s + p.goals, 0);
                return (
                  <div className="rounded-xl border border-orange-100 bg-orange-50/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-orange-100/60 border-b border-orange-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-orange-700">{t2Name}</p>
                        <p className="text-xs text-orange-400">
                          {team2Players.length} oyuncu
                          {team2Goals > 0 && <span className="ml-1.5 font-semibold text-emerald-600">· {team2Goals} gol</span>}
                        </p>
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
                          <div key={mp.id} className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1.5 rounded-lg border ${isTop ? "bg-emerald-50 border-emerald-200" : "bg-white border-orange-100"}`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Avatar name={mp.player.name} size="sm" />
                              <span className="text-sm font-medium text-slate-700 truncate">{mp.player.name}</span>
                              {mp.isGoalkeeper && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-md shrink-0">GK</span>}
                              {avg && avg.count > 0 && (
                                <span className={`text-[11px] font-bold border px-1.5 py-0.5 rounded-md shrink-0 ${isTop ? "bg-emerald-500 text-white border-emerald-600" : "bg-violet-100 text-violet-700 border-violet-200"}`}>
                                  {avg.average % 1 === 0 ? avg.average : avg.average.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <StatControl label="G" value={mp.goals} activeColor="text-emerald-600" onDec={() => handleGoalChange(mp.playerId, -1)} onInc={() => handleGoalChange(mp.playerId, 1)} />
                              <StatControl label="A" value={mp.assists} activeColor="text-blue-600" onDec={() => handleAssistChange(mp.playerId, -1)} onInc={() => handleAssistChange(mp.playerId, 1)} />
                              <StatControl label="Ş" value={mp.shots} activeColor="text-yellow-600" onDec={() => handleShotChange(mp.playerId, -1)} onInc={() => handleShotChange(mp.playerId, 1)} />
                              <StatControl label={mp.isGoalkeeper ? "K" : "D"} value={mp.keyPlays} activeColor="text-cyan-600" onDec={() => handleKeyPlaysChange(mp.playerId, -1)} onInc={() => handleKeyPlaysChange(mp.playerId, 1)} />
                              <button
                                onClick={() => handleTopRunnerChange(mp.playerId)}
                                title="En çok koşan"
                                className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-colors ${match.topRunnerId === mp.playerId ? "bg-lime-100 text-lime-600" : "text-slate-300 hover:text-lime-500 hover:bg-lime-50"}`}
                              >🏃</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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
            <button
              onClick={() => {
                if (!match) return;
                setSelectedIds(match.matchPlayers.map((mp) => mp.playerId));
                setGoalkeeperIds(match.matchPlayers.filter((mp) => mp.isGoalkeeper).map((mp) => mp.playerId));
                setShowAddPlayers(true);
              }}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Users size={15} />
              Oyuncuları Düzenle
            </button>
          </div>
        </div>

        {match.matchPlayers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">Bu maçta henüz oyuncu yok.</p>
          </div>
        ) : (
          <table className="w-full">
            {(() => {
              const totalGoals = match.matchPlayers.reduce((s, p) => s + p.goals, 0);
              const totalAssists = match.matchPlayers.reduce((s, p) => s + p.assists, 0);
              const balanced = totalGoals === totalAssists;
              const hasAny = totalGoals > 0 || totalAssists > 0;
              return hasAny ? (
                <div className={`px-5 py-2 text-xs font-medium flex items-center gap-2 ${balanced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  <span>{balanced ? "✓" : "!"}</span>
                  <span>Toplam gol: <strong>{totalGoals}</strong> · Toplam asist: <strong>{totalAssists}</strong></span>
                  {!balanced && <span className="ml-auto">Gol ve asist sayısı eşit değil</span>}
                </div>
              ) : null;
            })()}
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Oyuncu</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ort.</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Asist</th>
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
                    <td className="px-2 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleAssistChange(mp.playerId, -1)}
                          disabled={mp.assists === 0}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold leading-none"
                        >−</button>
                        <span className={`w-5 text-center text-sm font-bold ${mp.assists > 0 ? "text-blue-600" : "text-slate-300"}`}>
                          {mp.assists}
                        </span>
                        <button
                          onClick={() => handleAssistChange(mp.playerId, 1)}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 text-xs font-bold leading-none"
                        >+</button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {mp.amountOwed > 0 && !mp.hasPaid && mp.playerBalance >= mp.amountOwed && (
                          <button
                            onClick={async () => {
                              const { error } = await payFromKasa(id, mp.playerId);
                              if (error) { showError(error); return; }
                              loadMatch();
                            }}
                            title="Kasa bakiyesinden öde"
                            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            Kasadan Öde
                          </button>
                        )}
                        {mp.amountOwed > 0 && (
                          <button
                            onClick={async () => {
                              await toggleHasPaid(id, mp.playerId);
                              loadMatch();
                            }}
                            title={mp.hasPaid ? "Ödemeyi geri al" : "Ödendi olarak işaretle"}
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border transition-colors ${
                              mp.hasPaid
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <CheckIcon size={12} />
                            {mp.hasPaid ? "Ödendi" : "Bekliyor"}
                          </button>
                        )}
                        <span className={`font-bold text-sm px-2.5 py-1 rounded-full ${
                          mp.amountOwed === 0 ? "bg-slate-100 text-slate-400" : "bg-red-50 text-red-600"
                        }`}>
                          ₺{mp.amountOwed.toFixed(0)}
                        </span>
                      </div>
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
        <Modal title={isEditingRating ? "Puanları Düzenle" : "Puan Gir"} onClose={() => { setShowRatingModal(false); setIsEditingRating(false); }}>
          <div className="flex flex-col gap-4">
            {/* Rater — edit modunda kilitli, yeni girişte seçilebilir */}
            {isEditingRating ? (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {raterName[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-violet-400 font-medium">Düzenlenen puanlama</p>
                  <p className="text-sm font-semibold text-violet-700">{raterName}</p>
                </div>
              </div>
            ) : (
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
            )}

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
                          onClick={() => setRatingInputs((prev) => ({ ...prev, [mp.playerId]: Math.round((Math.max(1, (prev[mp.playerId] ?? 5) - 0.5)) * 10) / 10 }))}
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
                          onClick={() => setRatingInputs((prev) => ({ ...prev, [mp.playerId]: Math.round((Math.min(10, (prev[mp.playerId] ?? 5) + 0.5)) * 10) / 10 }))}
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
                onClick={() => { setShowRatingModal(false); setIsEditingRating(false); }}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleSubmitRatings}
                disabled={saving || (isEditingRating ? false : useCustomRater ? !customRaterName.trim() : !raterName.trim())}
                className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "Kaydediliyor..." : isEditingRating ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Players Modal ── */}
      {showAddPlayers && (
        <Modal title="Oyuncuları Düzenle" onClose={() => { setShowAddPlayers(false); setSelectedIds([]); setGoalkeeperIds([]); }}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{selectedIds.length} oyuncu seçili</span>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setSelectedIds([]); setGoalkeeperIds([]); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Tümünü temizle
                </button>
              )}
            </div>
            <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
              {allPlayers.map((player) => (
                <label key={player.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(player.id)}
                    onChange={() => togglePlayer(player.id)}
                    className="accent-emerald-600 shrink-0"
                  />
                  <span className="text-sm text-slate-700 truncate">{player.name}</span>
                </label>
              ))}
            </div>
            {selectedIds.length > 0 && (
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Kaleci (opsiyonel)</label>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {allPlayers.filter((p) => selectedIds.includes(p.id)).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={goalkeeperIds.includes(p.id)}
                        onChange={() => toggleGk(p.id)}
                        className="accent-yellow-500"
                      />
                      <span className="text-sm text-slate-700">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {selectedIds.length > 0 && match.totalCost > 0 && (() => {
              const payingCount = selectedIds.filter((pid) => !goalkeeperIds.includes(pid)).length;
              const perPlayer = match.goalkeeperFree && payingCount > 0
                ? match.totalCost / payingCount
                : selectedIds.length > 0
                ? match.totalCost / selectedIds.length
                : 0;
              return (
                <p className="text-xs text-emerald-700 font-medium">
                  Kişi başı: ₺{perPlayer.toFixed(0)}
                  {" "}({selectedIds.length} oyuncu{match.goalkeeperFree && goalkeeperIds.length > 0 ? `, ${goalkeeperIds.length} GK ücretsiz` : ""})
                </p>
              );
            })()}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowAddPlayers(false); setSelectedIds([]); setGoalkeeperIds([]); }} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium">
                İptal
              </button>
              <button onClick={handleUpdatePlayers} disabled={saving} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">
                {saving ? "Kaydediliyor..." : "Güncelle"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
