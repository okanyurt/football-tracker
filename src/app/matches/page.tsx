"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { format } from "date-fns";

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
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [matchRes, playerRes] = await Promise.all([
      fetch("/api/matches"),
      fetch("/api/players"),
    ]);
    setMatches(await matchRes.json());
    setPlayers(await playerRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setLocation("");
    setCostMode("total");
    setTotalCost("");
    setNotes("");
    setSelectedPlayerIds([]);
    setGoalkeeperFree(false);
    setGoalkeeperPlayerIds([]);
    setShowCreate(true);
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      setGoalkeeperPlayerIds((gk) => gk.filter((gkId) => next.includes(gkId)));
      return next;
    });
  };

  const toggleGoalkeeper = (id: string) => {
    setGoalkeeperPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!date || !totalCost || selectedPlayerIds.length === 0) return;
    setSaving(true);
    await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        location,
        totalCost: computedTotal,
        notes,
        playerIds: selectedPlayerIds,
        goalkeeperFree,
        goalkeeperPlayerIds: goalkeeperFree ? goalkeeperPlayerIds : [],
        ...(costMode === "perPlayer" && { perPlayerAmount: Number(totalCost) }),
      }),
    });
    setShowCreate(false);
    setSaving(false);
    load();
  };

  const handleCancel = async (match: Match) => {
    const isCancelled = !!match.cancelledAt;
    const msg = isCancelled
      ? "Bu maçın iptali geri alınsın mı?"
      : "Bu maçı iptal etmek istediğine emin misin? Oyuncuların borçları sıfırlanacak.";
    if (!confirm(msg)) return;
    await fetch(`/api/matches/${match.id}`, { method: "PATCH" });
    load();
  };

  const payingCount = goalkeeperFree && goalkeeperPlayerIds.length
    ? selectedPlayerIds.filter((id) => !goalkeeperPlayerIds.includes(id)).length
    : selectedPlayerIds.length;

  const computedTotal = costMode === "perPlayer" && totalCost && payingCount > 0
    ? Number(totalCost) * payingCount
    : Number(totalCost);

  const perPlayer = payingCount > 0 && totalCost
    ? costMode === "perPlayer"
      ? Number(totalCost).toFixed(2)
      : (Number(totalCost) / payingCount).toFixed(2)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
          <p className="text-gray-500 mt-1">{matches.length} matches recorded</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          + New Match
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="text-4xl mb-3">🏟️</div>
          <p className="text-gray-500">No matches yet.</p>
          <button
            onClick={openCreate}
            className="mt-4 text-green-600 hover:underline text-sm"
          >
            Create the first match
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              className={`rounded-xl border p-4 flex items-center justify-between transition-colors ${
                match.cancelledAt
                  ? "bg-gray-50 border-gray-200 opacity-60"
                  : "bg-white border-gray-200 hover:border-green-200"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-2 text-center min-w-[56px] ${match.cancelledAt ? "bg-gray-100" : "bg-green-50"}`}>
                  <p className={`text-xs font-medium ${match.cancelledAt ? "text-gray-400" : "text-green-600"}`}>
                    {format(new Date(match.date), "MMM").toUpperCase()}
                  </p>
                  <p className={`text-xl font-bold ${match.cancelledAt ? "text-gray-400" : "text-green-800"}`}>
                    {format(new Date(match.date), "d")}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/matches/${match.id}`}
                      className={`font-medium ${match.cancelledAt ? "line-through text-gray-400" : "text-gray-900 hover:text-green-700"}`}
                    >
                      {match.location || "Football"}
                    </Link>
                    {match.cancelledAt && (
                      <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-medium">İptal</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {match.matchPlayers.length} players · ₺{match.totalCost.toFixed(2)}
                    {match.goalkeeperFree && (
                      <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                        GK free
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {match.matchPlayers.map((mp) => mp.player.name).join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!match.cancelledAt && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Kişi başı</p>
                    <p className="font-bold text-gray-900">
                      ₺{(() => {
                          const payingCount = match.goalkeeperFree
                            ? match.matchPlayers.filter((mp) => !mp.isGoalkeeper).length
                            : match.matchPlayers.length;
                          return payingCount > 0 ? (match.totalCost / payingCount).toFixed(2) : "0.00";
                        })()}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => handleCancel(match)}
                  className={`text-xs border px-2.5 py-1 rounded-md font-medium transition-colors ${
                    match.cancelledAt
                      ? "border-green-200 text-green-600 hover:bg-green-50"
                      : "border-red-200 text-red-400 hover:bg-red-50"
                  }`}
                >
                  {match.cancelledAt ? "Geri Al" : "İptal Et"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="New Match" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    {costMode === "total" ? "Total Cost (₺)" : "Per Player (₺)"} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex text-xs border border-gray-200 rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCostMode("total")}
                      className={`px-2 py-0.5 ${costMode === "total" ? "bg-green-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      Total
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostMode("perPlayer")}
                      className={`px-2 py-0.5 ${costMode === "perPlayer" ? "bg-green-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      Kişi başı
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder={costMode === "total" ? "600" : "50"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Sports Complex"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Players <span className="text-red-500">*</span>
              </label>
              {players.length === 0 ? (
                <p className="text-sm text-gray-400">Add players first.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {players.map((player) => (
                    <label
                      key={player.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.includes(player.id)}
                        onChange={() => togglePlayer(player.id)}
                        className="accent-green-600"
                      />
                      <span className="text-sm text-gray-800">{player.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {perPlayer && (
                <p className="text-xs text-green-700 mt-1.5 font-medium">
                  {costMode === "perPlayer"
                    ? `Total: ₺${computedTotal.toFixed(2)} · ₺${perPlayer}/kişi`
                    : `₺${perPlayer}/kişi`}
                  {" "}({payingCount} paying{goalkeeperFree && goalkeeperPlayerIds.length > 0 ? `, ${goalkeeperPlayerIds.length} GK free` : ""})
                </p>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={goalkeeperFree}
                  onChange={(e) => {
                    setGoalkeeperFree(e.target.checked);
                    if (!e.target.checked) setGoalkeeperPlayerId("");
                  }}
                  className="accent-green-600"
                />
                <span className="text-sm font-medium text-gray-700">Goalkeeper plays for free</span>
              </label>
              {goalkeeperFree && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Select goalkeeper(s)</label>
                  {selectedPlayerIds.length === 0 ? (
                    <p className="text-xs text-gray-400">Select players first.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {players
                        .filter((p) => selectedPlayerIds.includes(p.id))
                        .map((p) => (
                          <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={goalkeeperPlayerIds.includes(p.id)}
                              onChange={() => toggleGoalkeeper(p.id)}
                              className="accent-yellow-500"
                            />
                            <span className="text-sm text-gray-800">{p.name}</span>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional info..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !date || !totalCost || selectedPlayerIds.length === 0}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
