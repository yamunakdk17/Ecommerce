import { useCallback, useEffect, useMemo, useState } from "react";
import { getProducts, getStorefrontData } from "../api.js";
import { categoryImages } from "../data/Products.js";
import { ls } from "../utils.js";
import { StoreContext } from "./StoreContext.js";

const CART_KEY = "bm_cart";

function readCart() {
  try {
    const saved = JSON.parse(ls.get(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function normalizeCategory(category) {
  return String(category || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeProduct(product) {
  return {
    ...product,
    id: product.id,
    price: Number(product.price),
    oldPrice:
      product.oldPrice === null || product.oldPrice === undefined
        ? null
        : Number(product.oldPrice),
    image: typeof product.image === "string" ? product.image.trim() : "",
    category: normalizeCategory(product.category),
    stock: Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0,
    rating:
      product.rating === null || product.rating === undefined
        ? null
        : Number(product.rating),
    reviewCount: Number(product.reviewCount) || 0,
  };
}

export function StoreProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState("");
  const [storefront, setStorefront] = useState({
    storeName: "Basemark",
    announcement: "",
    promotions: [],
  });
  const [lines, setLines] = useState(readCart);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  const refreshProducts = useCallback(async () => {
    setProductLoading(true);
    setProductError("");
    try {
      const result = await getProducts();
      if (result?.success === false) {
        throw new Error(result.message || "Product request failed");
      }
      const rows = Array.isArray(result) ? result : result?.data;
      if (!Array.isArray(rows)) {
        throw new Error("The products endpoint returned an invalid catalog");
      }
      const normalized = rows.map(normalizeProduct);
      setProducts(normalized);
      setLines((current) =>
        current.map((line) => {
          const currentProduct = normalized.find(
            (product) => String(product.id) === String(line.id),
          );
          return currentProduct ? { ...currentProduct, qty: line.qty } : line;
        }),
      );
      return normalized;
    } catch (error) {
      console.error("Unable to load product catalog:", error);
      setProducts([]);
      setProductError("The product catalog could not be loaded. Please try again.");
      throw error;
    } finally {
      setProductLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => (active ? refreshProducts() : undefined))
      .catch(() => {});
    getStorefrontData()
      .then((result) => {
        if (active && result?.data) setStorefront(result.data);
      })
      .catch((error) => {
        console.error("Unable to load storefront details:", error);
      });
    return () => {
      active = false;
    };
  }, [refreshProducts]);

  const categories = useMemo(() => {
    const slugs = [...new Set(products.map((product) => product.category).filter(Boolean))];
    return slugs.map((slug) => ({
      slug,
      name: slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      image: categoryImages[slug] || "",
    }));
  }, [products]);

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
    const product =
      typeof productOrId === "object"
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
    productLoading,
    productError,
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
