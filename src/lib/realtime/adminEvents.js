import { getIO } from '../../sockets/socket.config.js';

// Best-effort — a notification is a side channel, never a reason to fail the
// request/transaction that triggered it (e.g. socket.io not initialized yet
// in a script/test context).
const emit = (event, payload) => {
  try {
    getIO().of('/admin').to('admin-room').emit(event, payload);
  } catch (err) {
    // Socket.IO not initialized — nothing to notify.
  }
};

export const AdminEvents = {
  emitNewBooking({ orderId, orderNumber, customerName, serviceNames, amount, createdAt }) {
    emit('booking:new', { orderId, orderNumber, customerName, serviceNames, amount, createdAt });
  },

  emitKycSubmitted({ vendorId, vendorName, submittedAt }) {
    emit('kyc:submitted', { vendorId, vendorName, submittedAt });
  },

  // eventType: 'paid' | 'failed' | 'refunded'
  emitPaymentEvent(payment, eventType) {
    emit(`payment:${eventType}`, {
      paymentId: payment._id,
      amount: payment.amount,
      status: payment.status,
      purposeType: payment.purposeType,
    });
  },
};
