import crypto from 'node:crypto';
import { Kyc } from '../models/kyc.model.js';
import Transaction from '../../../models/transaction.model.js';
import { Setting } from '../../../models/settings.model.js';
import { Address } from '../../address/models/address.model.js';
import { ApiError } from '../../../utils/index.js';
import config from '../../../config/config.js';
import { createKYCOrder } from '../../../controllers/payment/utils/createRazorpayOrder.js';
import { KYC_STATUS, KYC_TRANSITIONS } from '../constants/kyc.constants.js';

const DEFAULT_KYC_AMOUNT = 500;

const assertTransition = (from, to) => {
  const allowed = KYC_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ApiError(409, `Cannot move KYC from "${from}" to "${to}"`);
  }
};

const applyTransition = async (kyc, to, patch = {}) => {
  assertTransition(kyc.status, to);
  Object.assign(kyc, patch);
  kyc.status = to;
  kyc.history.push({ status: to });
  await kyc.save();
  return kyc.populate('info.address');
};

const getOrCreateDraft = async (vendorId) => {
  const existing = await Kyc.findOne({ vendor: vendorId });
  if (existing) return existing;
  return Kyc.create({ vendor: vendorId, status: KYC_STATUS.DRAFT, history: [{ status: KYC_STATUS.DRAFT }] });
};

export const KycService = {
  async getByVendor(vendorId) {
    const kyc = await Kyc.findOne({ vendor: vendorId }).populate('info.address');
    if (!kyc) {
      throw new ApiError(404, 'KYC record not found');
    }
    return kyc;
  },

  // Step 1
  async submitInfo(vendorId, info) {
    if (info.address) {
      const addressExists = await Address.exists({ _id: info.address });
      if (!addressExists) {
        throw new ApiError(404, 'Address not found');
      }
    }

    const kyc = await getOrCreateDraft(vendorId);
    return applyTransition(kyc, KYC_STATUS.INFO_SUBMITTED, { info });
  },

  // Step 2
  async submitDocuments(vendorId, documents) {
    const kyc = await this.getByVendor(vendorId);
    return applyTransition(kyc, KYC_STATUS.DOCUMENTS_SUBMITTED, { documents });
  },

  // Step 3
  async submitBankDetails(vendorId, bankDetails) {
    const kyc = await this.getByVendor(vendorId);
    return applyTransition(kyc, KYC_STATUS.BANK_DETAILS_SUBMITTED, { bankDetails });
  },

  // Step 4a — create the Razorpay order. Reuses the existing payment
  // feature's order-creation utility and the shared Transaction ledger
  // rather than standing up a parallel payment pipeline inside auth.
  async initiatePayment(vendorId) {
    const kyc = await this.getByVendor(vendorId);
    assertTransition(kyc.status, KYC_STATUS.PAYMENT_COMPLETED); // must be bank_details_submitted

    const settings = await Setting.findOne();
    const amount = parseFloat(settings?.kycPrice) || DEFAULT_KYC_AMOUNT;

    const transaction = await Transaction.create({
      amount,
      currency: 'INR',
      transactionType: 'debit',
      status: 'pending',
      paymentMethod: 'razorpay',
      transactionFor: 'kyc_payment',
      user: { userType: 'Vendor', userId: vendorId },
      relatedEntity: { entityType: 'Vendor', entityId: vendorId },
    });

    const customer = {
      name: [kyc.info?.firstName, kyc.info?.lastName].filter(Boolean).join(' '),
      email: kyc.info?.email,
      contact: kyc.info?.phoneNumber,
    };

    const { razorpayOrder } = await createKYCOrder({
      vendorId,
      totalAmount: amount,
      orderId: `KYC_${transaction._id}`,
      userType: 'Vendor',
      transactionId: transaction._id.toString(),
      customer,
    });

    transaction.paymentDetails.gateway = { name: 'razorpay', orderId: razorpayOrder.id, gatewayResponse: razorpayOrder };
    await transaction.save();

    return { transactionId: transaction._id, amount, razorpayOrder, razorpayKeyId: config.RAZORPAY_KEY_ID };
  },

  // Step 4b — verify the Razorpay signature, mark the ledger entry complete,
  // then cascade payment_completed -> pending_verification: there's no
  // separate "submit for review" action once payment clears.
  async verifyPayment(vendorId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const kyc = await this.getByVendor(vendorId);
    assertTransition(kyc.status, KYC_STATUS.PAYMENT_COMPLETED);

    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new ApiError(400, 'Payment verification failed — invalid signature');
    }

    const transaction = await Transaction.findOne({ 'paymentDetails.gateway.orderId': razorpay_order_id });
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found for this order');
    }

    await transaction.markKYCPaymentCompleted(razorpay_payment_id, razorpay_signature, 'razorpay');

    await applyTransition(kyc, KYC_STATUS.PAYMENT_COMPLETED, { paymentRef: transaction._id });
    return applyTransition(kyc, KYC_STATUS.PENDING_VERIFICATION);
  },

  async approve(vendorId, adminId, comments) {
    const kyc = await this.getByVendor(vendorId);
    return applyTransition(kyc, KYC_STATUS.VERIFIED, {
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewComments: comments,
    });
  },

  async reject(vendorId, adminId, reason, comments) {
    const kyc = await this.getByVendor(vendorId);
    return applyTransition(kyc, KYC_STATUS.REJECTED, {
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectionReason: reason,
      reviewComments: comments,
    });
  },
};
