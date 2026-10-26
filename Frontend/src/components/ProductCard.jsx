import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext.jsx";
import { money, discount } from "../utils.js";

export default function ProductCard({ p }) {
  const { add } = useStore();
  const off = discount(p);
  return (
    <div className="prod-card">
      <Link to={"/product/" + p.id} className="prod-img">
        <img src={p.image} alt={p.name} loading="lazy" />
        {off > 0 && <span className="badge">-{off}%</span>}
      </Link>
      <div className="prod-body">
        <Link to={"/product/" + p.id} className="prod-name">
          {p.name}
        </Link>
        <div className="stars">
          {"★".repeat(Math.round(p.rating))}
          <span> {p.rating}</span>
        </div>
        <div className="price">
          {money(p.price)} {p.oldPrice && <s>{money(p.oldPrice)}</s>}
        </div>
        <button className="btn" onClick={() => add(p.id)}>
          Add to cart
        </button>
      </div>
    </div>
  );
}
