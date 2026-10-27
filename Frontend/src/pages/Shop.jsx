import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { useStore } from "../context/StoreContext.js";

const priceRanges = [
  { id: "any", label: "Any price", matches: () => true },
  { id: "under-2000", label: "Under Rs. 2,000", matches: (price) => price < 2000 },
  {
    id: "2000-3999",
    label: "Rs. 2,000 - 3,999",
    matches: (price) => price >= 2000 && price < 4000,
  },
  { id: "4000-plus", label: "Rs. 4,000 and above", matches: (price) => price >= 4000 },
];

export default function Shop() {
  const { cat } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    products,
    query,
    categories,
    productLoading,
    productError,
    refreshProducts,
  } = useStore();
  const [sort, setSort] = useState("featured");
  const [priceRange, setPriceRange] = useState("any");
  const saleOnly = searchParams.get("deals") === "1";

  const matchingCategory = useMemo(
    () =>
      products.filter(
        (product) =>
          (!cat || product.category === cat) &&
          product.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, cat, query],
  );

  const available = saleOnly
    ? matchingCategory.filter((product) => product.oldPrice)
    : matchingCategory;
  const selectedRange = priceRanges.find((range) => range.id === priceRange);

  const list = useMemo(() => {
    const filtered = available.filter((product) =>
      selectedRange.matches(Number(product.price)),
    );
    if (sort === "low") filtered.sort((a, b) => a.price - b.price);
    if (sort === "high") filtered.sort((a, b) => b.price - a.price);
    return filtered;
  }, [available, selectedRange, sort]);

  const title = cat
    ? categories.find((category) => category.slug === cat)?.name || "Products"
    : saleOnly
      ? "Today’s deals"
      : "All products";

  const categoryCount = (slug) =>
    products.filter(
      (product) =>
        (!slug || product.category === slug) &&
        product.name.toLowerCase().includes(query.toLowerCase()),
    ).length;

  const rangeCount = (range) =>
    available.filter((product) => range.matches(Number(product.price))).length;

  const toggleSale = (checked) => {
    const next = new URLSearchParams(searchParams);
    if (checked) next.set("deals", "1");
    else next.delete("deals");
    setSearchParams(next);
  };

  const categoryHref = (slug) => {
    const path = slug ? `/shop/${slug}` : "/shop";
    return saleOnly ? `${path}?deals=1` : path;
  };

  return (
    <div className="wrap shop">
      <aside className="section side filters" aria-label="Filter products">
        <details className="filter-group" open>
          <summary>Categories</summary>
          <nav className="filter-list" aria-label="Product categories">
            <Link to={categoryHref("")} className={!cat ? "on" : ""}>
              <span>All products</span>
              <span className="filter-count">{categoryCount("")}</span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={categoryHref(category.slug)}
                className={cat === category.slug ? "on" : ""}
              >
                <span>{category.name}</span>
                <span className="filter-count">
                  {categoryCount(category.slug)}
                </span>
              </Link>
            ))}
          </nav>
        </details>

        <details className="filter-group" open>
          <summary>Price</summary>
          <div className="filter-options">
            {priceRanges.map((range) => (
              <label className="filter-option" key={range.id}>
                <input
                  type="radio"
                  name="price-range"
                  checked={priceRange === range.id}
                  onChange={() => setPriceRange(range.id)}
                />
                <span>{range.label}</span>
                <span className="filter-count">{rangeCount(range)}</span>
              </label>
            ))}
          </div>
        </details>

        <details className="filter-group" open>
          <summary>Offers</summary>
          <div className="filter-options">
            <label className="filter-option">
              <input
                type="checkbox"
                checked={saleOnly}
                onChange={(event) => toggleSale(event.target.checked)}
              />
              <span>On sale only</span>
              <span className="filter-count">
                {matchingCategory.filter((product) => product.oldPrice).length}
              </span>
            </label>
          </div>
        </details>

        {(priceRange !== "any" || saleOnly || cat) && (
          <Link to="/shop" className="clear-filters" onClick={() => setPriceRange("any")}>
            Clear filters
          </Link>
        )}
      </aside>

      <main className="section grow shop-results">
        <div className="sec-head">
          <h2>
            {title} <small>({list.length})</small>
          </h2>
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>
        {productLoading ? (
          <p className="catalog-empty" role="status">Loading products…</p>
        ) : productError ? (
          <div className="catalog-empty" role="alert">
            <p>{productError}</p>
            <button type="button" className="btn outline" onClick={() => refreshProducts().catch(() => {})}>
              Try again
            </button>
          </div>
        ) : list.length ? (
          <div className="prod-grid">
            {list.map((product) => (
              <ProductCard key={product.id} p={product} />
            ))}
          </div>
        ) : (
          <p className="catalog-empty">
            {products.length
              ? "No products match these filters."
              : "There are no products available right now."}
          </p>
        )}
      </main>
    </div>
  );
}
