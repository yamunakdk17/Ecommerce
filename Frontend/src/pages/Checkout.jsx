import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/storeContext.js';
import { useAuth } from '../context/authContext.js';
import { placeOrder } from '../api.js';
import { money } from '../utils.js';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/+$/,
  '',
);

export default function Checkout() {
  const { lines, removeItems } = useStore();
  const { user } = useAuth();

  const [f, setF] = useState({
    name: user.name,
    phone: user.phone || '',
    address: user.address || '',
  });

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(lines.map((line) => String(line.id))),
  );

  const selectedLines = lines.filter((line) =>
    selectedIds.has(String(line.id)),
  );
  const selectedCount = selectedLines.reduce((sum, line) => sum + line.qty, 0);
  const selectedTotal = selectedLines.reduce(
    (sum, line) => sum + Number(line.price) * line.qty,
    0,
  );

  const set = (k) => (e) =>
    setF({
      ...f,
      [k]: e.target.value,
    });

  async function startEsewaPayment() {
    const response = await fetch(`${API_URL}/payments/esewa/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Number(selectedTotal),
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to initialize eSewa payment');
    }

    const { paymentUrl, formData } = result.data;

    const form = document.createElement('form');

    form.method = 'POST';
    form.action = paymentUrl;

    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');

      input.type = 'hidden';
      input.name = key;
      input.value = value;

      form.appendChild(input);
    });

    document.body.appendChild(form);

    form.submit();
  }

  async function submit(e) {
    e.preventDefault();

    if (!selectedLines.length) {
      setErr('Choose at least one item to buy now.');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      if (paymentMethod === 'ESEWA') {
        await startEsewaPayment();
        return;
      }

      const items = selectedLines.map((l) => ({
        id: l.id,
        qty: l.qty,
        name: l.name,
        image: l.image,
        price: l.price,
      }));

      setDone(
        await placeOrder({
          customer: f,
          items,
        }),
      );

      removeItems(selectedLines.map((line) => line.id));
    } catch (x) {
      console.error(x);
      setErr(x.message || 'Something went wrong');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="wrap">
        <section className="section center">
          <h2>Thank you, your order is placed!</h2>

          <p>
            Order <b>#{done.orderId}</b> · Total <b>{money(done.total)}</b> · Pay on
            delivery
          </p>

          <p>
            <Link to="/dashboard/orders" className="btn">
              View my orders
            </Link>{' '}
            <Link to="/shop" className="btn outline">
              Keep shopping
            </Link>
          </p>
        </section>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="wrap">
        <section className="section">
          <h2>Nothing to check out</h2>

          <Link to="/shop" className="btn">
            Shop now
          </Link>
        </section>
      </div>
    );
  }

  return (
    <form className="wrap cart" onSubmit={submit}>
      <section className="section grow">
        <h2>1. Delivery address</h2>

        <div className="form-grid">
          <input required placeholder="Full name" value={f.name} onChange={set('name')} />

          <input
            required
            placeholder="Phone number"
            value={f.phone}
            onChange={set('phone')}
          />

          <input
            required
            placeholder="Full address (area, city)"
            value={f.address}
            onChange={set('address')}
            className="span"
          />
        </div>

        <h2 className="mt">2. Payment method</h2>

        <label className="pay">
          <input
            type="radio"
            name="paymentMethod"
            value="COD"
            checked={paymentMethod === 'COD'}
            onChange={() => setPaymentMethod('COD')}
          />
          Cash on Delivery
        </label>

        <label className="pay">
          <input
            type="radio"
            name="paymentMethod"
            value="ESEWA"
            checked={paymentMethod === 'ESEWA'}
            onChange={() => setPaymentMethod('ESEWA')}
          />
          🟢 Pay with eSewa
        </label>

        <h2 className="mt">3. Your items</h2>
        <p className="checkout-selection-help">
          Select the items you want to buy now. Unselected items stay in your cart
          for later.
        </p>

        {lines.map((l) => (
          <div className="line" key={l.id}>
            <label className="checkout-item-select">
              <input
                type="checkbox"
                checked={selectedIds.has(String(l.id))}
                onChange={(event) => {
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(String(l.id));
                    else next.delete(String(l.id));
                    return next;
                  });
                }}
                aria-label={`Buy ${l.name} now`}
              />
            </label>
            <img src={l.image} alt={l.name} />

            <div className="grow">
              {l.name}

              <div className="price">
                {money(l.price)} × {l.qty}
              </div>
            </div>

            <b>{money(l.price * l.qty)}</b>
            <button
              className="btn outline checkout-buy-one"
              type="button"
              onClick={() => setSelectedIds(new Set([String(l.id)]))}
            >
              Buy only this
            </button>
          </div>
        ))}
      </section>

      <aside className="section checkout">
        <h2>Order summary</h2>

        <div className="sum">
          <span>Items ({selectedCount})</span>
          <b>{money(selectedTotal)}</b>
        </div>

        <div className="sum">
          <span>Delivery</span>
          <b>Free</b>
        </div>

        <div className="sum big">
          <span>Total</span>
          <b>{money(selectedTotal)}</b>
        </div>

        {!selectedCount && <p>Select at least one item to continue.</p>}

        {paymentMethod === 'ESEWA' && (
          <p>Payment will continue through the eSewa test gateway.</p>
        )}

        {err && <p className="bad">{err}</p>}

        <button className="btn" disabled={busy || !selectedCount}>
          {busy
            ? paymentMethod === 'ESEWA'
              ? 'Connecting to eSewa...'
              : 'Placing order...'
            : paymentMethod === 'ESEWA'
              ? 'Pay with eSewa'
              : 'Place order'}
        </button>
      </aside>
    </form>
  );
}
