import { useCallback, useEffect, useState } from "react";
import { getProducts, getStorefrontData } from "../api.js";
import { categories as localCategories, localProducts } from "../data/Products.js";
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
  const [storefront, setStorefront] = useState({
    storeName: "Basemark",
    announcement: "",
    promotions: [],
  });
  const [lines, setLines] = useState(readCart);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  const refreshProducts = useCallback(async () => {
    const result = await getProducts();
    const rows = Array.isArray(result)
      ? result
      : result?.data || result?.products;
    if (Array.isArray(rows)) {
      setProducts(
        rows.map((product) => ({
          ...product,
          id: product.id,
          price: Number(product.price),
          oldPrice: Number(product.oldPrice ?? product.old_price) || null,
          category: product.category || "",
          stock: Number(product.stock) || 0,
        })),
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(refreshProducts)
      .catch(() => {
        // Keep the bundled catalog when the products endpoint is unavailable.
      });
    getStorefrontData()
      .then((result) => {
        if (active && result?.data) setStorefront(result.data);
      })
      .catch(() => {
        // Keep default store details when the API is unavailable.
      });
    return () => {
      active = false;
    };
  }, [refreshProducts]);

  const categories = [
    ...localCategories.filter((category) =>
      products.some((product) => product.category === category.slug),
    ),
    ...[...new Set(products.map((product) => product.category).filter(Boolean))]
      .filter(
        (slug) => !localCategories.some((category) => category.slug === slug),
      )
      .map((slug) => ({
        slug,
        name: slug
          .split(/[-_\s]+/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      })),
  ];

  useEffect(() => {
    ls.set(CART_KEY, JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    document.title = storefront.storeName || "Basemark";
  }, [storefront.storeName]);

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

  const removeItems = (productIds) => {
    const ids = new Set(productIds.map(String));
    setLines((current) =>
      current.filter((item) => !ids.has(String(item.id))),
    );
  };

  const removePurchasedItems = useCallback((purchasedItems) => {
    const purchasedQuantities = new Map(
      purchasedItems.map(({ id, qty }) => [String(id), Number(qty)]),
    );

    setLines((current) =>
      current.flatMap((item) => {
        const remainingQty =
          item.qty - (purchasedQuantities.get(String(item.id)) || 0);

        return remainingQty > 0 ? [{ ...item, qty: remainingQty }] : [];
      }),
    );
  }, []);

  const clear = () => setLines([]);
  const count = lines.reduce((sum, item) => sum + item.qty, 0);
  const total = lines.reduce(
    (sum, item) => sum + Number(item.price) * item.qty,
    0,
  );

  const value = {
    products,
    categories,
    storefront,
    refreshProducts,
    lines,
    total,
    count,
    query,
    setQuery,
    toast,
    add,
    setQty,
    remove,
    removeItems,
    removePurchasedItems,
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
