import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext.js";
import { useAuth } from "../context/authContext.js";
import { money } from "../utils.js";

export default function Cart() {
  const { lines, total, count, setQty, remove } = useStore();
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
        {lines.map((line) => (
          <div className="line" key={line.id}>
            <img
              src={line.image || "/product-placeholder.svg"}
              alt={line.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/product-placeholder.svg";
              }}
            />
            <div className="grow">
              <Link to={`/product/${line.id}`}>{line.name}</Link>
              <div className="price">{money(line.price)}</div>
            </div>
            <div className="qty">
              <button
                aria-label={`Decrease ${line.name} quantity`}
                disabled={line.qty <= 1}
                onClick={() => setQty(line.id, line.qty - 1)}
              >
                −
              </button>
              <span>{line.qty}</span>
              <button
                aria-label={`Increase ${line.name} quantity`}
                onClick={() => setQty(line.id, line.qty + 1)}
              >
                +
              </button>
            </div>
            <b>{money(line.price * line.qty)}</b>
            <button
              className="cart-remove"
              type="button"
              onClick={() => remove(line.id)}
            >
              Remove
            </button>
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
