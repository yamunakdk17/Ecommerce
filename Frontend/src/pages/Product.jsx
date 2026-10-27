import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import Icon from "../components/Icon.jsx";
import { useStore } from "../context/StoreContext.js";
import { useAuth } from "../context/authContext.js";
import { getProductReviews, submitProductReview } from "../api.js";
import { money, discount, fmtDate } from "../utils.js";

const starsFor = (rating) =>
  "★".repeat(Math.max(0, Math.min(5, Math.round(Number(rating) || 0))));

export default function Product() {
  const { id } = useParams();
  const location = useLocation();
  const {
    products,
    categories,
    add,
    productLoading,
    productError,
    refreshProducts,
  } = useStore();
  const { user, setNext } = useAuth();
  const go = useNavigate();
  const [q, setQ] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviewState, setReviewState] = useState(() => ({
    productId: id,
    reviews: [],
    loading: true,
    error: "",
  }));
  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState("");
  const [reviewSubmitError, setReviewSubmitError] = useState("");

  useEffect(() => {
    let active = true;
    getProductReviews(id)
      .then((result) => {
        if (active) {
          setReviewState({
            productId: id,
            reviews: Array.isArray(result?.data) ? result.data : [],
            loading: false,
            error: "",
          });
        }
      })
      .catch((error) => {
        if (active) {
          setReviewState({
            productId: id,
            reviews: [],
            loading: false,
            error: "Customer reviews could not be loaded. Please try again.",
          });
          console.error("Unable to load product reviews:", error);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  const currentReviewState =
    reviewState.productId === id
      ? reviewState
      : { productId: id, reviews: [], loading: true, error: "" };
  const p = products.find((x) => String(x.id) === id);
  if (!p && productLoading) {
    return (
      <div className="wrap">
        <section className="section" role="status">Loading product…</section>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="wrap">
        <section className="section" role={productError ? "alert" : undefined}>
          <p>
            {productError || "Product not found."}{" "}
            <Link to="/shop">Back to shop</Link>
          </p>
          {productError && (
            <button
              type="button"
              className="btn outline"
              onClick={() => refreshProducts().catch(() => {})}
            >
              Try again
            </button>
          )}
        </section>
      </div>
    );
  }

  const cat = categories.find((category) => category.slug === p.category);
  const categoryName = cat?.name || p.category || "Uncategorized";
  const previousPage = location.state?.returnTo;
  const backToProducts =
    previousPage && !previousPage.startsWith("/product/")
      ? previousPage
      : p.category
        ? `/shop/${p.category}`
        : "/shop";
  const related = products
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4);

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

  const saveReview = async (event) => {
    event.preventDefault();
    if (!user) {
      setNext(`/product/${p.id}`);
      go("/login");
      return;
    }
    setReviewBusy(true);
    setReviewSubmitError("");
    setReviewNotice("");
    try {
      const result = await submitProductReview(p.id, {
        rating: Number(rating),
        review: reviewText,
      });
      setReviewState((current) => ({
        ...current,
        productId: id,
        reviews: Array.isArray(result?.data) ? result.data : [],
      }));
      setReviewNotice("Your review has been saved.");
      setReviewText("");
      refreshProducts().catch(() => {});
    } catch (error) {
      setReviewSubmitError(error.message || "Unable to save your review.");
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link to="/">Home</Link> ›{" "}
        {p.category ? <Link to={`/shop/${p.category}`}>{categoryName}</Link> : categoryName} ›{" "}
        <span>{p.name}</span>
      </div>
      <p className="product-back">
        <Link to={backToProducts}>← Back to products</Link>
      </p>
      <section className="section pd">
        <div className="pd-img">
          <img
            src={p.image || "/product-placeholder.svg"}
            alt={p.name}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/product-placeholder.svg";
            }}
          />
        </div>
        <div className="pd-info">
          <h1>{p.name}</h1>
          <div className="stars product-rating">
            {p.rating != null && p.reviewCount > 0 ? (
              <>
                <span
                  className="rating-stars"
                  aria-label={`${p.rating} out of 5 stars`}
                >
                  {starsFor(p.rating)}
                </span>
                <span>
                  {" "}{Number(p.rating).toFixed(1)} · {p.reviewCount}{" "}
                  {p.reviewCount === 1 ? "review" : "reviews"}
                </span>
              </>
            ) : (
              <span className="rating-unavailable">No reviews yet (0)</span>
            )}
          </div>
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
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={q <= 1}
                onClick={() => setQ(Math.max(1, q - 1))}
              >
                −
              </button>
              <span>{q}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={q >= p.stock}
                onClick={() => setQ(Math.min(p.stock, q + 1))}
              >
                +
              </button>
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
          <h4>Product information</h4>
          <p>Category: {categoryName}</p>
          <p>
            <Icon name="truck" size={16} /> Delivery options are confirmed at checkout.
          </p>
          <p>
            <Icon name="shield" size={16} /> Cash on Delivery available
          </p>
          <h4>Returns &amp; warranty</h4>
          <p>
            <Icon name="rotate" size={16} /> Return and warranty details are not provided for this product.
          </p>
        </aside>
      </section>

      <section className="section">
        <h2>Product details</h2>
        <p className="desc">{p.description || "No additional description is available."}</p>
        <table className="spec">
          <tbody>
            <tr><td>Category</td><td>{categoryName}</td></tr>
            <tr><td>Availability</td><td>{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</td></tr>
            <tr><td>Product ID</td><td>BM-{String(p.id).padStart(4, "0")}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="section product-reviews">
        <h2>Customer reviews ({p.reviewCount})</h2>
        {currentReviewState.loading ? (
          <p role="status">Loading reviews…</p>
        ) : currentReviewState.error ? (
          <p className="bad" role="alert">{currentReviewState.error}</p>
        ) : currentReviewState.reviews.length ? (
          <div className="review-list">
            {currentReviewState.reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-heading">
                  <strong>{review.customerName}</strong>
                  <span className="rating-stars" aria-label={`${review.rating} out of 5 stars`}>
                    {starsFor(review.rating)}
                  </span>
                  <time dateTime={review.createdAt}>{fmtDate(review.createdAt)}</time>
                </div>
                <p>{review.review || "Rating only"}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="catalog-empty">No customer reviews yet. Be the first to share your feedback.</p>
        )}

        <div className="review-form-wrap">
          <h3>Write a review</h3>
          {user ? (
            <form className="review-form" onSubmit={saveReview}>
              <label>
                Your rating
                <select value={rating} onChange={(event) => setRating(event.target.value)}>
                  <option value="5">5 — Excellent</option>
                  <option value="4">4 — Good</option>
                  <option value="3">3 — Average</option>
                  <option value="2">2 — Fair</option>
                  <option value="1">1 — Poor</option>
                </select>
              </label>
              <label>
                Review (optional)
                <textarea
                  rows="4"
                  maxLength="3000"
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  placeholder="Share your experience with this product"
                />
              </label>
              {reviewSubmitError && <p className="bad" role="alert">{reviewSubmitError}</p>}
              {reviewNotice && <p className="ok" role="status">{reviewNotice}</p>}
              <button className="btn" type="submit" disabled={reviewBusy}>
                {reviewBusy ? "Saving…" : "Submit review"}
              </button>
            </form>
          ) : (
            <p>
              <Link
                to="/login"
                onClick={() => setNext(`/product/${p.id}`)}
                className="review-login"
              >
                Sign in
              </Link>{" "}
              to submit a rating and review.
            </p>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2>More from {categoryName}</h2>
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
