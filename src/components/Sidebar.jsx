// src/components/Sidebar.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import "./Sidebar.css";

// Icons
import {
  FaHome,
  FaMobileAlt,
  FaMotorcycle,
  FaToolbox,
  FaClipboardList,
  FaStore,
  FaUsers,
  FaShoppingCart,
  FaCartPlus,
  FaMoneyCheckAlt,
  FaCashRegister,
  FaCogs, // ⟵ added for Sparepart
} from "react-icons/fa";
import { AiFillPhone, AiOutlineDatabase } from "react-icons/ai";
import { BsGraphUp, BsTagsFill, BsFileEarmarkText } from "react-icons/bs";
import { MdBuild } from "react-icons/md";
import { FiBox } from "react-icons/fi";

// Labels toko
import TOKO_LABELS, { ALL_TOKO_IDS } from "../data/TokoLabels";

const Sidebar = ({ role, toko, onLogout }) => {

  const raw = localStorage.getItem("userInfoLogedIn");
  const userLoggedIdDtls = raw ? JSON.parse(raw) : null;
  const user_role_name = userLoggedIdDtls?.roles?.[0]?.name || "NO_ROLE";

  // console.log("userLoggedId-Sidebarr => " + userLoggedIdDtls) ;
  // console.log("user_role_namess=> " + user_role_name) ;
  

  // ===== Role helpers =====
  const isSuperLike = user_role_name === "SUPER_ADMIN" || role === "PIC_TOKO";
  const picMatch = /^pic_toko(\d+)$/i.exec(role || "");
  const picTokoId = picMatch ? Number(picMatch[1]) : toko ? Number(toko) : null;

  // ===== State (submenu) =====
  const [showSubMenuService, setShowSubMenuService] = useState(false);
  const [showSubMenulaporan, setShowSubMenulaporan] = useState(false);
  const [showSubMenuPenjualan, setShowSubMenuPenjualan] = useState(false);
  const [showSubMenuPembelian, setShowSubMenuPembelian] = useState(false);
  const [showSubMenuStock, setShowSubMenuStock] = useState(false);
  const [showSubMenuStruk, setShowSubMenuStruk] = useState(false);
  const [showSubMenuDashboardToko, setShowSubMenuDashboardToko] = useState(!isSuperLike);

  // ===== Mobile Off-canvas =====
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef(null);

  // Refs untuk kontainer scroll (mobile & desktop) + list wrapper
  const scrollRefMobile = useRef(null);
  const scrollRefDesktop = useRef(null);
  const listRefMobile = useRef(null);
  const listRefDesktop = useRef(null);

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Trap focus (sederhana) saat mobile open
  useEffect(() => {
    if (!mobileOpen || !panelRef.current) return;
    const first = panelRef.current.querySelector("a,button,input,select");
    first?.focus();
  }, [mobileOpen]);

  // ===== Daftar toko yang ditampilkan =====
  const visibleTokoIds = isSuperLike ? ALL_TOKO_IDS : picTokoId ? [picTokoId] : [];

  const handleLogout = () => {
    try {
      localStorage.removeItem("user");
    } finally {
      if (typeof onLogout === "function") onLogout();
    }
  };

  // ===== Efek Glow Dinamis + IntersectionObserver (mobile & desktop) =====
  useEffect(() => {
    // utility untuk setup pada satu kontainer scroll
    const setupScrollGlow = (el, listEl) => {
      if (!el || !listEl) return () => {};

      let raf = null;

      const applyGlow = () => {
        const max = Math.max(1, el.scrollHeight - el.clientHeight);
        const top = el.scrollTop;
        const t = Math.min(1, Math.max(0, top / max)); // 0..1

        // Opacity glow: muncul jika bisa di-scroll ke atas/bawah
        const topOpacity = top > 0 ? 0.35 : 0.0;
        const bottomOpacity = top < max ? 0.35 : 0.0;

        // Warna hue dinamis: biru→ungu (atas), teal→biru (bawah), mengikuti t
        const hueTop = 200 + 100 * t; // 200..300
        const hueBottom = 170 + 50 * t; // 170..220

        el.style.setProperty("--glowTopOpacity", String(topOpacity));
        el.style.setProperty("--glowBottomOpacity", String(bottomOpacity));
        el.style.setProperty("--glowHueTop", String(hueTop));
        el.style.setProperty("--glowHueBottom", String(hueBottom));
      };

      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          applyGlow();
        });
      };

      const ro = new ResizeObserver(() => applyGlow());
      el.addEventListener("scroll", onScroll, { passive: true });
      ro.observe(el);
      applyGlow();

      // IntersectionObserver untuk highlight item “di zona fokus”
      const io = new IntersectionObserver(
        (entries) => {
          listEl.querySelectorAll(".in-focus").forEach((n) => n.classList.remove("in-focus"));
          const best = entries.reduce(
            (acc, e) => (e.intersectionRatio > (acc?.intersectionRatio ?? 0) ? e : acc),
            null
          );
          if (best?.isIntersecting) {
            const item = best.target.closest("a,button,li");
            item?.classList?.add("in-focus");
          }
        },
        {
          root: el,
          threshold: [0.25, 0.5, 0.75],
          rootMargin: "-25% 0% -25% 0%",
        }
      );

      listEl.querySelectorAll("a, button").forEach((n) => io.observe(n));

      return () => {
        el.removeEventListener("scroll", onScroll);
        ro.disconnect();
        io.disconnect();
        if (raf) cancelAnimationFrame(raf);
      };
    };

    const cleanups = [];

    // Setup untuk desktop
    if (scrollRefDesktop.current && listRefDesktop.current) {
      cleanups.push(setupScrollGlow(scrollRefDesktop.current, listRefDesktop.current));
    }
    // Setup untuk mobile
    if (scrollRefMobile.current && listRefMobile.current) {
      cleanups.push(setupScrollGlow(scrollRefMobile.current, listRefMobile.current));
    }

    return () => cleanups.forEach((fn) => fn && fn());
  }, []);

  // ===== Sidebar content (dipakai mobile & desktop) =====
  const SidebarBody = () => (
    <>
      <img src="/logoMMT.png" alt="Logo" className="logo mb-1" />
      <div className="font-bold p-1">
        <h2 className="text-gray-200 text-center text-sm">PT. MILA MEDIA TELEKOMUNIKASI</h2>
      </div>

      <nav className="mt-2 font-bold">
        {/* ====== MODE SUPERADMIN / ADMIN ====== */}
        {isSuperLike ? (
          <>
            {/* DASHBOARD PUSAT */}
            <Link to="/dashboard" className="flex items-center p-3 hover:bg-blue-500">
              <FaHome className="text-xl" />
              <span className="ml-2">DASHBOARD PUSAT</span>
            </Link>

            {/* DASHBOARD TOKO */}
            <button
              onClick={() => setShowSubMenuDashboardToko(!showSubMenuDashboardToko)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <FaStore className="text-xl" />
              <span className="ml-2">DASHBOARD TOKO</span>
            </button>
            {showSubMenuDashboardToko && (
              <ul className="pl-6">
                {visibleTokoIds.map((id) => (
                  <li key={id}>
                    <Link
                      to={`/toko/${id}`}
                      className="flex items-center p-2 hover:bg-blue-500"
                      title={`Buka Dashboard ${TOKO_LABELS[id]}`}
                    >
                      <FaStore className="text-sm" />
                      <span className="ml-2">{TOKO_LABELS[id]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* LAPORAN */}
            <button
              onClick={() => setShowSubMenulaporan(!showSubMenulaporan)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <BsFileEarmarkText className="text-xl" />
              <span className="ml-2">LAPORAN</span>
            </button>
            {showSubMenulaporan && (
              <ul className="pl-6">
                <li>
                  <Link to="/sales-report" className="flex items-center p-2 hover:bg-blue-500">
                    <BsGraphUp className="text-lg" />
                    <span className="ml-2">Laporan Penjualan</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/inventory-report"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <BsTagsFill className="text-lg" />
                    <span className="ml-2">Laporan Persediaan</span>
                  </Link>
                </li>
                <li>
                  <Link to="/finance-report" className="flex items-center p-2 hover:bg-blue-500">
                    <FaClipboardList className="text-lg" />
                    <span className="ml-2">Laporan Keuangan</span>
                  </Link>
                </li>
             
              </ul>
            )}

            {/* PENJUALAN */}
            <button
              onClick={() => setShowSubMenuPenjualan(!showSubMenuPenjualan)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <FaShoppingCart className="text-xl" />
              <span className="ml-2">PENJUALAN</span>
            </button>
            {showSubMenuPenjualan && (
              <ul className="pl-6">
                <li>
                  <Link to="/input-penjualan" className="flex items-center p-2 hover:bg-blue-500">
                    <FaClipboardList className="text-lg" />
                    <span className="ml-2">Input Penjualan</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/penjualan-handphone"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <FaMobileAlt className="text-lg" />
                    <span className="ml-2">Handphone</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/penjualan-motor-listrik"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <FaMotorcycle className="text-lg" />
                    <span className="ml-2">Motor Listrik</span>
                  </Link>
                </li>
                <li>
                  <Link to="/accessories" className="flex items-center p-2 hover:bg-blue-500">
                    <FaToolbox className="text-lg" />
                    <span className="ml-2">Accessories</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* PEMBELIAN */}
            <button
              onClick={() => setShowSubMenuPembelian(!showSubMenuPembelian)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <FaCartPlus className="text-xl" />
              <span className="ml-2">PEMBELIAN</span>
            </button>
            {showSubMenuPembelian && (
              <ul className="pl-6">
                <li>
                  <Link
                    to="/pembelian-produk-pusat"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <FiBox className="text-lg" />
                    <span className="ml-2">Pembelian Produk Pusat</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* SERVICE */}
            <button
              onClick={() => setShowSubMenuService(!showSubMenuService)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <MdBuild className="text-xl" />
              <span className="ml-2">SERVICE</span>
            </button>
            {showSubMenuService && (
              <ul className="pl-6">
                <li>
                  <Link to="/service-handphone" className="flex items-center p-2 hover:bg-blue-500">
                    <AiFillPhone className="text-lg" />
                    <span className="ml-2">Service Handphone</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/service-motor-listrik"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <FaMotorcycle className="text-lg" />
                    <span className="ml-2">Service Motor Listrik</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* PRODUK & STOCK */}
            <button
              onClick={() => setShowSubMenuStock(!showSubMenuStock)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <FiBox className="text-xl" />
              <span className="ml-2">PRODUK DAN STOCK</span>
            </button>
            {showSubMenuStock && (
              <ul className="pl-6">
                <li>
                  <Link
                    to="/stock-handphone-pusat"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <FaMobileAlt className="text-lg" />
                    <span className="ml-2">Handphone</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/stock-motor-listrik-pusat"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <FaMotorcycle className="text-lg" />
                    <span className="ml-2">Motor Listrik</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/stock-accessories-pusat"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <FaToolbox className="text-lg" />
                    <span className="ml-2">Accessories</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* MODUL SPAREPART (new) */}
            <Link to="/modul-sparepart" className="flex items-center p-3 hover:bg-blue-500">
              <FaCogs className="text-xl" />
              <span className="ml-2">MODUL SPAREPART</span>
            </Link>

            {/* KEUANGAN */}
            <Link to="/Finance-report" className="flex items-center p-3 hover:bg-blue-500">
              <FaMoneyCheckAlt className="text-xl" />
              <span className="ml-2">KEUANGAN</span>
            </Link>
            <Link to="/Finance-report-monthly" className="flex items-center p-3 hover:bg-blue-500">
              <FaMoneyCheckAlt className="text-xl" />
              <span className="ml-2">REKAP KEUANGAN</span>
            </Link>

            {/* USER MANAGEMENT */}
            <Link to="/user-management" className="flex items-center p-3 hover:bg-blue-500">
              <FaUsers className="text-xl" />
              <span className="ml-2">USER MANAGEMENT</span>
            </Link>

            {/* MASTER DATA */}
            <Link to="/data-management" className="flex items-center p-3 hover:bg-blue-500">
              <AiOutlineDatabase className="text-xl" />
              <span className="ml-2">MASTER DATA</span>
            </Link>

            {/* CETAK FAKTUR */}
            <button
              onClick={() => setShowSubMenuStruk(!showSubMenuStruk)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <FaCashRegister className="mr-2" />
              <span className="ml-2">CETAK FAKTUR</span>
            </button>
            {showSubMenuStruk && (
              <ul className="pl-6">
                   {/* Transfer Pusat */}
                   <li>
                  <Link
                    to="/transfer-barang-pusat"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <FiBox className="text-lg" />
                    <span className="ml-2">Transfer Barang Gudang Pusat Mila Phone</span>
                  </Link>
                </li>
                <li>
                  <Link to="/struk-penjualan" className="block pl-6 py-1 hover:bg-blue-600 rounded">
                    Struk Faktur Penjualan
                  </Link>
                </li>
                <li>
                  <Link
                    to="/struk-penjualan-imei"
                    className="block pl-6 py-1 hover:bg-blue-600 rounded"
                  >
                    Struk Faktur Penjualan IMEI
                  </Link>
                </li>
                <li>
                  <Link to="/surat-jalan" className="block pl-6 py-1 hover:bg-blue-600 rounded">
                    Surat Jalan
                  </Link>
                </li>
                <li>
                  <Link to="/invoice" className="block pl-6 py-1 hover:bg-blue-600 rounded">
                    Invoice
                  </Link>
                </li>
              </ul>
            )}
          </>
        ) : (
          // ====== MODE PIC TOKO ======
          <>
            {/* DASHBOARD TOKO */}
            <button
              onClick={() => setShowSubMenuDashboardToko(!showSubMenuDashboardToko)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
              title="Dashboard Toko"
            >
              <FaStore className="text-xl" />
              <span className="ml-2">DASHBOARD TOKO</span>
            </button>
            {showSubMenuDashboardToko && (
              <ul className="pl-6">
                {visibleTokoIds.length === 1 ? (
                  <li>
                    <Link
                      to={`/toko/${visibleTokoIds[0]}`}
                      className="flex items-center p-2 hover:bg-blue-500"
                      title={`Buka Dashboard ${TOKO_LABELS[visibleTokoIds[0]]}`}
                    >
                      <FaStore className="text-sm" />
                      <span className="ml-2">{TOKO_LABELS[visibleTokoIds[0]]}</span>
                    </Link>
                  </li>
                ) : (
                  <li className="p-2 text-xs text-yellow-100/90">
                    Akun PIC belum terhubung ke toko mana pun.
                  </li>
                )}
              </ul>
            )}

            {/* SERVICE */}
            <button
              onClick={() => setShowSubMenuService(!showSubMenuService)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <MdBuild className="text-xl" />
              <span className="ml-2">SERVICE</span>
            </button>
            {showSubMenuService && (
              <ul className="pl-6">
                <li>
                  <Link to="/service-handphone" className="flex items-center p-2 hover:bg-blue-500">
                    <AiFillPhone className="text-lg" />
                    <span className="ml-2">Service Handphone</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/service-motor-listrik"
                    className="flex items-center p-2 hover:bg-blue-500"
                  >
                    <FaMotorcycle className="text-lg" />
                    <span className="ml-2">Service Motor Listrik</span>
                  </Link>
                </li>
              </ul>
            )}

            {/* MODUL SPAREPART (new) */}
            <Link to="/modul-sparepart" className="flex items-center p-3 hover:bg-blue-500">
              <FaCogs className="text-xl" />
              <span className="ml-2">MODUL SPAREPART</span>
            </Link>

            {/* CETAK FAKTUR */}
            <button
              onClick={() => setShowSubMenuStruk(!showSubMenuStruk)}
              className="w-full flex items-center p-3 hover:bg-blue-500 text-left"
            >
              <FaCashRegister className="mr-2" />
              <span className="ml-2">CETAK FAKTUR</span>
            </button>
            {showSubMenuStruk && (
              <ul className="pl-6">
                <li>
                  <Link to="/struk-penjualan" className="block pl-6 py-1 hover:bg-blue-600 rounded">
                    Struk Faktur Penjualan
                  </Link>
                </li>
                <li>
                  <Link
                    to="/struk-penjualan-imei"
                    className="block pl-6 py-1 hover:bg-blue-600 rounded"
                  >
                    Struk Faktur Penjualan IMEI
                  </Link>
                </li>
                <li>
                  <Link to="/surat-jalan" className="block pl-6 py-1 hover:bg-blue-600 rounded">
                    Surat Jalan
                  </Link>
                </li>
                <li>
                  <Link to="/invoice" className="block pl-6 py-1 hover:bg-blue-600 rounded">
                    Invoice
                  </Link>
                </li>
              </ul>
            )}
          </>
        )}
      </nav>

      {/* Tombol Keluar */}
      <div className="p-4 mt-auto">
        <button type="button" onClick={handleLogout} className="logout-btn">
          <LogOut size={18} className="logout-icon" />
          <span>Keluar</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* TOP BAR (Mobile) */}
      <div className="lg:hidden sticky top-0 z-[60] bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="h-12 flex items-center justify-between px-3">
          <button
            aria-label="Buka menu"
            className="hamburger-btn"
            onClick={() => setMobileOpen(true)}
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
          <div className="text-sm font-semibold text-slate-700">Menu</div>
          <div className="w-8" />
        </div>
      </div>

      {/* OVERLAY (Mobile) */}
      <div
        className={`sidebar-overlay lg:hidden ${mobileOpen ? "show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* PANEL (Mobile) */}
      <aside
        ref={panelRef}
        className={`sidebar-panel lg:hidden ${mobileOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigasi"
      >
        <div className="bg-blue-700 w-64 h-full text-white flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="font-semibold">Navigasi</span>
            <button className="close-btn" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
              ✕
            </button>
          </div>

          {/* scrollable */}
          <div ref={scrollRefMobile} className="custom-scroll overflow-y-auto flex-1">
            <div ref={listRefMobile} className="px-0">
              <SidebarBody />
            </div>
          </div>
        </div>
      </aside>

      {/* SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex bg-blue-700 w-64 h-screen sticky top-0 text-white z-40">
        {/* scrollable */}
        <div ref={scrollRefDesktop} className="custom-scroll overflow-y-auto flex flex-col w-full">
          <div ref={listRefDesktop}>
            <SidebarBody />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
