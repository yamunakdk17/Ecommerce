import { useEffect, useState } from "react";
import { getProducts } from "../api.js";
import { localProducts } from "../data/Products.js";
import { ls } from "../utils.js";
import { StoreContext } from "./storeContext.js";
const CART_KEY = "bm_cart";

function readCart() {
  try {
    const saved = JSON.parse(ls.get(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(localProducts);
  const [lines, setLines] = useState(readCart);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let active = true;
    getProducts()
      .then((result) => {
        const rows = Array.isArray(result) ? result : result?.products;
        if (active && Array.isArray(rows)) setProducts(rows);
      })
      .catch(() => {
        // Keep the bundled catalog when the products endpoint is unavailable.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    ls.set(CART_KEY, JSON.stringify(lines));
  }, [lines]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const add = (productOrId, quantity = 1) => {
    const product = typeof productOrId === "object"
      ? productOrId
      : products.find((item) => String(item.id) === String(productOrId));
    const amount = Math.max(1, Number(quantity) || 1);
    if (!product) return;

    setLines((current) => {
      const existing = current.find(
        (item) => String(item.id) === String(product.id),
      );
      return existing
        ? current.map((item) =>
            String(item.id) === String(product.id)
              ? { ...item, qty: item.qty + amount }
              : item,
          )
        : [...current, { ...product, qty: amount }];
    });
    showToast(`${product.name} added to your cart`);
  };

  const setQty = (productId, quantity) => {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount < 1) return;
    setLines((current) =>
      current.map((item) =>
        String(item.id) === String(productId) ? { ...item, qty: amount } : item,
      ),
    );
  };

  const remove = (productId) => {
    setLines((current) =>
      current.filter((item) => String(item.id) !== String(productId)),
    );
  };

  const clear = () => setLines([]);
  const count = lines.reduce((sum, item) => sum + item.qty, 0);
  const total = lines.reduce(
    (sum, item) => sum + Number(item.price) * item.qty,
    0,
  );

  const value = {
    products,
    lines,
    total,
    count,
    query,
    setQuery,
    toast,
    add,
    setQty,
    remove,
    clear,
    // Keep the earlier context names available to existing components.
    cart: lines,
    cartTotal: total,
    cartCount: count,
    addToCart: add,
    updateQuantity: setQty,
    removeFromCart: remove,
    clearCart: clear,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

