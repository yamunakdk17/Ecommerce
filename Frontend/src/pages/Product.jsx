import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import Icon from "../components/Icon.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { categories } from "../data/products.js";
import { money, discount } from "../utils.js";

export default function Product() {
  const { id } = useParams();
  const { products, add } = useStore();
  const { user, setNext } = useAuth();
  const go = useNavigate();
  const [q, setQ] = useState(1);
  const [added, setAdded] = useState(false);
  const p = products.find((x) => x.id === Number(id));
  if (!p)
    return (
      <div className="wrap">
        <section className="section">
          <p>
            Product not found. <Link to="/shop">Back to shop</Link>
          </p>
        </section>
      </div>
    );

  const cat = categories.find((c) => c.slug === p.category);
  const related = products
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4);
  // Buying or visiting the store needs an account.
  const needLogin = (to) => {
    if (user) go(to);
    else {
      setNext(to);
      go("/login");
    }
  };
  const buy = () => {
    add(p.id, q);
    needLogin("/checkout");
  };

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link to="/">Home</Link> ›{" "}
        <Link to={"/shop/" + p.category}>{cat?.name}</Link> ›{" "}
        <span>{p.name}</span>
      </div>
      <section className="section pd">
        <div className="pd-img">
          <img src={p.image} alt={p.name} />
        </div>
        <div className="pd-info">
          <h1>{p.name}</h1>
          <div className="stars">
            {"★".repeat(Math.round(p.rating))}
            <span> {p.rating} rating</span>
          </div>
          <p className="brand">
            Brand: <b>Basemark</b>
          </p>
          <div className="pd-price">
            {money(p.price)}
            {p.oldPrice && (
              <>
                <s>{money(p.oldPrice)}</s>
                <b>-{discount(p)}%</b>
              </>
            )}
          </div>
          <div className="pd-qty">
            <span>Quantity</span>
            <div className="qty">
              <button onClick={() => setQ(Math.max(1, q - 1))}>−</button>
              <span>{q}</span>
              <button onClick={() => setQ(Math.min(p.stock, q + 1))}>+</button>
            </div>
            <small className={p.stock > 0 ? "ok" : "bad"}>
              {p.stock > 0 ? `${p.stock} available` : "Out of stock"}
            </small>
          </div>
          <div className="pd-actions">
            <button className="btn" disabled={p.stock < 1} onClick={buy}>
              Buy Now
            </button>
            <button
              className="btn outline"
              disabled={p.stock < 1}
              onClick={() => {
                add(p.id, q);
                setAdded(true);
                setTimeout(() => setAdded(false), 1500);
              }}
            >
              {added ? "Added ✓" : "Add to Cart"}
            </button>
          </div>
        </div>
        <aside className="pd-side">
          <h4>Delivery Options</h4>
          <p>
            <Icon name="truck" size={16} /> Standard delivery, 2 to 4 days
          </p>
          <p>
            <Icon name="shield" size={16} /> Cash on Delivery available
          </p>
          <h4>Return &amp; Warranty</h4>
          <p>
            <Icon name="rotate" size={16} /> 7 days easy return
          </p>
          <h4>Sold by</h4>
          <p>
            <b>Basemark Official Store</b>
          </p>
          <button
            className="btn outline"
            onClick={() => needLogin("/shop/" + p.category)}
          >
            Visit Store
          </button>
        </aside>
      </section>

      <section className="section">
        <h2>Product details of {p.name}</h2>
        <p className="desc">{p.description}</p>
        <table className="spec">
          <tbody>
            <tr>
              <td>Brand</td>
              <td>Basemark</td>
            </tr>
            <tr>
              <td>Category</td>
              <td>{cat?.name}</td>
            </tr>
            <tr>
              <td>Product ID</td>
              <td>BM-{String(p.id).padStart(4, "0")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2>More from {cat?.name}</h2>
          <div className="prod-grid">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
