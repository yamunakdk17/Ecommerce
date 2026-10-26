import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { useStore } from "../context/StoreContext.jsx";
import { categories } from "../data/products.js";

export default function Shop() {
  const { cat } = useParams();
  const { products, query } = useStore();
  const [sort, setSort] = useState("featured");

  const list = useMemo(() => {
    let l = products.filter(
      (p) =>
        (!cat || p.category === cat) &&
        p.name.toLowerCase().includes(query.toLowerCase()),
    );
    if (sort === "low") l = [...l].sort((a, b) => a.price - b.price);
    if (sort === "high") l = [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [products, cat, query, sort]);

  const title = cat
    ? categories.find((c) => c.slug === cat)?.name
    : "All products";

  return (
    <div className="wrap shop">
      <aside className="section side">
        <h3>Categories</h3>
        <Link to="/shop" className={!cat ? "on" : ""}>
          All products
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            to={"/shop/" + c.slug}
            className={cat === c.slug ? "on" : ""}
          >
            {c.name}
          </Link>
        ))}
      </aside>
      <main className="section grow">
        <div className="sec-head">
          <h2>
            {title} <small>({list.length})</small>
          </h2>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>
        {list.length ? (
          <div className="prod-grid">
            {list.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <p>No products found.</p>
        )}
      </main>
    </div>
  );
}
