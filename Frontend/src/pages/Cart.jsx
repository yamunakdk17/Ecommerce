import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { money } from "../utils.js";

export default function Cart() {
  const { lines, total, count, setQty } = useStore();
  const { user, setNext } = useAuth();
  const go = useNavigate();
  const checkout = () => {
    if (!user) setNext("/checkout");
    go(user ? "/checkout" : "/login");
  };

  if (!lines.length) {
    return (
      <div className="wrap">
        <section className="section">
          <h2>Your cart is empty</h2>
          <Link to="/shop" className="btn">
            Continue shopping
          </Link>
        </section>
      </div>
    );
  }
  return (
    <div className="wrap cart">
      <section className="section grow">
        <h2>Shopping cart ({count})</h2>
        {lines.map((l) => (
          <div className="line" key={l.id}>
            <img src={l.image} alt={l.name} />
            <div className="grow">
              <Link to={"/product/" + l.id}>{l.name}</Link>
              <div className="price">{money(l.price)}</div>
            </div>
            <div className="qty">
              <button onClick={() => setQty(l.id, l.qty - 1)}>−</button>
              <span>{l.qty}</span>
              <button onClick={() => setQty(l.id, l.qty + 1)}>+</button>
            </div>
            <b>{money(l.price * l.qty)}</b>
          </div>
        ))}
      </section>
      <aside className="section checkout">
        <h2>Order summary</h2>
        <div className="sum">
          <span>Subtotal ({count} items)</span>
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
        <button className="btn" onClick={checkout}>
          Proceed to checkout
        </button>
      </aside>
    </div>
  );
}
