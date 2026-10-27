import { useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import ProductCard from "../components/ProductCard.jsx";
import Icon from "../components/Icon.jsx";
import { useStore } from "../context/StoreContext.js";
import collectionImage from "../assets/portrait-young-woman-2000s-fashion-style.jpg";

const perks = [
  ["truck", "Delivery options", "Confirmed at checkout"],
  ["rotate", "Returns & warranty", "See available product details"],
  ["shield", "New styles", "Explore the latest looks"],
  ["headset", "Product catalog", "Browse all available items"],
];

export default function Home() {
  const {
    products,
    categories,
    productLoading,
    productError,
    refreshProducts,
  } = useStore();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const deals = products.filter((p) => p.oldPrice).slice(0, 5);
  const bestSellers = [...products]
    .filter((p) => p.rating != null && p.reviewCount > 0)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 5);

  return (
    <>
      <Hero />
      <div className="wrap">
        <section className="perks">
          {perks.map(([icon, t, s]) => (
            <div className="perk" key={t}>
              <Icon name={icon} size={28} />
              <div>
                <h3>{t}</h3>
                <p>{s}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="section">
          <h2>Shop by category</h2>
          {productLoading ? (
            <p className="catalog-empty" role="status">Loading categories…</p>
          ) : productError ? (
            <p className="catalog-empty" role="alert">{productError}</p>
          ) : categories.length ? (
            <div className="cat-grid">
              {categories.map((c) => (
                <Link key={c.slug} to={"/shop/" + c.slug} className="cat-card">
                  <img
                    src={c.image || "/product-placeholder.svg"}
                    alt={c.name}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/product-placeholder.svg";
                    }}
                  />
                  <span>{c.name}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="catalog-empty">Product categories will appear here.</p>
          )}
        </section>

        <section className="section">
          <div className="sec-head">
            <h2>Today’s deals</h2>
            <Link to="/shop?deals=1">See all deals</Link>
          </div>
          {productLoading ? (
            <p className="catalog-empty" role="status">Loading deals…</p>
          ) : productError ? (
            <p className="catalog-empty" role="alert">{productError}</p>
          ) : deals.length ? (
            <div className="row">
              {deals.map((p) => (
                <ProductCard key={p.id} p={p} showAddToCart={false} />
              ))}
            </div>
          ) : (
            <p className="catalog-empty">There are no discounted products right now.</p>
          )}
        </section>

        <section className="section">
          <div className="sec-head">
            <h2>Top rated</h2>
            <Link to="/shop">Browse all products</Link>
          </div>
          {productLoading ? (
            <p className="catalog-empty" role="status">Loading ratings…</p>
          ) : productError ? (
            <p className="catalog-empty" role="alert">{productError}</p>
          ) : bestSellers.length ? (
            <div className="row">
              {bestSellers.map((p) => (
                <ProductCard key={p.id} p={p} showAddToCart={false} />
              ))}
            </div>
          ) : (
            <p className="catalog-empty">
              No customer ratings yet. Products will appear here after customers review them.
            </p>
          )}
        </section>

        <section className="promo">
          <img src={collectionImage} alt="New season collection" />
          <div>
            <p className="tag">New season</p>
            <h2>Style that moves with you</h2>
            <p>Dresses, ethnic wear, bags and more, delivered across Nepal.</p>
            <Link to="/shop" className="btn">
              Shop the collection
            </Link>
          </div>
        </section>

        <section className="section">
          <h2>Just for you</h2>
          {productLoading ? (
            <p className="catalog-empty" role="status">Loading products…</p>
          ) : productError ? (
            <div className="catalog-empty" role="alert">
              <p>{productError}</p>
              <button type="button" className="btn outline" onClick={() => refreshProducts().catch(() => {})}>
                Try again
              </button>
            </div>
          ) : products.length ? (
            <div className="prod-grid">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} showAddToCart={false} />
              ))}
            </div>
          ) : (
            <p className="catalog-empty">There are no products available right now.</p>
          )}
        </section>

        <section className="news">
          <h2>Get 10% off your first order</h2>
          {done ? (
            <p>Thank you! Check your inbox soon.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setDone(true);
              }}
            >
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn">Subscribe</button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
