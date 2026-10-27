import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/+$/,
  '',
);

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const data = searchParams.get('data');

        if (!data) {
          throw new Error('No eSewa payment response was received.');
        }

        const response = await fetch(`${API_URL}/payments/esewa/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Payment verification failed.');
        }

        if (result.success && result.paymentStatus === 'COMPLETE') {
          setPayment(result);
        } else {
          throw new Error(result.message || 'Payment was not completed.');
        }
      } catch (err) {
        console.error('eSewa verification error:', err);

        setError(err.message || 'Unable to verify payment.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="wrap">
        <section className="section center">
          <h2>Verifying payment...</h2>

          <p>Please wait while we confirm your payment with eSewa.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrap">
        <section className="section center">
          <h2>❌ Payment could not be confirmed</h2>

          <p>{error}</p>

          <p>
            <Link to="/checkout" className="btn">
              Try Again
            </Link>{' '}
            <Link to="/shop" className="btn outline">
              Continue Shopping
            </Link>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="wrap">
      <section className="section center">
        <h2>✅ Payment Successful</h2>

        <p>Your eSewa payment has been successfully verified.</p>

        {payment?.data && (
          <>
            <p>
              Transaction ID: <b>{payment.data.transactionUuid}</b>
            </p>

            <p>
              Amount: <b>Rs. {payment.data.amount}</b>
            </p>

            <p>
              Transaction Code: <b>{payment.data.transactionCode}</b>
            </p>
          </>
        )}

        <p>
          <Link to="/dashboard/orders" className="btn">
            View Orders
          </Link>{' '}
          <Link to="/shop" className="btn outline">
            Continue Shopping
          </Link>
        </p>
      </section>
    </div>
  );
}
