import { Link, useLocation } from "react-router-dom";
import { useStore } from "../context/storeContext.js";
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
        <img src={p.image} alt={p.name} loading="lazy" />
      </Link>
      <div className="prod-body">
        <Link
          to={`/product/${p.id}`}
          state={{ returnTo }}
          className="prod-content"
        >
          <span className="prod-name">{p.name}</span>
          <div className="stars product-rating">
            {p.rating != null ? (
              <>
                <span
                  className="rating-stars"
                  aria-label={`${rating} out of 5 stars`}
                >
                  {"★".repeat(Math.max(0, Math.min(5, Math.round(rating))))}
                </span>
                <span> {p.rating}</span>
                {p.reviewCount != null && <span> ({p.reviewCount})</span>}
              </>
            ) : (
              <span className="rating-unavailable">Rating unavailable</span>
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
