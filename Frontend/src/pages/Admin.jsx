import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createAdminProduct,
  deleteAdminProduct,
  deletePromotion,
  getAdminData,
  savePromotion,
  updateAdminCustomer,
  updateAdminOrder,
  updateAdminProduct,
  updateStoreSettings,
} from "../api.js";
import { useStore } from "../context/storeContext.js";
import { money, fmtDate } from "../utils.js";

const tabs = [
  ["overview", "Overview"],
  ["products", "Products"],
  ["orders", "Orders"],
  ["customers", "Customers"],
  ["store", "Store & promotions"],
];

const blankProduct = {
  name: "",
  description: "",
  category: "",
  price: "",
  old_price: "",
  stock: "0",
  image: "",
};

const blankPromotion = {
  code: "",
  description: "",
  discountPercent: "",
  isActive: true,
};

const unwrap = (result) => result?.data;

export default function Admin() {
  const { tab = "overview" } = useParams();
  const { refreshProducts } = useStore();
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({ store_name: "", announcement: "" });
  const [promotions, setPromotions] = useState([]);
  const [productForm, setProductForm] = useState(blankProduct);
  const [editingProduct, setEditingProduct] = useState(null);
  const [promotionForm, setPromotionForm] = useState(blankPromotion);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryResult, productResult, orderResult, customerResult, settingsResult, promotionResult] =
        await Promise.all([
          getAdminData("summary"),
          getAdminData("products"),
          getAdminData("orders"),
          getAdminData("customers"),
          getAdminData("settings"),
          getAdminData("promotions"),
        ]);
      setSummary(unwrap(summaryResult));
      setProducts(unwrap(productResult) || []);
      setOrders(unwrap(orderResult) || []);
      setCustomers(unwrap(customerResult) || []);
      setSettings(unwrap(settingsResult) || { store_name: "", announcement: "" });
      setPromotions(unwrap(promotionResult) || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadAdminData);
  }, []);

  const runAction = async (action, successMessage) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
    } catch (actionError) {
      setError(actionError.message || "The action could not be completed");
      throw actionError;
    } finally {
      setBusy(false);
    }
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    try {
      await runAction(async () => {
        if (editingProduct) {
          await updateAdminProduct(editingProduct, productForm);
        } else {
          await createAdminProduct(productForm);
        }
        setProductForm(blankProduct);
        setEditingProduct(null);
        await Promise.all([loadAdminData(), refreshProducts()]);
      }, editingProduct ? "Product updated." : "Product created.");
    } catch {
      // The action error is displayed in the dashboard.
    }
  };

  const submitPromotion = async (event) => {
    event.preventDefault();
    try {
      await runAction(async () => {
        const result = await savePromotion(promotionForm);
        setPromotions(unwrap(result) || []);
        setPromotionForm(blankPromotion);
      }, "Promotion saved.");
    } catch {
      // The action error is displayed in the dashboard.
    }
  };

  const changeOrderStatus = async (orderId, status) => {
    try {
      await runAction(async () => {
        await updateAdminOrder(orderId, status);
        setOrders((current) =>
          current.map((order) =>
            order.id === orderId ? { ...order, status } : order,
          ),
        );
      }, `Order #${orderId} updated.`);
    } catch {
      // The action error is displayed in the dashboard.
    }
  };

  const changeCustomerStatus = async (customer) => {
    try {
      await runAction(async () => {
        const active = !customer.isActive;
        await updateAdminCustomer(customer.id, active);
        setCustomers((current) =>
          current.map((item) =>
            item.id === customer.id ? { ...item, isActive: active } : item,
          ),
        );
      }, `Customer account ${customer.isActive ? "disabled" : "enabled"}.`);
    } catch {
      // The action error is displayed in the dashboard.
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    try {
      await runAction(async () => {
        const result = await updateStoreSettings(settings);
        setSettings(unwrap(result));
      }, "Store settings saved.");
    } catch {
      // The action error is displayed in the dashboard.
    }
  };

  const activeTab = tabs.some(([id]) => id === tab) ? tab : "overview";

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/">Basemark <span>ADMIN</span></Link>
        <nav aria-label="Admin sections">
          {tabs.map(([id, label]) => (
            <Link
              key={id}
              to={id === "overview" ? "/admin" : `/admin/${id}`}
              className={activeTab === id ? "active" : ""}
            >
              {label}
            </Link>
          ))}
          <Link to="/">View storefront</Link>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-heading">
          <div>
            <p className="admin-eyebrow">STORE MANAGEMENT</p>
            <h1>{tabs.find(([id]) => id === activeTab)?.[1]}</h1>
          </div>
          <button type="button" className="btn outline" onClick={loadAdminData} disabled={loading}>
            Refresh data
          </button>
        </header>

        {error && <p className="bad admin-message" role="alert">{error}</p>}
        {notice && <p className="ok admin-message" role="status">{notice}</p>}
        {loading ? (
          <section className="admin-card">Loading store data…</section>
        ) : (
          <>
            {activeTab === "overview" && (
              <>
                <section className="admin-stats">
                  {[
                    ["Products", summary?.products],
                    ["Customers", summary?.customers],
                    ["Orders", summary?.orders],
                    ["Sales", money(summary?.sales || 0)],
                  ].map(([label, value]) => (
                    <article className="admin-card admin-stat" key={label}>
                      <span>{label}</span>
                      <strong>{value ?? 0}</strong>
                    </article>
                  ))}
                </section>
                <section className="admin-card">
                  <h2>Recent orders</h2>
                  <OrderTable orders={orders.slice(0, 5)} onStatusChange={changeOrderStatus} />
                </section>
              </>
            )}

            {activeTab === "products" && (
              <section className="admin-card">
                <div className="admin-section-heading">
                  <div>
                    <h2>{editingProduct ? "Edit product" : "Add a product"}</h2>
                    <p>Changes are published to the public shop immediately.</p>
                  </div>
                  {editingProduct && (
                    <button
                      type="button"
                      className="btn outline"
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm(blankProduct);
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
                <form className="admin-form" onSubmit={submitProduct}>
                  <label>Product name<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
                  <label>Category<input required value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value.toLowerCase().trim().replace(/\s+/g, "-") })} placeholder="e.g. dresses" /></label>
                  <label>Sale price (Rs.)<input required type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label>
                  <label>Original price (Rs.)<input type="number" min="0" step="0.01" value={productForm.old_price} onChange={(e) => setProductForm({ ...productForm, old_price: e.target.value })} /></label>
                  <label>Stock quantity<input required type="number" min="0" step="1" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></label>
                  <label>Image URL<input value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} /></label>
                  <label className="admin-form-wide">Description<textarea rows="3" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
                  <button className="btn" disabled={busy}>{editingProduct ? "Save product" : "Add product"}</button>
                </form>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Discount</th><th>Stock</th><th>Actions</th></tr></thead>
                    <tbody>
                      {products.map((product) => {
                        const originalPrice = Number(product.old_price ?? product.oldPrice) || 0;
                        const price = Number(product.price);
                        const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
                        return (
                          <tr key={product.id}>
                            <td><div className="admin-product-cell">{product.image && <img src={product.image} alt="" />}<strong>{product.name}</strong></div></td>
                            <td>{product.category || "—"}</td>
                            <td>{money(price)}{originalPrice > price && <small className="admin-subtext"><s>{money(originalPrice)}</s></small>}</td>
                            <td>{discount ? `${discount}%` : "—"}</td>
                            <td>{product.stock}</td>
                            <td className="admin-actions">
                              <button type="button" className="btn outline" onClick={() => {
                                setEditingProduct(product.id);
                                setProductForm({ name: product.name, description: product.description || "", category: product.category || "", price: String(product.price), old_price: originalPrice ? String(originalPrice) : "", stock: String(product.stock), image: product.image || "" });
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}>Edit</button>
                              <button type="button" className="btn danger" disabled={busy} onClick={async () => {
                                if (!window.confirm(`Delete ${product.name}?`)) return;
                                try {
                                  await runAction(async () => {
                                    await deleteAdminProduct(product.id);
                                    await Promise.all([loadAdminData(), refreshProducts()]);
                                  }, "Product deleted.");
                                } catch {
                                  // The action error is displayed in the dashboard.
                                }
                              }}>Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "orders" && (
              <section className="admin-card">
                <h2>Customer orders</h2>
                <OrderTable orders={orders} onStatusChange={changeOrderStatus} />
              </section>
            )}

            {activeTab === "customers" && (
              <section className="admin-card">
                <h2>Customer accounts</h2>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Customer</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
                    <tbody>{customers.map((customer) => (
                      <tr key={customer.id}>
                        <td><strong>{customer.name}</strong><small className="admin-subtext">{customer.email}</small></td>
                        <td>{customer.phone || "—"}</td>
                        <td>{customer.role}</td>
                        <td>{customer.isActive ? "Active" : "Disabled"}</td>
                        <td>{fmtDate(customer.createdAt)}</td>
                        <td>{customer.role === "admin" ? "Protected" : <button className={`btn ${customer.isActive ? "danger" : "outline"}`} disabled={busy} onClick={() => changeCustomerStatus(customer)}>{customer.isActive ? "Disable" : "Enable"}</button>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "store" && (
              <div className="admin-store-grid">
                <section className="admin-card">
                  <h2>Storefront settings</h2>
                  <form className="admin-form admin-form-single" onSubmit={saveSettings}>
                    <label>Store name<input required value={settings.store_name || ""} onChange={(e) => setSettings({ ...settings, store_name: e.target.value })} /></label>
                    <label>Announcement banner<textarea rows="3" value={settings.announcement || ""} onChange={(e) => setSettings({ ...settings, announcement: e.target.value })} placeholder="Leave blank to hide the banner" /></label>
                    <button className="btn" disabled={busy}>Save settings</button>
                  </form>
                </section>
                <section className="admin-card">
                  <h2>Create a promotion</h2>
                  <p>Customers can enter this code during checkout.</p>
                  <form className="admin-form admin-form-single" onSubmit={submitPromotion}>
                    <label>Promo code<input required minLength="3" value={promotionForm.code} onChange={(e) => setPromotionForm({ ...promotionForm, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME10" /></label>
                    <label>Description<input required value={promotionForm.description} onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })} /></label>
                    <label>Discount (%)<input required type="number" min="1" max="90" step="0.01" value={promotionForm.discountPercent} onChange={(e) => setPromotionForm({ ...promotionForm, discountPercent: e.target.value })} /></label>
                    <button className="btn" disabled={busy}>Create promotion</button>
                  </form>
                </section>
                <section className="admin-card admin-promotion-list">
                  <h2>Promotions</h2>
                  {!promotions.length && <p>No promotions created yet.</p>}
                  {promotions.map((promotion) => (
                    <div className="admin-promotion-row" key={promotion.id}>
                      <div><strong>{promotion.code}</strong><span>{promotion.description} · {promotion.discountPercent}% off</span></div>
                      <label className="admin-promo-active"><input type="checkbox" checked={Boolean(promotion.isActive)} onChange={async (event) => {
                        try {
                          const result = await savePromotion({ ...promotion, isActive: event.target.checked });
                          setPromotions(unwrap(result) || []);
                          setNotice("Promotion updated.");
                        } catch (promotionError) {
                          setError(promotionError.message);
                        }
                      }} /> Active</label>
                      <button className="btn danger" disabled={busy} onClick={async () => {
                        try {
                          await runAction(async () => {
                            await deletePromotion(promotion.id);
                            setPromotions((current) => current.filter((item) => item.id !== promotion.id));
                          }, "Promotion deleted.");
                        } catch {
                          // The action error is displayed in the dashboard.
                        }
                      }}>Delete</button>
                    </div>
                  ))}
                </section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function OrderTable({ orders, onStatusChange }) {
  if (!orders.length) return <p>No orders yet.</p>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Update status</th></tr></thead>
        <tbody>{orders.map((order) => (
          <tr key={order.id}>
            <td><strong>#{order.id}</strong><small className="admin-subtext">{fmtDate(order.createdAt)}</small></td>
            <td><strong>{order.customerName}</strong><small className="admin-subtext">{order.customerEmail}</small><small className="admin-subtext">{order.customerPhone}</small></td>
            <td>{(order.items || []).map((item) => `${item.name} × ${item.qty}`).join(", ")}</td>
            <td>{money(order.total)}</td>
            <td>{order.paymentMethod}<small className="admin-subtext">{order.paymentStatus}</small></td>
            <td>{order.status}</td>
            <td><select value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value)} aria-label={`Update order ${order.id} status`}>
              {["awaiting_payment", "pending", "processing", "shipped", "delivered", "cancelled"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
