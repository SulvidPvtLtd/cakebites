-- Introduce "Payment failed" as a canonical archived status for
-- orders that never completed payment.

-- Normalize existing variants.
update public.orders
set status = 'Payment failed'
where status is not null
  and lower(btrim(status)) in ('payment failed', 'payment_failed', 'failed payment', 'paymentfailed');

-- Reclassify unpaid orders tied to failed/cancelled transactions.
update public.orders o
set status = 'Payment failed'
from public.payment_transactions pt
where o.payment_transaction_id = pt.id
  and lower(btrim(o.status)) in ('pending payment', 'new')
  and lower(btrim(pt.status)) in ('failed', 'cancelled', 'canceled');
