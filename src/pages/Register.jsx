// src/pages/Register.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import userRoles from "../data/UserManagementRole";
import TOKO_LABELS from "../data/TokoLabels";

import api from "../api/axios";
import { registerUser } from "../api/authService";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";

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

  // const handleSubmit = () => {
  //   setError("");
  //   const { username, password, role, tokoName, name } = form;

  //   if (!username || !password) {
  //     setError("Username & password wajib diisi.");
  //     return;
  //   }

  //   // Cari ID toko dari nama (harus ada di TokoLabels)
  //   let tokoId = null;
  //   let finalRole = "superadmin";
  //   let finalTokoName = "ALL";

  //   if (role !== "superadmin") {
  //     const id = NAME_TO_ID[(tokoName || "").toUpperCase()];
  //     if (!id) {
  //       setError("Nama toko tidak dikenali. Pastikan nama toko ada di TokoLabels.");
  //       return;
  //     }
  //     tokoId = id;
  //     finalRole = `pic_toko${id}`;  // ← kompatibel dengan seluruh app
  //     finalTokoName = tokoName;
  //   }

  //   const newUser = {
  //     username: username.trim(),
  //     password,
  //     role: finalRole,
  //     toko: tokoId,             // simpan ID (kompat)
  //     tokoId,                   // eksplisit
  //     tokoName: finalTokoName,  // simpan juga nama agar enak ditampilkan
  //     name: name?.trim() || username.trim(),
  //     nama: name?.trim() || username.trim(), // kompat alias
  //   };

  //   // Simpan ke localStorage.users (dengan validasi username unik)
  //   try {
  //     const ls = JSON.parse(localStorage.getItem("users")) || [];
  //     if (ls.some((u) => (u.username || "").toLowerCase() === newUser.username.toLowerCase())) {
  //       setError("Username sudah dipakai.");
  //       return;
  //     }
  //     const updated = [...ls, newUser];
  //     localStorage.setItem("users", JSON.stringify(updated));
  //   } catch {
  //     localStorage.setItem("users", JSON.stringify([newUser]));
  //   }

  //   if (typeof addUser === "function") addUser(newUser);

  //   alert("Registrasi berhasil. Silakan login.");
  //   navigate("/", { replace: true });
  // };


  // logic ardie 20251102 =================================
  const [roleList, setRoleList] = useState([]);
  const [storeList, setStoreList] = useState([]);
  const [message, setMessage] = React.useState("");
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const onChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    fetchRoleList();
    fetchStoreList();
  }, []);

  const fetchRoleList = async () => {
    try {
      const response = await api.get(`${process.env.REACT_APP_API_URL}/roles/getAllDatas`);
      const data = Array.isArray(response.data) ? response.data : [];
      setRoleList(data);
    } catch (error){
      console.log("Gagal mengambil data role:", error);
    }
  };


  const fetchStoreList = async () => {
    try {
      const response = await api.get(`${process.env.REACT_APP_API_URL}/stores/getAllDatas`);
      const data = Array.isArray(response.data.data) ? response.data.data : [];
      console.log("data_storeList => ", data);
      setStoreList(data);
    } catch (error){
      console.log("Gagal mengambil data kategori:", error);
    }
  };

  const onSubmit = async (data) => {
    console.log("dataaxx :"+ data);
    try {

      const payload = {
        name: data.name,
        username: data.username,
        password: data.password,
        role: data.roleId,     // string
        storeId: Number(data.storeId) // convert ke number
      };

      console.log("Payload yang dikirim ke backend:", payload);
      await registerUser(payload);
      Swal.fire({
        icon: "success",
        title: "Registrasi Berhasil!",
        text: "Akun kamu sudah dibuat. Silakan login.",
        timer: 2000,
        showConfirmButton: false,
      });
      setMessage("Registrasi berhasil! Silakan login.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err){
      setMessage(err.message || "Gagal registrasi.");
      Swal.fire({
        icon: "error",
        title: "Registrasi Gagal!",
        text: err.message || "Terjadi kesalahan. Silakan coba lagi.",
      });
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-[28rem]">
        <h2 className="text-xl font-bold mb-4 text-center">REGISTRASI PIC TOKO MILA PHONE</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && <p className="text-red-500 mb-3 text-center">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-600">Nama Lengkap (opsional)</label>
              {/* <input
                type="text"
                className="w-full border p-2 rounded"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama lengkap"
              /> */}
              <input className="w-full border p-2 rounded" placeholder="Name" {...register("name", { required: true })} />
            </div>

            <div>
              <label className="text-xs text-slate-600">Username</label>
              {/* <input
                type="text"
                className="w-full border p-2 rounded"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
              /> */}
              <input className="w-full border p-2 rounded" placeholder="Username" {...register("username", { required: true })} />
              {errors.username && <p style={{ color: "red" }}>Username wajib diisi</p>}
            </div>

            <div>
              <label className="text-xs text-slate-600">Password</label>
              {/* <input
                type="password"
                className="w-full border p-2 rounded"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="password"
              /> */}
              <input className="w-full border p-2 rounded"  type="password" placeholder="Password" {...register("password", { required: true })} />
              {errors.password && <p style={{ color: "red" }}>Password wajib diisi</p>}
            </div>

            <div>
              <label className="text-xs text-slate-600">Role</label>
              {/* <select
                className="w-full border p-2 rounded"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="pic_toko">pic_toko</option>
              </select> */}
              <select
                  // value={form.role}
                  // onChange={(e) => onChange("role", e.target.value)}
                  {...register("roleId", { required: true })}
                  className="w-full border rounded p-2"
                >
                  <option value="">-- Pilih Role --</option>
                  {roleList.map((role) => (
                    <option key={role.name} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {errors.roleId && <p style={{ color: "red" }}>Role wajib dipilih</p>}
            </div>

            {form.role !== "superadmin" && (
              <div>
                <label className="text-xs text-slate-600">Toko</label>
                {/* <select
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
                </select> */}
                <select
                  // value={form.store}
                  // onChange={(e) => onChange("store", e.target.value)}
                  {...register("storeId", { required: true })}
                  className="w-full border rounded p-2"
                >
                  <option value="">-- Pilih Stores --</option>
                  {storeList.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.storeName}
                    </option>
                  ))}
                </select>
                {errors.storeId && <p style={{ color: "red" }}>Store wajib dipilih</p>}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold"
          >
            Daftar
          </button>
        </form>
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
