import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext.js';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/+$/,
  '',
);

const FAILURE_MESSAGE = 'Unable to verify the payment. Please try again.';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();

  // eSewa returns ?data=...
  const responseData = searchParams.get('data');

  // Khalti returns ?pidx=...
  const khaltiPidx = searchParams.get('pidx');

  const [attempt, setAttempt] = useState(0);

  const [state, setState] = useState({
    status: 'loading',
    payment: null,
  });

  const dialogRef = useRef(null);

  const { removePurchasedItems } = useStore();

  /*
   * Remove purchased products from cart after successful payment.
   *
   * The checkout page should store the purchased item IDs in:
   * bm_pending_payment_items
   *
   * For backward compatibility, this also checks the old eSewa key.
   */
  useEffect(() => {
    if (state.status !== 'success') {
      return;
    }

    try {
      const storageKeys = ['bm_pending_payment_items', 'bm_pending_esewa_items'];

      let purchasedItems = [];

      for (const key of storageKeys) {
        const storedItems = sessionStorage.getItem(key);

        if (!storedItems) {
          continue;
        }

        try {
          const parsedItems = JSON.parse(storedItems);

          if (Array.isArray(parsedItems) && parsedItems.length) {
            purchasedItems = parsedItems;
            break;
          }
        } catch (parseError) {
          console.error(`Unable to parse ${key}:`, parseError);
        }
      }

      if (Array.isArray(purchasedItems) && purchasedItems.length) {
        removePurchasedItems(purchasedItems);
      }

      storageKeys.forEach((key) => {
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Unable to update cart after payment:', error);
    }
  }, [removePurchasedItems, state.status]);

  /*
   * Keep the payment dialog accessible.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    const root = document.getElementById('root');

    if (!dialog || !root) {
      return undefined;
    }

    const changedElements = [];
    let current = dialog;

    while (current?.parentElement && current.parentElement !== root) {
      for (const sibling of current.parentElement.children) {
        if (sibling !== current) {
          changedElements.push([sibling, sibling.inert]);

          sibling.inert = true;
        }
      }

      current = current.parentElement;
    }

    if (current?.parentElement === root) {
      for (const sibling of root.children) {
        if (sibling !== current) {
          changedElements.push([sibling, sibling.inert]);

          sibling.inert = true;
        }
      }
    }

    return () => {
      changedElements.forEach(([element, wasInert]) => {
        element.inert = wasInert;
      });
    };
  }, []);

  /*
   * Verify payment.
   *
   * eSewa:
   *   /payment-success?data=...
   *
   * Khalti:
   *   /payment-success?pidx=...
   */
  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      try {
        /*
         * =====================================================
         * KHALTI PAYMENT
         * =====================================================
         */
        if (khaltiPidx) {
          const response = await fetch(`${API_URL}/payments/khalti/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pidx: khaltiPidx,
            }),
          });

          const responseText = await response.text();

          let result;

          try {
            result = JSON.parse(responseText);
          } catch {
            throw new Error('Backend returned a non-JSON payment response.');
          }

          if (
            !response.ok ||
            !result.success ||
            result.paymentStatus !== 'COMPLETE' ||
            !result.data
          ) {
            throw new Error(result.message || 'Khalti payment verification failed.');
          }

          if (!cancelled) {
            setState({
              status: 'success',
              payment: {
                ...result.data,
                paymentMethod: 'KHALTI',
              },
            });
          }

          return;
        }

        /*
         *
         * ESEWA PAYMENT
         */
        if (responseData) {
          const response = await fetch(`${API_URL}/payments/esewa/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: responseData,
            }),
          });

          console.log(response);

          const responseText = await response.text();
          console.log('===== ESEWA DEBUG =====');
          console.log('HTTP STATUS:', response.status);
          console.log('RAW RESPONSE:', responseText);

          let result;

          try {
            result = JSON.parse(responseText);
          } catch (error) {  console.error('JSON PARSE ERROR:', error);
            throw new Error('Backend returned a non-JSON payment response.');
          }
          console.log('SUCCESS:', result.success);
          console.log('PAYMENT STATUS:', result.paymentStatus);
          console.log('DATA:', result.data);
          console.log('======================');
          if (!response.ok) {
            throw new Error(result.message || `Backend error (${response.status})`);
          }
            if (!result.success) {
  throw new Error(
    result.message || "Backend reported payment verification failure."
  );
}
if (result.paymentStatus !== "COMPLETE") {
  throw new Error(
    `eSewa payment status is ${result.paymentStatus || "UNKNOWN"}`
  );
}
if (!result.data) {
  throw new Error("Payment verified but backend returned no payment data.");
}

if (!cancelled) {
  setState({
    status: "success",
    payment: {
      ...result.data,
      paymentMethod: "ESEWA",
    },
  });
}

return;

        }

        /*
         *
         * NO PAYMENT RESPONSE
         * 
         */
        throw new Error('No payment response was received.');
      } catch (error) {
        console.error('Payment verification failed:', error);

        if (!cancelled) {
          setState({
            status: 'failed',
            payment: null,
          });
        }
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [responseData, khaltiPidx, attempt]);

  const isLoading = state.status === 'loading';
  const isSuccess = state.status === 'success';

  const payment = state.payment;

  /*
   * Work with both providers.
   *
   * eSewa:
   *   amount
   *   transactionUuid
   *   transactionCode
   *
   * Khalti:
   *   amount
   *   pidx
   *   transactionId
   */
  const paymentAmount = payment?.amount ?? '—';

  const transactionId = payment?.transactionUuid || payment?.pidx || '—';

  const transactionCode = payment?.transactionCode || payment?.transactionId || '—';

  const paymentMethod = payment?.paymentMethod || '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 px-5 py-5 backdrop-blur-[7px]">
      <section
        ref={dialogRef}
        className="w-full max-w-[410px] rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        aria-describedby="payment-message">
        {/* Payment status icon */}
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold ${
            isLoading
              ? 'animate-spin bg-blue-50 text-blue-600'
              : isSuccess
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-600'
          }`}
          aria-hidden="true">
          {isLoading ? '↻' : isSuccess ? '✓' : '✕'}
        </div>

        {/* Title */}
        <h1
          id="payment-title"
          className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
          {isLoading
            ? 'Verifying Payment'
            : isSuccess
              ? 'Payment Successful'
              : 'Payment Failed'}
        </h1>

        {/* Message */}
        <p
          id="payment-message"
          className="mx-auto mb-6 max-w-sm text-sm leading-6 text-slate-600">
          {isLoading
            ? 'Please wait while we confirm your payment.'
            : isSuccess
              ? 'Your payment has been successfully verified.'
              : FAILURE_MESSAGE}
        </p>

        {/* Payment details */}
        {isSuccess && payment && (
          <dl className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
            {/* Payment method */}
            <div>
              <dt className="text-xs font-medium text-slate-500">Payment Method</dt>

              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {paymentMethod === 'KHALTI'
                  ? 'Khalti'
                  : paymentMethod === 'ESEWA'
                    ? 'eSewa'
                    : paymentMethod || 'Online Payment'}
              </dd>
            </div>

            {/* Amount */}
            <div className="border-t border-slate-200 pt-3">
              <dt className="text-xs font-medium text-slate-500">Amount Paid</dt>

              <dd className="mt-1 break-all text-sm font-semibold text-slate-900">
                Rs. {paymentAmount}
              </dd>
            </div>

            {/* Transaction ID */}
            <div className="border-t border-slate-200 pt-3">
              <dt className="text-xs font-medium text-slate-500">Transaction ID</dt>

              <dd className="mt-1 break-all text-sm font-semibold text-slate-900">
                {transactionId}
              </dd>
            </div>

            {/* Transaction code */}
            <div className="border-t border-slate-200 pt-3">
              <dt className="text-xs font-medium text-slate-500">Transaction Code</dt>

              <dd className="mt-1 break-all text-sm font-semibold text-slate-900">
                {transactionCode}
              </dd>
            </div>
          </dl>
        )}

        {/* Buttons */}
        {!isLoading && (
          <div className="flex flex-col gap-3">
            {isSuccess ? (
              <Link
                to="/dashboard/orders"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">
                View Orders
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setState({
                    status: 'loading',
                    payment: null,
                  });

                  setAttempt((currentAttempt) => currentAttempt + 1);
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700">
                Try Again
              </button>
            )}

            <Link
              to="/shop"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
              Continue Shopping
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
