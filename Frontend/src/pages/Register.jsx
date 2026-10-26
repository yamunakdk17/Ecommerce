import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { isDemo } from "../api.js";

export default function Register() {
  const { register, next, setNext } = useAuth();
  const go = useNavigate();
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (f.password.length < 6)
      return setErr("Password must be at least 6 characters");
    if (f.password !== f.confirm) return setErr("Passwords do not match");
    setBusy(true);
    try {
      await register({
        name: f.name,
        email: f.email,
        phone: f.phone,
        password: f.password,
      });
      const to = next || "/dashboard";
      setNext("/dashboard");
      go(to);
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create your account</h1>
        <label>Full name</label>
        <input required value={f.name} onChange={set("name")} />
        <label>Email</label>
        <input type="email" required value={f.email} onChange={set("email")} />
        <label>Mobile number</label>
        <input required value={f.phone} onChange={set("phone")} />
        <label>Password</label>
        <input
          type="password"
          required
          value={f.password}
          onChange={set("password")}
        />
        <label>Confirm password</label>
        <input
          type="password"
          required
          value={f.confirm}
          onChange={set("confirm")}
        />
        {err && <p className="bad">{err}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "Creating…" : "Sign up"}
        </button>
        {isDemo() && (
          <p className="demo">
            Demo mode: the Express API is not connected, so accounts are saved
            in this browser only.
          </p>
        )}
        <p className="alt">
          Already a member? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
