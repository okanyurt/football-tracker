import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, addDays } from "date-fns";
import type { PlayerDetail } from "@/types/players";

// ── Satıcı bilgileri – aşağıdaki alanları doldurun ──────────────────────────
const SELLER = {
  name: "Football Tracker",
  address: "",
  taxNo: "",
  phone: "",
  email: "",
  bank: "",
  iban: "",
  swift: "",
};
// ────────────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  guest: "Misafir",
  removed: "Gruptan Cikti",
  exempt: "Muaf",
  normal: "Normal",
};

function playerStatus(p: PlayerDetail) {
  if (p.isGuest) return "guest";
  if (p.removedFromGroup) return "removed";
  if (p.isExempt) return "exempt";
  return "normal";
}

// Sage-green proforma renkleri
const BG: [number, number, number] = [162, 175, 155];
const DARK: [number, number, number] = [32, 44, 28];
const MID: [number, number, number] = [80, 95, 72];

// lastAutoTable finalY yardımcı tipi
function finalY(doc: jsPDF): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 0;
}

// ── PDF satır yardımcısı: bold label + normal value ──────────────────────────
function labelValue(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  fontSize = 8.5
) {
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.text(value, x + doc.getTextWidth(label) + 1.2, y);
}

export function exportPlayerDetailPdf(player: PlayerDetail) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── SAYFA 1: Özet + Maç Geçmişi + Ödeme Geçmişi ─────────────────────────
  const today = format(new Date(), "dd.MM.yyyy");

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(player.name, 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const statusStr = STATUS_LABEL[playerStatus(player)];
  const posStr = player.positions ? player.positions.split(",").filter(Boolean).join(", ") : "-";
  doc.text(`${statusStr} · ${posStr} · ${today}`, 14, 24);

  // Özet satırı
  const summaryY = 30;
  const summCols = [
    { label: "Toplam Borc", value: `TL${player.totalOwed.toFixed(0)}`, color: [220, 38, 38] as [number, number, number] },
    { label: "Toplam Odeme", value: `TL${player.totalPaid.toFixed(0)}`, color: [5, 150, 105] as [number, number, number] },
    {
      label: "Bakiye",
      value: (player.balance < 0 ? "-" : player.balance > 0 ? "+" : "") + `TL${Math.abs(player.balance).toFixed(0)}`,
      color: (player.balance < 0 ? [220, 38, 38] : player.balance > 0 ? [5, 150, 105] : [100, 116, 139]) as [number, number, number],
    },
    { label: "Mac", value: String(player.matchCount), color: [30, 41, 59] as [number, number, number] },
  ];
  const colW = (210 - 28) / summCols.length;
  summCols.forEach((col, i) => {
    const x = 14 + i * colW;
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(col.label, x, summaryY);
    doc.setFontSize(12);
    doc.setTextColor(...col.color);
    doc.text(col.value, x, summaryY + 6);
  });

  // Maç Geçmişi – iptal ve silinmiş maçlar hariç
  const activeMatches = [...player.matchPlayers]
    .filter((mp) => !mp.match.cancelledAt)
    .sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());

  let curY = summaryY + 16;
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Mac Gecmisi", 14, curY);
  doc.setFont("helvetica", "normal");

  const matchRows = activeMatches.map((mp, i) => {
    const rating = player.ratingsByMatch?.[mp.match.id];
    return [
      i + 1,
      format(new Date(mp.match.date), "dd.MM.yyyy"),
      mp.match.location || "-",
      `TL${mp.amountOwed.toFixed(0)}`,
      rating != null ? (rating % 1 === 0 ? String(rating) : rating.toFixed(1)) : "-",
    ];
  });

  autoTable(doc, {
    startY: curY + 4,
    head: [["#", "Tarih", "Konum", "Borc", "Puan"]],
    body: matchRows.length > 0 ? matchRows : [["", "", "", "Mac yok", ""]],
    theme: "striped",
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 8.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 28 },
      2: { cellWidth: "auto" },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "center", cellWidth: 20 },
    },
  });

  // Ödeme Geçmişi
  const nonKasaPayments = player.payments
    .filter((p) => !p.isKasa)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const payY = finalY(doc) + 10;
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Odeme Gecmisi", 14, payY);
  doc.setFont("helvetica", "normal");

  const payRows = nonKasaPayments.map((p, i) => [
    i + 1,
    format(new Date(p.date), "dd.MM.yyyy"),
    `TL${p.amount.toFixed(0)}`,
    p.notes || "-",
    p.cancelledAt ? "Iptal" : "-",
  ]);

  autoTable(doc, {
    startY: payY + 4,
    head: [["#", "Tarih", "Tutar", "Not", "Durum"]],
    body: payRows.length > 0 ? payRows : [["", "", "", "Odeme yok", ""]],
    theme: "striped",
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 8.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 28 },
      2: { halign: "right", cellWidth: 26 },
      3: { cellWidth: "auto" },
      4: { halign: "center", cellWidth: 20 },
    },
    didParseCell(data) {
      if (data.column.index === 4 && data.section === "body" && data.cell.raw === "Iptal") {
        data.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  // ── SAYFA 2: Proforma Fatura ─────────────────────────────────────────────
  doc.addPage();
  addProformaPage(doc, player, activeMatches);

  const safeName = player.name
    .replace(/İ/g, "I").replace(/ı/g, "i")
    .replace(/Ğ/g, "G").replace(/ğ/g, "g")
    .replace(/Ş/g, "S").replace(/ş/g, "s")
    .replace(/Ç/g, "C").replace(/ç/g, "c")
    .replace(/Ö/g, "O").replace(/ö/g, "o")
    .replace(/Ü/g, "U").replace(/ü/g, "u")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  doc.save(`${safeName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

function addProformaPage(
  doc: jsPDF,
  player: PlayerDetail,
  activeMatches: PlayerDetail["matchPlayers"]
) {
  const W = 210;
  const H = 297;
  const m = 14; // margin

  // ── Arka plan ─────────────────────────────────────────────────────────────
  doc.setFillColor(...BG);
  doc.rect(0, 0, W, H, "F");

  const nowDate = new Date();
  const todayStr = format(nowDate, "dd.MM.yyyy");
  const dueStr = format(addDays(nowDate, 13), "dd.MM.yyyy");
  const invoiceNo = `PF-${String(player.matchCount).padStart(3, "0")}`;

  // ── BAŞLIK ────────────────────────────────────────────────────────────────
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("PROFORMA FATURA", m, 28);

  // Sağ bilgi kutusu
  const bx = 130, by = 10, bw = 66, bh = 35;
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.4);
  doc.rect(bx, by, bw, bh);

  const infoRows: [string, string][] = [
    ["Fatura Basligi:", "Futbol Mac Borcu"],
    ["Fatura Numarasi:", invoiceNo],
    ["Tarih:", todayStr],
    ["Vade Tarihi:", dueStr],
  ];
  infoRows.forEach(([label, value], i) => {
    labelValue(doc, bx + 3, by + 7 + i * 7, label, value, 8);
  });

  // Ayırıcı çizgi
  doc.setLineWidth(0.5);
  doc.line(m, 42, W - m, 42);

  // ── ALICI / SATICI ────────────────────────────────────────────────────────
  let ly = 50; // sol y
  let ry = 50; // sağ y

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("ALICI BILGILERI", m, ly);
  ly += 6;

  const aliciRows: [string, string][] = [
    ["Adi Soyadi:", player.name],
    ...(player.phone ? [["Telefon:", player.phone] as [string, string]] : []),
  ];
  aliciRows.forEach(([label, val]) => {
    labelValue(doc, m, ly, label, val);
    ly += 5.5;
  });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("SATICI BILGILERI", 110, ry);
  ry += 6;

  const saticiRows: [string, string][] = [
    ["Firma / Kisi Adi:", SELLER.name],
    ["Adres:", SELLER.address || "-"],
    ["Vergi Numarasi:", SELLER.taxNo || "-"],
    ["Telefon:", SELLER.phone || "-"],
    ["E-posta:", SELLER.email || "-"],
  ];
  saticiRows.forEach(([label, val]) => {
    labelValue(doc, 110, ry, label, val);
    ry += 5.5;
  });

  const afterParties = Math.max(ly, ry) + 6;
  doc.setLineWidth(0.3);
  doc.line(m, afterParties, W - m, afterParties);

  // ── KALEMLER TABLOSU ──────────────────────────────────────────────────────
  const total = activeMatches.reduce((s, mp) => s + mp.amountOwed, 0);

  const itemRows: (string | number | { content: string; colSpan?: number; styles?: object })[][] =
    activeMatches.map((mp, i) => {
      const loc = mp.match.location ? `${mp.match.location} Maci` : "Futbol Maci";
      const dateStr = format(new Date(mp.match.date), "dd.MM.yyyy");
      return [i + 1, `${dateStr} - ${loc}`, 1, `${mp.amountOwed.toFixed(0)} TRY`, `${mp.amountOwed.toFixed(0)} TRY`];
    });

  itemRows.push([
    { content: "", colSpan: 3, styles: { fillColor: BG } },
    "KDV %0",
    "0 TRY",
  ]);
  itemRows.push([
    { content: "Genel Toplam", colSpan: 3, styles: { fontStyle: "bold", fillColor: BG } },
    { content: "", styles: { fillColor: BG } },
    { content: `${total.toFixed(0)} TRY`, styles: { fontStyle: "bold", fillColor: BG } },
  ]);

  autoTable(doc, {
    startY: afterParties + 4,
    head: [["NO.", "URUN ADI", "MIKTAR", "BIRIM FIYATI", "TOPLAM FIYAT"]],
    body: itemRows,
    theme: "plain",
    headStyles: {
      fillColor: BG,
      textColor: DARK,
      fontSize: 8.5,
      fontStyle: "bold",
      lineWidth: 0.25,
      lineColor: DARK,
    },
    bodyStyles: {
      fillColor: BG,
      textColor: DARK,
      fontSize: 8.5,
      lineWidth: 0.2,
      lineColor: DARK,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 },
      1: { cellWidth: "auto" },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "right", cellWidth: 34 },
      4: { halign: "right", cellWidth: 34 },
    },
  });

  // ── ÖDEME BİLGİLERİ ───────────────────────────────────────────────────────
  const afterTable = finalY(doc);
  let py = afterTable + 12;

  doc.setLineWidth(0.3);
  doc.line(m, py - 4, W - m, py - 4);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("ODEME BILGILERI", m, py);
  py += 6;

  const odemeRows: [string, string][] = [
    ["Odeme Yontemi:", "Nakit/Kredi Karti/Havale"],
    ["Odeme Durumu:", player.balance < 0 ? "Odenmedi" : "Odendi"],
    ["Vade Tarihi:", dueStr],
    ["Aciklamalar:", "-"],
  ];
  odemeRows.forEach(([label, val]) => {
    labelValue(doc, m, py, label, val);
    py += 5.5;
  });

  // Sağ kolon – banka bilgileri
  let rpy = afterTable + 12 + 6;
  const bankRows: [string, string][] = [
    ["Odeme Sekli:", "Banka Havalesi"],
    ["Banka Bilgileri:", ""],
    ["Banka Adi:", SELLER.bank || "-"],
    ["IBAN:", SELLER.iban || "-"],
    ["Swift Kodu:", SELLER.swift || "-"],
  ];
  bankRows.forEach(([label, val]) => {
    labelValue(doc, 110, rpy, label, val);
    rpy += 5.5;
  });

  // ── İMZALAR ──────────────────────────────────────────────────────────────
  const sigLineY = Math.min(H - 22, Math.max(py, rpy) + 10);
  doc.setLineWidth(0.3);
  doc.line(m, sigLineY, W - m, sigLineY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Satici Imzasi:", 110, sigLineY + 10);
  doc.text("Alici Imzasi:", 158, sigLineY + 10);
}
