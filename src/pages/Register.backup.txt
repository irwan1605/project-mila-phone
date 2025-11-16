// src/pages/Register.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import userRoles from "../data/UserManagementRole";
import TOKO_LABELS from "../data/TokoLabels";

// Buat reverse map: Nama Toko -> ID
const NAME_TO_ID = Object.fromEntries(
  Object.entries(TOKO_LABELS).map(([id, label]) => [label.toUpperCase(), Number(id)])
);

export default function Register({ addUser }) {
  // Ambil nama-nama toko unik dari master user (abaikan ALL/superadmin)
  const tokoNames = useMemo(() => {
    const names = (userRoles || [])
      .map((u) => (u && u.toko ? String(u.toko).trim() : ""))
      .filter(Boolean)
      .filter((t) => t.toUpperCase() !== "ALL");
    return Array.from(new Set(names));
  }, []);

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "pic_toko",             // "pic_toko" | "superadmin"
    tokoName: tokoNames[0] || "", // simpan pilihan user sebagai nama
    name: "",
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    setError("");
    const { username, password, role, tokoName, name } = form;

    if (!username || !password) {
      setError("Username & password wajib diisi.");
      return;
    }

    // Cari ID toko dari nama (harus ada di TokoLabels)
    let tokoId = null;
    let finalRole = "superadmin";
    let finalTokoName = "ALL";

    if (role !== "superadmin") {
      const id = NAME_TO_ID[(tokoName || "").toUpperCase()];
      if (!id) {
        setError("Nama toko tidak dikenali. Pastikan nama toko ada di TokoLabels.");
        return;
      }
      tokoId = id;
      finalRole = `pic_toko${id}`;  // ← kompatibel dengan seluruh app
      finalTokoName = tokoName;
    }

    const newUser = {
      username: username.trim(),
      password,
      role: finalRole,
      toko: tokoId,             // simpan ID (kompat)
      tokoId,                   // eksplisit
      tokoName: finalTokoName,  // simpan juga nama agar enak ditampilkan
      name: name?.trim() || username.trim(),
      nama: name?.trim() || username.trim(), // kompat alias
    };

    // Simpan ke localStorage.users (dengan validasi username unik)
    try {
      const ls = JSON.parse(localStorage.getItem("users")) || [];
      if (ls.some((u) => (u.username || "").toLowerCase() === newUser.username.toLowerCase())) {
        setError("Username sudah dipakai.");
        return;
      }
      const updated = [...ls, newUser];
      localStorage.setItem("users", JSON.stringify(updated));
    } catch {
      localStorage.setItem("users", JSON.stringify([newUser]));
    }

    if (typeof addUser === "function") addUser(newUser);

    alert("Registrasi berhasil. Silakan login.");
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-[28rem]">
        <h2 className="text-xl font-bold mb-4 text-center">REGISTRASI PIC TOKO MILA PHONE</h2>
        {error && <p className="text-red-500 mb-3 text-center">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Nama Lengkap (opsional)</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama lengkap"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Username</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Password</label>
            <input
              type="password"
              className="w-full border p-2 rounded"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="password"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Role</label>
            <select
              className="w-full border p-2 rounded"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="pic_toko">pic_toko</option>
              {/* <option value="superadmin">superadmin</option> */}
            </select>
          </div>

          {form.role !== "superadmin" && (
            <div>
              <label className="text-xs text-slate-600">Toko</label>
              <select
                className="w-full border p-2 rounded"
                value={form.tokoName}
                onChange={(e) => setForm({ ...form, tokoName: e.target.value })}
              >
                {tokoNames.length ? (
                  tokoNames.map((nama) => (
                    <option key={nama} value={nama}>
                      {nama}
                    </option>
                  ))
                ) : (
                  <option value="">(Belum ada toko di UserManagementRole)</option>
                )}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold"
        >
          Daftar
        </button>

        <div className="mt-3 text-center text-sm">
          Sudah punya akun?{" "}
          <a href="/" className="text-blue-600 hover:underline">
            Login
          </a>
        </div>
      </div>
    </div>
  );
}
