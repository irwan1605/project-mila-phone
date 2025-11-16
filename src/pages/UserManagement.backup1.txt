// src/pages/UserManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import TOKO_LABELS from "../data/TokoLabels";
import defaultUsers from "../data/UserManagementRole";

/* ====== Daftar toko: id -> label ====== */
const tokoEntries = Object.entries(TOKO_LABELS)
  .map(([id, label]) => ({ id: Number(id), label }))
  .sort((a, b) => a.id - b.id);

/* ====== Helper role ====== */
// Normalisasi role/toko dari user record
function rolePieces(role, toko) {
  if ((role || "").toLowerCase() === "superadmin" || (role || "").toLowerCase() === "admin") {
    return { base: "admin_like", tokoId: null };
  }
  if ((role || "").startsWith("pic_toko")) {
    const idNum = Number(String(role).replace("pic_toko", "")) || Number(toko) || null;
    return { base: "pic_toko", tokoId: Number.isFinite(idNum) ? idNum : null };
  }
  return { base: "other", tokoId: null };
}

export default function UserManagement() {
  /* ====== Sumber data users ====== */
  const [users, setUsers] = useState(() => {
    try {
      const ls = JSON.parse(localStorage.getItem("users"));
      return Array.isArray(ls) && ls.length ? ls : defaultUsers;
    } catch {
      return defaultUsers;
    }
  });

  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
  }, [users]);

  /* ====== Form tambah ====== */
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    roleBase: "pic_toko", // "superadmin" | "pic_toko"
    tokoId: tokoEntries[0]?.id ?? 1,
  });

  const resetForm = () =>
    setForm({
      name: "",
      username: "",
      password: "",
      roleBase: "pic_toko",
      tokoId: tokoEntries[0]?.id ?? 1,
    });

  const addUser = () => {
    const username = (form.username || "").trim();
    const password = (form.password || "").trim();
    if (!username || !password) {
      alert("Username & Password wajib diisi.");
      return;
    }
    if (users.some((u) => (u.username || "").trim().toLowerCase() === username.toLowerCase())) {
      alert("Username sudah dipakai.");
      return;
    }

    let final;
    if (form.roleBase === "superadmin") {
      final = {
        username,
        password,
        role: "superadmin",
        toko: null,
        name: form.name?.trim() || username,
      };
    } else {
      const tokoId = form.tokoId ?? tokoEntries[0]?.id ?? 1;
      final = {
        username,
        password,
        role: `pic_toko${tokoId}`, // <<< konsisten numerik
        toko: tokoId,              // <<< simpan ID juga
        name: form.name?.trim() || username,
      };
    }
    setUsers((prev) => [final, ...prev]);
    resetForm();
  };

  /* ====== Edit user ====== */
  const [editing, setEditing] = useState(null); // username yang sedang diedit
  const [draft, setDraft] = useState(null);

  const beginEdit = (u) => {
    const rp = rolePieces(u.role, u.toko);
    setEditing(u.username);
    setDraft({
      username: u.username,
      password: u.password || "",
      name: u.name || u.nama || "",
      roleBase: rp.base === "pic_toko" ? "pic_toko" : "superadmin",
      tokoId: rp.tokoId ?? tokoEntries[0]?.id ?? 1,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!draft) return;
    const password = (draft.password || "").trim();
    if (!password) {
      alert("Password tidak boleh kosong.");
      return;
    }

    const updated =
      draft.roleBase === "superadmin"
        ? {
            role: "superadmin",
            toko: null,
            name: draft.name || "",
            password,
          }
        : {
            role: `pic_toko${draft.tokoId}`,
            toko: draft.tokoId,
            name: draft.name || "",
            password,
          };

    setUsers((prev) =>
      prev.map((u) => (u.username === editing ? { ...u, ...updated } : u))
    );
    cancelEdit();
  };

  const del = (u) => {
    if (!window.confirm(`Hapus user "${u.username}"?`)) return;
    setUsers((prev) => prev.filter((x) => x.username !== u.username));
  };

  /* ====== Filter & search ====== */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterTokoId, setFilterTokoId] = useState("all");

  const filteredUsers = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return (users || [])
      .filter((u) => {
        const rp = rolePieces(u.role, u.toko);
        if (filterRole !== "all") {
          if (filterRole === "superadmin" && rp.base !== "admin_like") return false;
          if (filterRole === "pic_toko" && rp.base !== "pic_toko") return false;
        }
        if (filterTokoId !== "all" && rp.base === "pic_toko") {
          if (Number(filterTokoId) !== Number(rp.tokoId)) return false;
        }
        if (!s) return true;
        const tokoLabel = rp.tokoId ? TOKO_LABELS[rp.tokoId] || `Toko ${rp.tokoId}` : "—";
        const hay =
          [u.username, u.name || u.nama, u.role, String(rp.tokoId || ""), tokoLabel]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => (a.username || "").localeCompare(b.username || ""));
  }, [users, searchTerm, filterRole, filterTokoId]);

  /* ====== Pagination ====== */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / pageSize)),
    [filteredUsers.length, pageSize]
  );
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
  const pageUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  /* ====== Ringkasan ====== */
  const countByRole = useMemo(() => {
    const acc = { superadmin: 0, pic_toko: 0 };
    for (const u of users) {
      const rp = rolePieces(u.role, u.toko);
      if (rp.base === "admin_like") acc.superadmin += 1;
      else if (rp.base === "pic_toko") acc.pic_toko += 1;
    }
    return acc;
  }, [users]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
        <p className="text-slate-600">
          Kelola pengguna, password, role, dan akses toko. Role <code>pic_toko</code> disimpan sebagai{" "}
          <code>pic_toko&lt;ID&gt;</code> dan field <code>toko</code> = ID numerik agar guard konsisten.
        </p>
      </div>

      {/* ====== Form Tambah ====== */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Tambah User</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Nama Lengkap (opsional)</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama lengkap"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Username</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Password</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="password"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Role</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.roleBase}
              onChange={(e) => setForm({ ...form, roleBase: e.target.value })}
            >
              <option value="pic_toko">pic_toko</option>
              <option value="superadmin">superadmin</option>
            </select>
          </div>

          {form.roleBase !== "superadmin" && (
            <div>
              <label className="text-xs text-slate-600">Toko (PIC)</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.tokoId}
                onChange={(e) => setForm({ ...form, tokoId: Number(e.target.value) })}
              >
                {tokoEntries.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-3">
          <button
            onClick={addUser}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
          >
            Tambah
          </button>
        </div>
      </div>

      {/* ====== Tabel Users ====== */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Daftar User</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded bg-slate-100">Superadmin: {countByRole.superadmin}</span>
            <span className="px-2 py-1 rounded bg-slate-100">PIC Toko: {countByRole.pic_toko}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <input
            className="border rounded px-2 py-1 md:col-span-2"
            placeholder="Cari…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border rounded px-2 py-1"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">Semua Role</option>
            <option value="superadmin">Superadmin/Admin</option>
            <option value="pic_toko">PIC Toko</option>
          </select>
          <select
            className="border rounded px-2 py-1"
            value={filterTokoId}
            onChange={(e) => setFilterTokoId(e.target.value)}
          >
            <option value="all">Semua Toko (PIC)</option>
            {tokoEntries.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <div className="md:col-span-3 text-right text-sm text-slate-600">
            Total: {filteredUsers.length} user
          </div>
        </div>

 <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[800px] text-sm rounded-2xl border bg-white p-4 shadow-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Username</th>
                <th className="px-3 py-2 text-left">Nama</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Toko</th>
                <th className="px-3 py-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.map((u) => {
                const rp = rolePieces(u.role, u.toko);
                const tokoLabel = rp.tokoId ? TOKO_LABELS[rp.tokoId] : "—";
                const isEditing = editing === u.username;

                if (isEditing && draft) {
                  return (
                    <tr key={u.username} className="border-b last:border-0 bg-slate-50">
                      <td className="px-3 py-2">{u.username}</td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1"
                          value={draft.name}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={draft.roleBase}
                          onChange={(e) => setDraft({ ...draft, roleBase: e.target.value })}
                        >
                          <option value="pic_toko">pic_toko</option>
                          <option value="superadmin">superadmin</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {draft.roleBase === "pic_toko" ? (
                          <select
                            className="border rounded px-2 py-1"
                            value={draft.tokoId}
                            onChange={(e) =>
                              setDraft({ ...draft, tokoId: Number(e.target.value) })
                            }
                          >
                            {tokoEntries.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200"
                          >
                            Batal
                          </button>
                          <input
                            className="hidden"
                            type="password"
                            value={draft.password}
                            onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={u.username} className="border-b last:border-0">
                    <td className="px-3 py-2">{u.username}</td>
                    <td className="px-3 py-2">{u.name || u.nama || "-"}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">{tokoLabel}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => beginEdit(u)}
                          className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => del(u)}
                          className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {pageUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Belum ada user yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* pager */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span>Baris/hal:</span>
            <select
              className="border rounded px-2 py-1"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded border disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              className="px-2 py-1 rounded border disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
