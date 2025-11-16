// src/pages/Dashboard.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";

/* ====== Data sources (folder data) ====== */
import TOKO_LABELS, { ALL_TOKO_IDS } from "../data/TokoLabels";
import { getStockIndex } from "../data/StockBarang";
import { getBrandIndex } from "../data/MasterDataHargaPenjualan";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ArcElement,
  Tooltip,
  Legend
);

/* ==== Konstanta nama PUSAT (samakan dengan StockBarang) ==== */
const CENTRAL_NAME = "PUSAT";

/* ==== Utils ==== */
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
function formatCurrency(n) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
  }
}

// cari ID toko berdasarkan label pada TOKO_LABELS
function getTokoIdByName(name) {
  const entries = Object.entries(TOKO_LABELS || {});
  const hit = entries.find(([, label]) => String(label) === String(name));
  return hit ? Number(hit[0]) : null;
}

/* ==== Loader setoran dari localStorage (hasil impor Keuangan) ==== */
// Mencoba beberapa key yang mungkin dipakai halaman Keuangan
const FIN_KEYS_REKAP = ["finance:rekap", "FINANCE_REKAP", "finance_rekap"];
const FIN_KEYS_DETAIL = ["finance:setoran", "FINANCE_SETORAN", "finance_detail"];

function safeParseJSON(str) {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch {
    return null;
  }
}

