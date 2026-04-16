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

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
      await fetch(`/api/players/${editPlayer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      setEditPlayer(null);
    } else {
      await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      setShowAdd(false);
    }

    setSaving(false);
    load();
  };

  const handleDelete = async (id: string, playerName: string) => {
    if (!confirm(`Delete "${playerName}"? All their history will be removed.`)) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    load();
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          <p className="text-gray-500 mt-1">{players.length} players registered</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          + Add Player
        </button>
      </div>

      {players.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-gray-500">No players yet.</p>
          <button
            onClick={openAdd}
            className="mt-4 text-green-600 hover:underline text-sm"
          >
            Add the first player
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Balance</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {players.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${player.id}`}
                      className="font-medium text-gray-900 hover:text-green-700"
                    >
                      {player.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {player.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${
                        player.balance < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      ₺{player.balance.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(player)}
                      className="text-gray-400 hover:text-gray-700 text-sm px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(player.id, player.name)}
                      className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded ml-1"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showAdd || editPlayer) && (
        <Modal
          title={editPlayer ? "Edit Player" : "New Player"}
          onClose={() => {
            setShowAdd(false);
            setEditPlayer(null);
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAdd(false);
                  setEditPlayer(null);
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editPlayer ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
