import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Player } from "@/types/players";

const STATUS_LABEL: Record<string, string> = {
  guest: "Misafir",
  removed: "Gruptan Çıktı",
  exempt: "Muaf",
  normal: "Normal",
};

function playerStatus(p: Player) {
  if (p.isGuest) return "guest";
  if (p.removedFromGroup) return "removed";
  if (p.isExempt) return "exempt";
  return "normal";
}

export function exportPlayersPdf(players: Player[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Title
  const today = format(new Date(), "dd.MM.yyyy");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("Oyuncu Listesi", 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`${today} · ${players.length} oyuncu`, 14, 22);

  const rows = players.map((p, i) => [
    i + 1,
    p.name,
    STATUS_LABEL[playerStatus(p)],
    p.positions ? p.positions.split(",").filter(Boolean).join(", ") : "—",
    p.avgRating != null ? (p.avgRating % 1 === 0 ? String(p.avgRating) : p.avgRating.toFixed(1)) : "—",
    p.matchCount,
    `₺${p.totalOwed.toFixed(0)}`,
    `₺${p.totalPaid.toFixed(0)}`,
    (p.balance < 0 ? "-" : p.balance > 0 ? "+" : "") + `₺${Math.abs(p.balance).toFixed(0)}`,
  ]);

  autoTable(doc, {
    startY: 27,
    head: [["#", "İsim", "Durum", "Mevki", "Ort.", "Maç", "Borç", "Ödeme", "Bakiye"]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 118, 110], // emerald-700
      textColor: 255,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 45 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20 },
      4: { halign: "center", cellWidth: 16 },
      5: { halign: "center", cellWidth: 14 },
      6: { halign: "right", cellWidth: 22 },
      7: { halign: "right", cellWidth: 22 },
      8: { halign: "right", cellWidth: 22 },
    },
    didParseCell(data) {
      // Bakiye kolonunu renklendir
      if (data.column.index === 8 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val.startsWith("-")) data.cell.styles.textColor = [220, 38, 38];   // red
        else if (val.startsWith("+")) data.cell.styles.textColor = [5, 150, 105]; // emerald
      }
      // Durum kolonunu renklendir
      if (data.column.index === 2 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val === "Misafir") data.cell.styles.textColor = [180, 83, 9];     // amber
        else if (val === "Muaf") data.cell.styles.textColor = [29, 78, 216];  // blue
        else if (val === "Gruptan Çıktı") data.cell.styles.textColor = [185, 28, 28]; // red
      }
    },
  });

  doc.save(`oyuncular_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
