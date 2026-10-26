import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { isDemo } from "../api.js";

export default function Login() {
  const { user, login, next, setNext } = useAuth();
  const go = useNavigate();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(f);
      const to = next || "/dashboard";
      setNext("/dashboard");
      go(to);
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  }

  if (user)
    return (
      <div className="auth">
        <div className="auth-card">
          <h1>You are signed in</h1>
          <p>Welcome back, {user.name}.</p>
          <Link to="/dashboard" className="btn">
            Go to dashboard
          </Link>
        </div>
      </div>
    );

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Sign in</h1>
        {next !== "/dashboard" && (
          <p className="note">Please sign in to continue.</p>
        )}
        <label>Email</label>
        <input
          type="email"
          required
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
        <label>Password</label>
        <input
          type="password"
          required
          value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
        />
        {err && <p className="bad">{err}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {isDemo() && (
          <p className="demo">
            Demo mode: the Express API is not connected, so accounts are saved
            in this browser only.
          </p>
        )}
        <p className="alt">
          New to Basemark? <Link to="/register">Create your account</Link>
        </p>
      </form>
    </div>
  );
}
