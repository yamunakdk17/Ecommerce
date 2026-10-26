import { useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import ProductCard from "../components/ProductCard.jsx";
import Icon from "../components/Icon.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { categories } from "../data/products.js";

const perks = [
  ["truck", "Fast local delivery", "Kathmandu in 24 hours"],
  ["rotate", "Easy returns", "7-day return policy"],
  ["shield", "Secure checkout", "Cash on delivery available"],
  ["headset", "Friendly support", "Here when you need us"],
];

export default function Home() {
  const { products } = useStore();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const deals = products.filter((p) => p.oldPrice).slice(0, 5);

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
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c.slug} to={"/shop/" + c.slug} className="cat-card">
                <img src={c.image} alt={c.name} />
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="sec-head">
            <h2>Today’s deals</h2>
            <Link to="/shop">See all deals</Link>
          </div>
          <div className="row">
            {deals.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        <section className="promo">
          <img src="/images/banner.jpg" alt="New season collection" />
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
          <div className="prod-grid">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
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