// Bentuk rekap ideal: {Tanggal:'YYYY-MM-DD', Toko:'CIRACAS', Kategori:'Cash|Kredit|...', Total:number}
function loadFinanceRekapFromLS() {
  // 1) Prioritas rekap
  for (const k of FIN_KEYS_REKAP) {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
    const parsed = raw ? safeParseJSON(raw) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed;
  }
  // 2) Jika tidak ada, coba bentuk detail lalu agregasikan
  for (const k of FIN_KEYS_DETAIL) {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
    const detail = raw ? safeParseJSON(raw) : null;
    if (Array.isArray(detail) && detail.length) {
      // Detail ideal: {Tanggal, Toko, Kategori, Jumlah}
      const map = new Map();
      for (const d of detail) {
        const tgl = d?.Tanggal || d?.tanggal || "";
        const toko = d?.Toko || d?.toko || "";
        const kat = d?.Kategori || d?.kategori || "Cash";
        const jml = toNum(d?.Jumlah ?? d?.jumlah);
        const key = `${tgl}||${toko}||${kat}`;
        map.set(key, (map.get(key) || 0) + jml);
      }
      return Array.from(map.entries()).map(([key, total]) => {
        const [Tanggal, Toko, Kategori] = key.split("||");
        return { Tanggal, Toko, Kategori, Total: total };
      });
    }
  }
  return []; // default kosong
}

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [showWhatsAppDropdown, setShowWhatsAppDropdown] = useState(false);

  const picContacts = [
    { name: "PIC Toko 1", phone: "6282211174447" },
    { name: "PIC Toko 2", phone: "6281234567891" },
    { name: "PIC Toko 3", phone: "6281234567892" },
    { name: "PIC Toko 4", phone: "6281234567893" },
    { name: "PIC Toko 5", phone: "6281234567894" },
    { name: "PIC Toko 6", phone: "6281234567895" },
    { name: "PIC Toko 7", phone: "6281234567896" },
    { name: "PIC Toko 8", phone: "6281234567897" },
    { name: "PIC Toko 9", phone: "6281234567898" },
    { name: "PIC Toko 10", phone: "6281234567899" },
  ];

  const handleWhatsAppClick = (phoneNumber) => {
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  };

  /* ================== Daftar toko (pusat + semua toko id) ================== */
  const STORES = useMemo(() => {
    const list = [
      { isCentral: true, tokoName: CENTRAL_NAME, id: null },
      ...(ALL_TOKO_IDS || []).map((id) => ({
        isCentral: false,
        id,
        tokoName: TOKO_LABELS?.[id],
      })),
    ];
    return list.filter((x) => x.tokoName);
  }, []);

  /* ================== Rekap stok per toko ================== */
  const storeSummaries = useMemo(() => {
    return STORES.map((s) => {
      const idx = getStockIndex(s.tokoName) || {};
      const hp = (idx.handphone || []).length;
      const molis = (idx.motor_listrik || []).length;
      const acc = (idx.accessories || []).length;
      const total = hp + molis + acc;
      return { ...s, hp, molis, acc, total };
    });
  }, [STORES]);

  const totalHP = useMemo(
    () => storeSummaries.reduce((a, r) => a + toNum(r.hp), 0),
    [storeSummaries]
  );
  const totalMolis = useMemo(
    () => storeSummaries.reduce((a, r) => a + toNum(r.molis), 0),
    [storeSummaries]
  );
  const totalAcc = useMemo(
    () => storeSummaries.reduce((a, r) => a + toNum(r.acc), 0),
    [storeSummaries]
  );
  const totalUnit = totalHP + totalMolis + totalAcc;

  /* ================== Katalog (varian) ================== */
  const brandIndex = useMemo(() => getBrandIndex() || [], []);
  const totalVarianKatalog = useMemo(() => {
    try {
      return brandIndex.reduce((sum, b) => sum + (b?.products?.length || 0), 0);
    } catch {
      return 0;
    }
  }, [brandIndex]);

  /* ================== Kartu ringkas stok/katalog ================== */
  const cards = [
    {
      title: `Stok Handphone : ${totalHP} unit`,
      color: "bg-blue-600",
      description: "Lihat stok & mutasi handphone (pusat)",
      route: "/stock-handphone-pusat",
    },
    {
      title: `Stok Motor Listrik : ${totalMolis} unit`,
      color: "bg-emerald-600",
      description: "Lihat stok & mutasi motor listrik (pusat)",
      route: "/stock-motor-listrik-pusat",
    },
    {
      title: `Stok Accessories : ${totalAcc} item`,
      color: "bg-amber-500",
      description: "Lihat stok & mutasi accessories (pusat)",
      route: "/stock-accessories-pusat",
    },
    {
      title: `Varian Katalog : ${totalVarianKatalog} tipe`,
      color: "bg-fuchsia-600",
      description: "Katalog master harga & varian",
      route: "/data-management",
    },
  ];

  /* ================== GRAFIK stok ================== */

  // 1) Bar: stok per toko per kategori
  const barData = useMemo(() => {
    const labels = storeSummaries.map((s) => s.tokoName);
    return {
      labels,
      datasets: [
        {
          label: "Handphone",
          data: storeSummaries.map((s) => s.hp),
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
        {
          label: "Motor Listrik",
          data: storeSummaries.map((s) => s.molis),
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
        },
        {
          label: "Accessories",
          data: storeSummaries.map((s) => s.acc),
          backgroundColor: "rgba(245, 158, 11, 0.6)",
          borderColor: "rgba(245, 158, 11, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [storeSummaries]);

  // 2) Doughnut: komposisi kategori global
  const doughnutData = useMemo(
    () => ({
      labels: ["Handphone", "Motor Listrik", "Accessories"],
      datasets: [
        {
          data: [totalHP, totalMolis, totalAcc],
          backgroundColor: [
            "rgba(59, 130, 246, 0.6)",
            "rgba(16, 185, 129, 0.6)",
            "rgba(245, 158, 11, 0.6)",
          ],
          hoverBackgroundColor: [
            "rgba(59, 130, 246, 1)",
            "rgba(16, 185, 129, 1)",
            "rgba(245, 158, 11, 1)",
          ],
        },
      ],
    }),
    [totalHP, totalMolis, totalAcc]
  );

  // 3) Pie: share stok antar toko
  const pieData = useMemo(() => {
    const labels = storeSummaries.map((s) => s.tokoName);
    const data = storeSummaries.map((s) => s.total);
    const base = [
      "rgba(99,102,241,0.6)",
      "rgba(244,63,94,0.6)",
      "rgba(34,197,94,0.6)",
      "rgba(14,165,233,0.6)",
      "rgba(234,179,8,0.6)",
      "rgba(168,85,247,0.6)",
      "rgba(251,146,60,0.6)",
      "rgba(20,184,166,0.6)",
      "rgba(244,114,182,0.6)",
      "rgba(107,114,128,0.6)",
      "rgba(2,132,199,0.6)",
      "rgba(22,163,74,0.6)",
    ];
    const bg = labels.map((_, i) => base[i % base.length]);
    const hover = bg.map((c) => c.replace("0.6", "1"));
    return {
      labels,
      datasets: [{ data, backgroundColor: bg, hoverBackgroundColor: hover }],
    };
  }, [storeSummaries]);

  // 4) Line: jumlah varian/produk per brand (dari katalog)
  const lineData = useMemo(() => {
    const labels = brandIndex.map((b) => b.brand);
    const values = brandIndex.map((b) => b?.products?.length || 0);
    return {
      labels,
      datasets: [
        {
          label: "Jumlah Varian per Brand",
          data: values,
          borderColor: "rgba(99, 102, 241, 1)",
          backgroundColor: "rgba(99, 102, 241, 0.15)",
          fill: true,
          tension: 0.25,
          pointRadius: 3,
        },
      ],
    };
  }, [brandIndex]);

  /* ==== opsi chart modern & ringkas ==== */
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.9)",
        titleColor: "#fff",
        bodyColor: "#e5e7eb",
        borderWidth: 0,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed?.y ?? ctx.parsed ?? 0;
            return ` ${ctx.dataset.label}: ${v.toLocaleString("id-ID")}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(148,163,184,0.15)" },
        ticks: { color: "#475569" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(148,163,184,0.15)" },
        ticks: { stepSize: 1, precision: 0, color: "#475569" },
      },
    },
  };

  /* ================== Export Rekap Stok ================== */
  const handleExportRekapStok = () => {
    const sheet = storeSummaries.map((s) => ({
      TOKO: s.tokoName,
      HANDPHONE: s.hp,
      MOTOR_LISTRIK: s.molis,
      ACCESSORIES: s.acc,
      TOTAL_UNIT: s.total,
    }));
    const ws = XLSX.utils.json_to_sheet(sheet);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Stok");
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(wb, `Rekap_Stok_${ymd}.xlsx`);
  };

  /* ================== Setoran Keuangan (bulan ini) ================== */
  const { setoranCards, grandTotalBulanIni } = useMemo(() => {
    const now = new Date();
    const ymKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    const rekap = loadFinanceRekapFromLS(); // array

    // Filter bulan ini
    const bulanIni = rekap.filter((r) => {
      const tg = String(r?.Tanggal || "").slice(0, 7);
      return tg === ymKey;
    });

    // Agregasi per toko
    const map = new Map(); // toko -> total
    for (const r of bulanIni) {
      const toko = r?.Toko || "";
      const total = toNum(r?.Total);
      map.set(toko, (map.get(toko) || 0) + total);
    }

    // Bangun kartu untuk semua toko (termasuk 0 jika belum ada setoran)
    const cards = (ALL_TOKO_IDS || []).map((id) => {
      const name = TOKO_LABELS?.[id];
      const val = toNum(map.get(name));
      return { id, tokoName: name, total: val };
    });

    const grand = cards.reduce((a, c) => a + toNum(c.total), 0);
    return { setoranCards: cards, grandTotalBulanIni: grand };
  }, []);

  const notSuperadmin = user?.role !== "superadmin";

  console.log("Cek-UserloggedId => "+ user);

  return (
    <div className="container p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Pusa Mila Phone</h1>
          <p className="text-slate-600">
            Selamat datang, {user?.username || user?.name || "User"} (Role:{" "}
            {user?.roles?.[0]?.name || "-"})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/keuangan")}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm shadow-sm"
          >
            Laporan Keuangan
          </button>
          <button
            onClick={handleExportRekapStok}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
            title="Export rekap stok semua toko (xlsx)"
          >
            Export Rekap Stok
          </button>
        </div>
      </div>

      {notSuperadmin && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800">
          Mode pusat menampilkan semua toko. Anda bukan superadmin, beberapa
          aksi mungkin tersembunyi (hanya tampilan ringkasan).
        </div>
      )}

      {/* WA PIC */}
      <div className="relative mt-3">
        <button
          onClick={() => setShowWhatsAppDropdown((v) => !v)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Kontak PIC Toko via WhatsApp
        </button>

        {showWhatsAppDropdown && (
          <div className="absolute z-10 mt-2 w-56 bg-white border rounded-lg shadow-lg right-0">
            {picContacts.map((pic, index) => (
              <button
                key={index}
                onClick={() => handleWhatsAppClick(pic.phone)}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                {pic.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kartu ringkas stok/katalog (pusat) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg shadow-lg ${card.color} text-white cursor-pointer`}
            onClick={() => navigate(card.route)}
          >
            <h2 className="text-2xl font-bold mb-2">{card.title}</h2>
            <p className="opacity-90">{card.description}</p>
          </div>
        ))}
      </div>

      {/* ==== KARTU SETORAN KEUANGAN PER TOKO (bulan ini) ==== */}
      <div className="rounded-xl border bg-white p-4 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Setoran Keuangan — Bulan Ini</h2>
          <div className="text-sm text-slate-600">
            Total Setoran Bulan Ini:{" "}
            <span className="font-semibold">{formatCurrency(grandTotalBulanIni)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {setoranCards.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                const fallbackId = (c.id ?? getTokoIdByName(c.tokoName)) ?? 1;
                navigate(`/toko/${fallbackId}`);
              }}
              className="group relative rounded-2xl p-[2px] bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 hover:shadow-lg"
              title={`Buka Dashboard ${c.tokoName}`}
            >
              <div className="rounded-2xl bg-white p-5 flex items-center justify-between">
                <div className="text-left">
                  <div className="text-sm text-slate-600">{c.tokoName}</div>
                  <div className="text-xl font-bold">{formatCurrency(c.total)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Bulan berjalan</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 opacity-80 group-hover:opacity-100 transition shadow-lg" />
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-30 blur-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 transition" />
            </button>
          ))}

          {setoranCards.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-6">
              Belum ada setoran yang diimpor bulan ini.
            </div>
          )}
        </div>
      </div>

      {/* Rekap cepat per toko (stok) */}
      <div className="rounded-xl border bg-white p-4 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Rekap Stok — Semua Toko</h2>
          <div className="text-sm text-slate-600">
            Total Unit:{" "}
            <span className="font-semibold">
              {totalUnit} (HP {totalHP} • Molis {totalMolis} • Acc {totalAcc})
            </span>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm mt-6 overflow-x-auto">
          <table className="min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Toko</th>
                <th className="px-3 py-2 text-right">Handphone</th>
                <th className="px-3 py-2 text-right">Motor Listrik</th>
                <th className="px-3 py-2 text-right">Accessories</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {storeSummaries.map((s) => (
                <tr key={s.tokoName} className="border-b last:border-0">
                  <td className="px-3 py-2">{TOKO_LABELS?.[s.id] || s.tokoName}</td>
                  <td className="px-3 py-2 text-right">{s.hp}</td>
                  <td className="px-3 py-2 text-right">{s.molis}</td>
                  <td className="px-3 py-2 text-right">{s.acc}</td>
                  <td className="px-3 py-2 text-right font-semibold">{s.total}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {s.isCentral ? (
                        <>
                          <button
                            onClick={() => navigate("/stock-handphone")}
                            className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            HP (Pusat)
                          </button>
                          <button
                            onClick={() => navigate("/stock-motor-listrik")}
                            className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Molis (Pusat)
                          </button>
                          <button
                            onClick={() => navigate("/stock-accessories")}
                            className="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600"
                          >
                            Acc (Pusat)
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            const fallbackId = (s.id ?? getTokoIdByName(s.tokoName)) ?? 1;
                            navigate(`/toko/${fallbackId}`);
                          }}
                          className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                          title="Buka Dashboard Toko"
                        >
                          Buka Dashboard Toko
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {storeSummaries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    Belum ada data stok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== Grafik: modern, dinamis, tidak memanjang ====== */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Grafik Ringkas</h2>

        {/* gunakan auto-fit agar responsif dan rapi */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {/* Bar */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-slate-500">Visualisasi</div>
                <div className="font-semibold">Stok per Toko</div>
              </div>
            </div>
            <div className="relative h-72 md:h-80">
              <Bar data={barData} options={commonOptions} />
            </div>
          </div>

          {/* Line */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-slate-500">Katalog</div>
                <div className="font-semibold">Varian per Brand</div>
              </div>
            </div>
            <div className="relative h-72 md:h-80">
              <Line
                data={lineData}
                options={{
                  ...commonOptions,
                  elements: { line: { borderWidth: 2 } },
                }}
              />
            </div>
          </div>

          {/* Pie */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-slate-500">Distribusi</div>
                <div className="font-semibold">Share Stok antar Toko</div>
              </div>
            </div>
            <div className="relative h-72 md:h-80">
              <Pie
                data={pieData}
                options={{
                  ...commonOptions,
                  scales: undefined, // pie tidak butuh axes
                  plugins: { ...commonOptions.plugins, legend: { position: "bottom" } },
                }}
              />
            </div>
          </div>

          {/* Doughnut */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-slate-500">Komposisi</div>
                <div className="font-semibold">Kategori Global</div>
              </div>
            </div>
            <div className="relative h-72 md:h-80">
              <Doughnut
                data={doughnutData}
                options={{
                  ...commonOptions,
                  scales: undefined,
                  plugins: { ...commonOptions.plugins, legend: { position: "bottom" } },
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* ====== /Grafik ====== */}
    </div>
  );
}
