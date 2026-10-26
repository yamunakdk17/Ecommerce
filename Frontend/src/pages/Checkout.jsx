import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { placeOrder } from "../api.js";
import { money } from "../utils.js";

export default function Checkout() {
  const { lines, total, count, clear } = useStore();
  const { user } = useAuth();
  const [f, setF] = useState({
    name: user.name,
    phone: user.phone || "",
    address: user.address || "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const items = lines.map((l) => ({
        id: l.id,
        qty: l.qty,
        name: l.name,
        image: l.image,
        price: l.price,
      }));
      setDone(await placeOrder({ customer: f, items }));
      clear();
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="wrap">
        <section className="section center">
          <h2>Thank you, your order is placed!</h2>
          <p>
            Order <b>#{done.orderId}</b> · Total <b>{money(done.total)}</b> ·
            Pay on delivery
          </p>
          <p>
            <Link to="/dashboard/orders" className="btn">
              View my orders
            </Link>{" "}
            <Link to="/shop" className="btn outline">
              Keep shopping
            </Link>
          </p>
        </section>
      </div>
    );
  }
  if (!lines.length)
    return (
      <div className="wrap">
        <section className="section">
          <h2>Nothing to check out</h2>
          <Link to="/shop" className="btn">
            Shop now
          </Link>
        </section>
      </div>
    );

  return (
    <form className="wrap cart" onSubmit={submit}>
      <section className="section grow">
        <h2>1. Delivery address</h2>
        <div className="form-grid">
          <input
            required
            placeholder="Full name"
            value={f.name}
            onChange={set("name")}
          />
          <input
            required
            placeholder="Phone number"
            value={f.phone}
            onChange={set("phone")}
          />
          <input
            required
            placeholder="Full address (area, city)"
            value={f.address}
            onChange={set("address")}
            className="span"
          />
        </div>
        <h2 className="mt">2. Payment method</h2>
        <label className="pay">
          <input type="radio" checked readOnly /> Cash on Delivery
        </label>
        <label className="pay off">
          <input type="radio" disabled /> eSewa / Khalti (coming soon)
        </label>
        <h2 className="mt">3. Your items</h2>
        {lines.map((l) => (
          <div className="line" key={l.id}>
            <img src={l.image} alt={l.name} />
            <div className="grow">
              {l.name}
              <div className="price">
                {money(l.price)} × {l.qty}
              </div>
            </div>
            <b>{money(l.price * l.qty)}</b>
          </div>
        ))}
      </section>
      <aside className="section checkout">
        <h2>Order summary</h2>
        <div className="sum">
          <span>Items ({count})</span>
          <b>{money(total)}</b>
        </div>
        <div className="sum">
          <span>Delivery</span>
          <b>Free</b>
        </div>
        <div className="sum big">
          <span>Total</span>
          <b>{money(total)}</b>
        </div>
        {err && <p className="bad">{err}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}
