import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext.js";

export default function RequireAdmin({ children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="wrap section">Checking administrator access…</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return children;
}
