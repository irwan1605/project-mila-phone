// ProtectedRoute.jsx
// import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const raw = localStorage.getItem("userInfoLogedIn");
  const user = raw ? JSON.parse(raw) : null;

  // console.log("raw-userloggedn ==> "+ user);
  // console.log("raw-get-roleName ==> "+ user?.roles?.[0]["name"]);

  const user_role = user?.roles?.[0]?.name || "NO_ROLE";  
  //console.log("raw-get-roleName ==> "+ user_role);

  if (!user) return <Navigate to="/" replace />;

  const role = user.role || "";

  console.log("ceekkRolee => "+ role);
  console.log("ceekkAllowed => "+ allowedRoles);

  const ok =
    allowedRoles.includes(user_role) ||
    (allowedRoles.includes("SUPER_ADMIN") && user_role.startsWith("SUPER_ADMIN"));
    //(allowedRoles.includes("pic_toko") && user_role.startsWith("pic_toko"));

  return ok ? children : <Navigate to="/dashboard" replace />;
}
