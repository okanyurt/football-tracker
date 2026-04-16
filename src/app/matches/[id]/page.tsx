"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { format } from "date-fns";

interface Player {
  id: string;
  name: string;
}

interface MatchPlayer {
  id: string;
  playerId: string;
  amountOwed: number;
  player: Player;
}

interface Match {
  id: string;
  date: string;
  location: string | null;
  totalCost: number;
  notes: string | null;
  matchPlayers: MatchPlayer[];
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [matchRes, playersRes] = await Promise.all([
      fetch(`/api/matches/${id}`),
      fetch("/api/players"),
    ]);
    if (!matchRes.ok) {
      router.push("/matches");
      return;
    }
    setMatch(await matchRes.json());
    setAllPlayers(await playersRes.json());
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const participantIds = match?.matchPlayers.map((mp) => mp.playerId) ?? [];
  const availablePlayers = allPlayers.filter((p) => !participantIds.includes(p.id));

  const openAddPlayers = () => {
    setSelectedIds([]);
    setShowAddPlayers(true);
  };

  const togglePlayer = (pid: string) => {
    setSelectedIds((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const handleAddPlayers = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    await fetch(`/api/matches/${id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerIds: selectedIds }),
    });
    setShowAddPlayers(false);
    setSaving(false);
    load();
  };

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Remove "${playerName}" from this match?`)) return;
    await fetch(`/api/matches/${id}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    load();
  };

  if (loading || !match) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  const perPlayer =
    match.matchPlayers.length > 0
      ? match.totalCost / match.matchPlayers.length
      : 0;

  return (
    <div>
      <div className="mb-6">
        <Link href="/matches" className="text-green-600 hover:underline text-sm">
          ← Back to Matches
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {match.location || "Football"} —{" "}
            {format(new Date(match.date), "MMMM d, yyyy")}
          </h1>
          {match.notes && (
            <p className="text-gray-500 text-sm mt-1">{match.notes}</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Total Cost</p>
          <p className="text-xl font-bold text-green-800 mt-1">₺{match.totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Per Player</p>
          <p className="text-xl font-bold text-blue-800 mt-1">₺{perPlayer.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Players</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{match.matchPlayers.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Players</h2>
        {availablePlayers.length > 0 && (
          <button
            onClick={openAddPlayers}
            className="text-sm text-green-600 hover:underline font-medium"
          >
            + Add Player
          </button>
        )}
      </div>

      {match.matchPlayers.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-400">No players in this match yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Player</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount Owed</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {match.matchPlayers.map((mp) => (
                <tr key={mp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${mp.player.id}`}
                      className="font-medium text-gray-900 hover:text-green-700"
                    >
                      {mp.player.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-red-600 font-semibold">
                      ₺{mp.amountOwed.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemovePlayer(mp.player.id, mp.player.name)}
                      className="text-gray-300 hover:text-red-500 text-lg leading-none"
                      title="Remove"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddPlayers && (
        <Modal title="Add Players" onClose={() => setShowAddPlayers(false)}>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
              {availablePlayers.map((player) => (
                <label
                  key={player.id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(player.id)}
                    onChange={() => togglePlayer(player.id)}
                    className="accent-green-600"
                  />
                  <span className="text-sm text-gray-800">{player.name}</span>
                </label>
              ))}
            </div>

            {selectedIds.length > 0 && match.totalCost > 0 && (
              <p className="text-xs text-green-700 font-medium">
                New per-player cost:{" "}
                ₺{(match.totalCost / (match.matchPlayers.length + selectedIds.length)).toFixed(2)}{" "}
                ({match.matchPlayers.length + selectedIds.length} players)
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddPlayers(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayers}
                disabled={saving || selectedIds.length === 0}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
