import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext.js';
import { useAuth } from '../context/authContext.js';
import { createEsewaPayment, placeOrder, validatePromotion } from '../api.js';
import { ls, money } from '../utils.js';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/+$/,
  '',
);

export default function Checkout() {
  const { lines, removePurchasedItems, storefront } = useStore();
  const { user } = useAuth();

  const [f, setF] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const [selectedIds, setSelectedIds] = useState(
    () => new Set(lines.map((line) => String(line.id))),
  );

  const [selectedQuantities, setSelectedQuantities] = useState(() =>
    Object.fromEntries(lines.map((line) => [String(line.id), 1])),
  );

  const [promoCode, setPromoCode] = useState('');
  const [promotionQuote, setPromotionQuote] = useState(null);
  const [promotionError, setPromotionError] = useState('');
  const [checkingPromotion, setCheckingPromotion] = useState(false);

  const selectedLines = lines
    .filter((line) => selectedIds.has(String(line.id)))
    .map((line) => ({
      ...line,
      qty: Math.min(
        line.qty,
        Math.max(1, Number(selectedQuantities[String(line.id)]) || 1),
      ),
    }));

  const selectedCount = selectedLines.reduce((sum, line) => sum + line.qty, 0);

  const selectedTotal = selectedLines.reduce(
    (sum, line) => sum + Number(line.price) * line.qty,
    0,
  );

  const finalTotal = Number(promotionQuote?.total ?? selectedTotal);

  const set = (key) => (event) =>
    setF((current) => ({
      ...current,
      [key]: event.target.value,
    }));

  async function applyPromotion() {
    setCheckingPromotion(true);
    setPromotionError('');
    setPromotionQuote(null);

    try {
      const result = await validatePromotion(promoCode, selectedTotal);

      setPromotionQuote(result.data);
    } catch (error) {
      setPromotionError(error.message || 'Unable to apply promotion');
    } finally {
      setCheckingPromotion(false);
    }
  }

  async function startEsewaPayment(order) {
    const result = await createEsewaPayment({
      amount: Number(order.total),
      orderId: order.orderId,
    });

    if (!result.success) {
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

 async function startKhaltiPayment(order) {
   if (!order?.orderId) {
     throw new Error('Order ID was not returned after creating the order.');
   }

const token = ls.get('bm_token');

   if (!token || token.startsWith('demo:')) {
     throw new Error('Please log in before making a Khalti payment.');
   }

   const response = await fetch(`${API_URL}/payments/khalti/initiate`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`,
     },
     body: JSON.stringify({
       orderId: order.orderId,
       amount: Number(order.total),
       customer: {
         name: f.name,
         email: user?.email || '',
         phone: f.phone,
       },
       items: selectedLines.map((item) => ({
         productId: item.id,
         name: item.name,
         price: Number(item.price),
         qty: Number(item.qty),
       })),
     }),
   });

   const responseText = await response.text();

   let result;

   try {
     result = JSON.parse(responseText);
   } catch {
     throw new Error('Backend returned an invalid Khalti response');
   }

   if (!response.ok || !result.success) {
     throw new Error(result.message || 'Unable to initialize Khalti payment');
   }

   if (!result.data?.paymentUrl) {
     throw new Error('Khalti payment URL was not returned');
   }

   sessionStorage.setItem(
     'bm_pending_payment_items',
     JSON.stringify(
       selectedLines.map(({ id, qty }) => ({
         id,
         qty,
       })),
     ),
   );

   window.location.href = result.data.paymentUrl;
 }

  async function submit(event) {
    event.preventDefault();

    if (!selectedLines.length) {
      setErr('Choose at least one item to buy now.');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      /*
       * Create the order FIRST.
       *
       * This is required for both eSewa and Khalti because
       * the payment must be connected to an existing order.
       */
      const order = await placeOrder({
        customer: f,

        items: selectedLines.map(({ id, qty }) => ({
          id,
          qty,
        })),

        paymentMethod,

        promoCode: promoCode.trim() || undefined,
      });

      /*
       * eSewa
       */
      if (paymentMethod === 'ESEWA') {
        sessionStorage.setItem(
          'bm_pending_esewa_items',
          JSON.stringify(
            selectedLines.map(({ id, qty }) => ({
              id,
              qty,
            })),
          ),
        );

        await startEsewaPayment(order);

        return;
      }

      /*
       * Khalti
       */
      if (paymentMethod === 'KHALTI') {
        await startKhaltiPayment(order);

        return;
      }

      /*
       * Cash on Delivery
       */
      setDone(order);

      removePurchasedItems(
        selectedLines.map(({ id, qty }) => ({
          id,
          qty,
        })),
      );

      setBusy(false);
    } catch (error) {
      console.error('Checkout error:', error);

      setErr(error.message || 'Something went wrong while placing your order.');

      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="wrap">
        <section className="section center">
          <h2>Thank you, your order is placed!</h2>

          <p>
            Order <b>#{done.orderId}</b> · Total <b>{money(done.total)}</b>
          </p>

          <p>
            Payment:{' '}
            <b>
              {done.paymentMethod === 'COD' ? 'Cash on Delivery' : done.paymentMethod}
            </b>
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

        {/* COD */}
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

        {/* eSewa */}
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

        {/* Khalti */}
        <label className="pay">
          <input
            type="radio"
            name="paymentMethod"
            value="KHALTI"
            checked={paymentMethod === 'KHALTI'}
            onChange={() => setPaymentMethod('KHALTI')}
          />
          🟣 Pay with Khalti
        </label>

        <h2 className="mt">3. Your items</h2>

        <p className="checkout-selection-help">
          Select the items you want to buy now. Unselected items stay in your cart for
          later.
        </p>

        {storefront.promotions?.length > 0 && (
          <div className="checkout-promotions">
            {storefront.promotions.map((promotion) => (
              <p key={promotion.id}>
                <strong>{promotion.code}</strong> — {promotion.discountPercent}% off
                {promotion.description ? `: ${promotion.description}` : ''}
              </p>
            ))}
          </div>
        )}

        {lines.map((line) => {
          const id = String(line.id);

          const isSelected = selectedIds.has(id);

          const quantity = Math.min(
            line.qty,
            Math.max(1, Number(selectedQuantities[id]) || 1),
          );

          return (
            <div className="line" key={line.id}>
              <label className="checkout-item-select">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(event) => {
                    setSelectedIds((current) => {
                      const next = new Set(current);

                      if (event.target.checked) {
                        next.add(id);
                      } else {
                        next.delete(id);
                      }

                      return next;
                    });
                  }}
                  aria-label={`Buy ${line.name} now`}
                />
              </label>

              <img src={line.image} alt={line.name} />

              <div className="grow">
                {line.name}

                <div className="price">
                  {money(line.price)} each · {line.qty} in cart
                </div>
              </div>

              <div className="checkout-quantity">
                <span>Buy quantity</span>

                <div className="qty">
                  <button
                    type="button"
                    aria-label={`Buy one fewer ${line.name}`}
                    disabled={!isSelected || quantity <= 1}
                    onClick={() =>
                      setSelectedQuantities((current) => ({
                        ...current,
                        [id]: quantity - 1,
                      }))
                    }>
                    −
                  </button>

                  <span>{quantity}</span>

                  <button
                    type="button"
                    aria-label={`Buy one more ${line.name}`}
                    disabled={!isSelected || quantity >= line.qty}
                    onClick={() =>
                      setSelectedQuantities((current) => ({
                        ...current,
                        [id]: quantity + 1,
                      }))
                    }>
                    +
                  </button>
                </div>
              </div>

              <b>{money(line.price * quantity)}</b>

              <button
                className="btn outline checkout-buy-one"
                type="button"
                onClick={() => {
                  setSelectedIds(new Set([id]));

                  setSelectedQuantities((current) => ({
                    ...current,
                    [id]: 1,
                  }));
                }}>
                Buy only this
              </button>
            </div>
          );
        })}
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

        {promotionQuote && (
          <div className="sum">
            <span>Promotion ({promotionQuote.code})</span>

            <b>−{money(promotionQuote.discountAmount)}</b>
          </div>
        )}

        <div className="sum big">
          <span>Total</span>

          <b>{money(finalTotal)}</b>
        </div>

        <div className="checkout-promo-field">
          <label htmlFor="checkout-promo-code">Promotion code</label>

          <div className="checkout-promo-controls">
            <input
              id="checkout-promo-code"
              value={promoCode}
              onChange={(event) => {
                setPromoCode(event.target.value.toUpperCase());

                setPromotionQuote(null);
                setPromotionError('');
              }}
              placeholder="Enter promo code"
              autoComplete="off"
            />

            <button
              className="btn outline"
              type="button"
              disabled={checkingPromotion || !promoCode.trim() || !selectedCount}
              onClick={applyPromotion}>
              {checkingPromotion ? 'Checking…' : 'Apply'}
            </button>
          </div>

          {promotionError && <p className="bad">{promotionError}</p>}
        </div>

        {!selectedCount && <p>Select at least one item to continue.</p>}

        {paymentMethod === 'ESEWA' && (
          <p>Payment will continue through the eSewa test gateway.</p>
        )}

        {paymentMethod === 'KHALTI' && (
          <p>Payment will continue through the Khalti test gateway.</p>
        )}

        {err && <p className="bad">{err}</p>}

        <button className="btn" disabled={busy || !selectedCount}>
          {busy
            ? paymentMethod === 'ESEWA'
              ? 'Connecting to eSewa...'
              : paymentMethod === 'KHALTI'
                ? 'Connecting to Khalti...'
                : 'Placing order...'
            : paymentMethod === 'ESEWA'
              ? 'Pay with eSewa'
              : paymentMethod === 'KHALTI'
                ? 'Pay with Khalti'
                : 'Place order'}
        </button>
      </aside>
    </form>
  );
}
