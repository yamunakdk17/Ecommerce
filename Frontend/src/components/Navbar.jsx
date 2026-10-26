import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../context/storeContext.js";
import { categories } from "../data/Products.js";
import { useAuth } from "../context/authContext.js";
import Icon from "./Icon.jsx";
import logo from "../assets/idTO7v6m3N_logos.png";

export default function Navbar() {
  const { count, query, setQuery } = useStore();
  const go = useNavigate();
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const showingDeals = pathname === "/shop" && search.includes("deals=1");

  return (
    <header>
      <div className="navbar">
        <Link to="/" className="nav-logo border" aria-label="Basemark home">
          <img className="logo" src={logo} alt="Basemark" />
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
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            go("/shop");
          }}
        >
          <select className="search-select" aria-label="Search category">
            <option>All</option>
          </select>
          <input
            className="search-input"
            placeholder="Search Basemark"
            aria-label="Search products"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="search-icon" aria-label="Search" type="submit">
            <Icon name="search" size={18} />
          </button>
        </form>
        <Link to={user ? "/dashboard" : "/login"} className="nav-signin border">
          <span className="nav-first">
            Hello, {user ? user.name.split(" ")[0] : "sign in"}
          </span>
          <span className="nav-second">Account &amp; Lists</span>
        </Link>
        <Link to="/dashboard/orders" className="nav-return border">
          <span className="nav-first">Returns</span>
          <span className="nav-second">&amp; Orders</span>
        </Link>
        <Link to="/cart" className="nav-cart border">
          <Icon name="cart" size={26} />
          <span className="cart-count">{count}</span>
          <span>Cart</span>
        </Link>
      </div>

      <nav className="panel" aria-label="Shop navigation">
        <NavLink
          to="/shop"
          end
          className={({ isActive }) =>
            `panel-link panel-all${isActive && !showingDeals ? " active" : ""}`
          }
        >
          <Icon name="menu" size={18} /> All
        </NavLink>
        <NavLink to="/" end className="panel-link panel-home">
          Shop all
        </NavLink>
        <div className="panel-ops">
          <Link
            to="/shop?deals=1"
            className={`panel-link${showingDeals ? " active" : ""}`}
            aria-current={showingDeals ? "page" : undefined}
          >
            Today&apos;s Deals
          </Link>
          {categories.map((category) => (
            <NavLink
              key={category.slug}
              to={`/shop/${category.slug}`}
              className="panel-link"
            >
              {category.name}
            </NavLink>
          ))}
        </div>
        <Link to="/shop" className="panel-deals">
          Browse clothing
        </Link>
      </nav>
    </header>
  );
}
