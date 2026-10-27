import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/authContext.js";
import { useStore } from "../context/StoreContext.js";
import { getOrders, isDemo } from "../api.js";
import { money, fmtDate } from "../utils.js";

function OrderList({ orders }) {
  if (orders === null) return <p>Loading orders…</p>;
  if (!orders.length)
    return (
      <p>
        You have no orders yet. <Link to="/shop">Start shopping</Link>
      </p>
    );
  return orders.map((o) => (
    <div className="order" key={o.id}>
      <div className="order-head">
        <span>
          <b>Order #{o.id}</b> · {fmtDate(o.createdAt)}
        </span>
        <span className={"status st-" + o.status}>{o.status}</span>
        <b>{money(o.total)}</b>
      </div>
      {o.items.map((i) => (
        <div className="order-item" key={i.productId}>
          <img src={i.image} alt={i.name} />
          <Link to={"/product/" + i.productId}>{i.name}</Link>
          <span>Qty {i.qty}</span>
          <span>{money(i.price)}</span>
        </div>
      ))}
    </div>
  ));
}

export default function Dashboard() {
  const { tab = "overview" } = useParams();
  const { user, logout, updateProfile } = useAuth();
  const { count } = useStore();
  const go = useNavigate();
  const [orders, setOrders] = useState(null);
  const [f, setF] = useState({
    name: user.name,
    phone: user.phone || "",
    address: user.address || "",
  });
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  async function save(e) {
    e.preventDefault();
    try {
      await updateProfile(f);
      setMsg("Profile saved");
    } catch (x) {
      setMsg(x.message);
    }
  }
  const spent = (orders || []).reduce((s, o) => s + o.total, 0);
  const links = [
    ["overview", "Overview"],
    ["orders", "My Orders"],
    ["profile", "My Profile"],
  ];

  return (
    <div className="wrap shop">
      <aside className="section side">
        <div className="me">
          <div className="avatar">{user.name[0].toUpperCase()}</div>
          <b>{user.name}</b>
          <small>{user.email}</small>
        </div>
        {links.map(([k, t]) => (
          <Link
            key={k}
            to={"/dashboard/" + k}
            className={tab === k ? "on" : ""}
          >
            {t}
          </Link>
        ))}
        <Link to="/cart">My Cart ({count})</Link>
        <a
          onClick={() => {
            logout();
            go("/");
          }}
        >
          Logout
        </a>
      </aside>
      <main className="grow">
        {isDemo() && (
          <p className="demo">
            Demo mode: the Express API is not connected, so your account and
            orders are saved in this browser only.
          </p>
        )}
        {tab === "overview" && (
          <>
            <section className="section">
              <h2>Hello, {user.name.split(" ")[0]}</h2>
              <div className="stats">
                <div>
                  <b>{orders ? orders.length : "…"}</b>
                  <span>Orders</span>
                </div>
                <div>
                  <b>{orders ? money(spent) : "…"}</b>
                  <span>Total spent</span>
                </div>
                <div>
                  <b>{count}</b>
                  <span>Items in cart</span>
                </div>
              </div>
            </section>
            <section className="section">
              <div className="sec-head">
                <h2>Recent orders</h2>
                <Link to="/dashboard/orders">View all</Link>
              </div>
              <OrderList orders={orders && orders.slice(0, 3)} />
            </section>
          </>
        )}
        {tab === "orders" && (
          <section className="section">
            <h2>My Orders</h2>
            <OrderList orders={orders} />
          </section>
        )}
        {tab === "profile" && (
          <form className="section profile" onSubmit={save}>
            <h2>My Profile</h2>
            <label>Email</label>
            <input value={user.email} disabled />
            <label>Full name</label>
            <input required value={f.name} onChange={set("name")} />
            <label>Mobile number</label>
            <input value={f.phone} onChange={set("phone")} />
            <label>Delivery address</label>
            <input value={f.address} onChange={set("address")} />
            <button className="btn">Save changes</button>
            {msg && <p className="ok">{msg}</p>}
          </form>
        )}
      </main>
    </div>
  );
}
