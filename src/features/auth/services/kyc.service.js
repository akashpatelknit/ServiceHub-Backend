import crypto from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { Kyc } from '../models/kyc.model.js';
import Transaction from '../../../models/transaction.model.js';
import { Setting } from '../../../models/settings.model.js';
import { Address } from '../../address/models/address.model.js';
import { Vendor } from '../../../core/models/index.js';
import { ApiError } from '../../../utils/index.js';
import config from '../../../config/config.js';
import r2Client from '../../../config/r2Config.js';
import { createKYCOrder } from '../../../controllers/payment/utils/createRazorpayOrder.js';
import { KYC_STATUS, KYC_TRANSITIONS, MAX_KYC_IMAGE_SIZE_BYTES } from '../constants/kyc.constants.js';
import { AdminEvents } from '../../../lib/realtime/adminEvents.js';

const DEFAULT_KYC_AMOUNT = 500;
const KYC_UPLOAD_PRESIGN_EXPIRY_SECONDS = 60;

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

  // Vendor calls this to get a short-lived URL to PUT the file straight to R2 from the
  // client — the file itself never passes through this server. Mirrors
  // features/service-catalog's MediaService.generatePresignedUploadUrl.
  async generateDocumentUploadUrl(vendorId, { slot, fileType, fileSize }) {
    if (fileSize > MAX_KYC_IMAGE_SIZE_BYTES) {
      throw new ApiError(400, `File exceeds max size of ${MAX_KYC_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`);
    }

    const extension = fileType.split('/')[1];
    const key = `kyc-documents/${slot}/${vendorId}/${uuid()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: KYC_UPLOAD_PRESIGN_EXPIRY_SECONDS });
    const url = `${config.R2_PUBLIC_URL}/${key}`;

    return { uploadUrl, key, url, expiresIn: KYC_UPLOAD_PRESIGN_EXPIRY_SECONDS };
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
    const submitted = await applyTransition(kyc, KYC_STATUS.PENDING_VERIFICATION);

    const vendor = await Vendor.findById(vendorId).select('firstName lastName middleName');
    AdminEvents.emitKycSubmitted({ vendorId, vendorName: vendor?.fullName, submittedAt: new Date() });

    return submitted;
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

  // Only reachable from `rejected` (see KYC_TRANSITIONS). Clears the prior review
  // verdict but leaves info/documents/bankDetails so the vendor can resubmit from
  // where they left off instead of starting the whole flow over.
  async resubmit(vendorId) {
    const kyc = await this.getByVendor(vendorId);
    return applyTransition(kyc, KYC_STATUS.DRAFT, {
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      reviewComments: null,
    });
  },

  // Admin list — filterable by status, vendor populated so the admin table doesn't
  // need a second round-trip per row.
  async adminList({ status, page = 1, limit = 20 }) {
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Kyc.find(filter)
        .populate('vendor', 'firstName lastName middleName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Kyc.countDocuments(filter),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Admin detail — same vendor doc as the list, plus the address/payment/reviewer refs
  // the review screen needs that the list doesn't.
  async adminGetByVendor(vendorId) {
    const kyc = await Kyc.findOne({ vendor: vendorId })
      .populate('vendor', 'firstName lastName middleName email phoneNumber')
      .populate('info.address')
      .populate('paymentRef', 'amount status paymentMethod')
      .populate('reviewedBy', 'firstName lastName email');

    if (!kyc) {
      throw new ApiError(404, 'KYC record not found');
    }
    return kyc;
  },
};
