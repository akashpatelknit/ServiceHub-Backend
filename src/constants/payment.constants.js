export const PAYMENT_STATUSES = Object.freeze({
  UNPAID: 'unpaid',
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'partial_refund',
});

export const PAYMENT_METHODS = Object.freeze({
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  NET_BANKING: 'net_banking',
  UPI: 'upi',
  WALLET: 'wallet',
  PAYPAL: 'paypal',
  CASH: 'cash',
  RAZORPAY: 'razorpay',
  OTHER: 'other',
});
