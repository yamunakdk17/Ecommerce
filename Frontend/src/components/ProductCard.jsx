import { Link, useLocation } from "react-router-dom";
import { useStore } from "../context/StoreContext.js";
import { money, discount } from "../utils.js";

export default function ProductCard({ p, showAddToCart = true }) {
  const { add } = useStore();
  const { pathname, search } = useLocation();
  const off = discount(p);
  const rating = Number(p.rating);
  const returnTo = `${pathname}${search}`;

  return (
    <article className="prod-card">
      <Link
        to={`/product/${p.id}`}
        state={{ returnTo }}
        className="prod-img"
        aria-label={`View ${p.name}`}
      >
        <img
          src={p.image || "/product-placeholder.svg"}
          alt={p.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/product-placeholder.svg";
          }}
        />
      </Link>
      <div className="prod-body">
        <Link
          to={`/product/${p.id}`}
          state={{ returnTo }}
          className="prod-content"
        >
          <span className="prod-name">{p.name}</span>
          <div className="stars product-rating">
            {p.rating != null && p.reviewCount > 0 ? (
              <>
                <span
                  className="rating-stars"
                  aria-label={`${rating} out of 5 stars`}
                >
                  {"★".repeat(Math.max(0, Math.min(5, Math.round(rating))))}
                </span>
                <span> {Number(p.rating).toFixed(1)}</span>
                <span>
                  {" "}
                  ({p.reviewCount} {p.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </>
            ) : (
              <span className="rating-unavailable">No reviews yet (0)</span>
            )}
          </div>
          <div className="price prod-price">
            <span className="prod-price-main">
              {money(p.price)}
              {off > 0 && <span className="prod-discount">-{off}%</span>}
            </span>
            <span className="prod-original">
              {p.oldPrice ? <s>{money(p.oldPrice)}</s> : null}
            </span>
          </div>
          <span className={p.stock > 0 ? "product-stock" : "product-stock out"}>
            {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
          </span>
        </Link>
        {showAddToCart && (
          <button className="btn" type="button" onClick={() => add(p.id)}>
            Add to cart
          </button>
        )}
      </div>
    </article>
  );
}
