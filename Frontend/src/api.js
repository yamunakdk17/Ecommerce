import { ls } from "./utils.js";

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
let demo = false;
export const isDemo = () => demo;

async function request(path, options = {}) {
  const token = ls.get("bm_token");
  const headers = { "Content-Type": "application/json" };
  if (token && !token.startsWith("demo:"))
    headers.Authorization = "Bearer " + token;
  let res;
  try {
    res = await fetch(BASE + path, { ...options, headers });
  } catch {
    return mock(path, options); // backend unreachable
  }
  const responseText = await res.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error("The server returned an invalid response");
  }
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  demo = false;
  return data;
}

// Demo mode: when the Express API is not running, accounts and orders are kept in this browser only.
function mock(path, options) {
  demo = true;
  const body = options.body ? JSON.parse(options.body) : {};
  const method = options.method || "GET";
  const d = JSON.parse(ls.get("bm_demo") || '{"users":[],"orders":[]}');
  const save = () => ls.set("bm_demo", JSON.stringify(d));
  const uid = Number((ls.get("bm_token") || "").split(":")[1]);
  const me = d.users.find((u) => u.id === uid);
  const pub = (user) =>
    Object.fromEntries(
      Object.entries(user).filter(([key]) => key !== "password"),
    );

  if (path === "/auth/register") {
    if (d.users.some((u) => u.email === body.email))
      throw new Error("This email is already registered");
    const u = { id: Date.now(), address: "", ...body };
    d.users.push(u);
    save();
    return { token: "demo:" + u.id, user: pub(u) };
  }
  if (path === "/auth/login") {
    const u = d.users.find(
      (x) => x.email === body.email && x.password === body.password,
    );
    if (!u) throw new Error("Wrong email or password");
    return { token: "demo:" + u.id, user: pub(u) };
  }
  if (!me) throw new Error(path === "/products" ? "offline" : "Please log in");
  if (path === "/auth/me" && method === "GET") return pub(me);
  if (path === "/auth/me") {
    Object.assign(me, {
      name: body.name,
      phone: body.phone,
      address: body.address,
    });
    save();
    return pub(me);
  }
  if (path === "/orders" && method === "GET")
    return d.orders.filter((o) => o.userId === me.id).reverse();
  if (path === "/orders") {
    const items = body.items.map((i) => ({
      productId: i.id,
      qty: i.qty,
      name: i.name,
      image: i.image,
      price: i.price,
    }));
    const o = {
      id: 1001 + d.orders.length,
      userId: me.id,
      status: "pending",
      createdAt: new Date().toISOString(),
      items,
      total: items.reduce((s, i) => s + i.qty * i.price, 0),
    };
    d.orders.push(o);
    save();
    return { orderId: o.id, total: o.total };
  }
  throw new Error("offline");
}

export const getProducts = () => request("/products");
export const getProductReviews = (productId) =>
  request(`/products/${productId}/reviews`);
export const submitProductReview = (productId, review) =>
  request(`/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(review),
  });
export const getStorefrontData = () => request("/storefront");
export const validatePromotion = (code, subtotal) =>
  request("/storefront/promotions/validate", {
    method: "POST",
    body: JSON.stringify({ code, subtotal }),
  });
export const registerUser = (f) =>
  request("/auth/register", { method: "POST", body: JSON.stringify(f) });
export const loginUser = (f) =>
  request("/auth/login", { method: "POST", body: JSON.stringify(f) });
export const getMe = () => request("/auth/me");
export const updateMe = (f) =>
  request("/auth/me", { method: "PUT", body: JSON.stringify(f) });
export const getOrders = () => request("/orders");
export const placeOrder = (o) =>
  request("/orders", { method: "POST", body: JSON.stringify(o) });
export const createEsewaPayment = ({ amount, orderId }) =>
  request("/payments/esewa/initiate", {
    method: "POST",
    body: JSON.stringify({ amount, orderId }),
  });
export const getAdminData = (path) => request(`/admin/${path}`);
export const createAdminProduct = (product) =>
  request("/admin/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
export const updateAdminProduct = (id, product) =>
  request(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
export const deleteAdminProduct = (id) =>
  request(`/admin/products/${id}`, { method: "DELETE" });
export const updateAdminOrder = (id, status) =>
  request(`/admin/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const updateAdminCustomer = (id, isActive) =>
  request(`/admin/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
export const updateStoreSettings = (settings) =>
  request("/admin/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
export const savePromotion = (promotion) =>
  request(
    promotion.id ? `/admin/promotions/${promotion.id}` : "/admin/promotions",
    {
      method: promotion.id ? "PUT" : "POST",
      body: JSON.stringify(promotion),
    },
  );
export const deletePromotion = (id) =>
  request(`/admin/promotions/${id}`, { method: "DELETE" });
