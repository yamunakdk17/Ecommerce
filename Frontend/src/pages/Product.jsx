import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import Icon from "../components/Icon.jsx";
import { useStore } from "../context/storeContext.js";
import { useAuth } from "../context/authContext.js";
import { categories } from "../data/Products.js";
import { money, discount } from "../utils.js";

export default function Product() {
  const { id } = useParams();
  const location = useLocation();
  const { products, add } = useStore();
  const { user, setNext } = useAuth();
  const go = useNavigate();
  const [q, setQ] = useState(1);
  const [added, setAdded] = useState(false);
  const p = products.find((x) => String(x.id) === id);
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
  const previousPage = location.state?.returnTo;
  const backToProducts =
    previousPage && !previousPage.startsWith("/product/")
      ? previousPage
      : `/shop/${p.category}`;
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
      <p className="product-back">
        <Link to={backToProducts}>← Back to products</Link>
      </p>
      <section className="section pd">
        <div className="pd-img">
          <img src={p.image} alt={p.name} />
        </div>
        <div className="pd-info">
          <h1>{p.name}</h1>
          <div className="stars">
            {"★".repeat(Math.round(p.rating))}
            <span>
              {p.rating != null
                ? ` ${p.rating} rating${p.reviewCount ? ` · ${p.reviewCount} reviews` : " · review count unavailable"}`
                : " Rating unavailable"}
            </span>
          </div>
          <p className="brand">
            Brand: <b>{p.brand || "Not provided"}</b>
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
          <p className="pd-subtotal">
            Subtotal for {q}: <b>{money(Number(p.price) * q)}</b>
          </p>
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
            <Icon name="truck" size={16} /> Delivery options are confirmed at checkout.
          </p>
          <p>
            <Icon name="shield" size={16} /> Cash on Delivery available
          </p>
          <h4>Return &amp; Warranty</h4>
          <p>
            <Icon name="rotate" size={16} /> Return and warranty details are not provided for this product.
          </p>
          {p.brand && (
            <>
              <h4>More from {p.brand}</h4>
              <Link to="/shop">Browse all products</Link>
            </>
          )}
        </aside>
      </section>

      <section className="section">
        <h2>Product details of {p.name}</h2>
        <p className="desc">{p.description}</p>
        <table className="spec">
          <tbody>
            <tr>
              <td>Brand</td>
              <td>{p.brand || "Not provided"}</td>
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
