import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext.jsx";
import { categories } from "../data/products.js";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "./Icon.jsx";

export default function Navbar() {
  const { count, query, setQuery } = useStore();
  const go = useNavigate();
  const { user } = useAuth();
  return (
    <header>
      <div className="navbar">
        <Link to="/" className="nav-logo border">
          <div className="logo"></div>
        </Link>
        <div className="nav-address border">
          <p className="add-frist">Deliver to</p>
          <div className="add-icon">
            <Icon name="pin" size={16} />
            <p className="add-second">Nepal</p>
          </div>
        </div>
        <form
          className="nav-search"
          onSubmit={(e) => {
            e.preventDefault();
            go("/shop");
          }}
        >
          <select className="search-select">
            <option>All</option>
          </select>
          <input
            className="search-input"
            placeholder="search basemark"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-icon" aria-label="Search">
            <Icon name="search" size={18} />
          </button>
        </form>
        <Link to={user ? "/dashboard" : "/login"} className="nav-signin border">
          <p className="nav-first">
            Hello, {user ? user.name.split(" ")[0] : "sign in"}
          </p>
          <p className="nav-second">Account &amp; Lists</p>
        </Link>
        <Link to="/dashboard/orders" className="nav-return border">
          <p className="nav-first">Returns</p>
          <p className="nav-second">&amp; Orders</p>
        </Link>
        <Link to="/cart" className="nav-cart border">
          <Icon name="cart" size={26} />
          <span className="cart-count">{count}</span> cart
        </Link>
      </div>
      <div className="panel">
        <div className="panel-all">
          <Icon name="menu" size={18} /> All
        </div>
        <div className="panel-ops">
          <Link to="/shop">Today’s Deals</Link>
          {categories.map((c) => (
            <Link key={c.slug} to={"/shop/" + c.slug}>
              {c.name}
            </Link>
          ))}
          <a>Customer Service</a>
          <a>Gift Cards</a>
        </div>
        <Link to="/shop" className="panel-deals">
          shop deals in clothing
        </Link>
      </div>
    </header>
  );
}
