import { sendOrderConfirmationEmail } from '../../email/emails.js';
import { Coupon } from '../../models/coupon.model.js';
import Order from '../../models/order.model.js';
import { Product } from '../../models/product.model.js';
import Transaction from '../../models/transaction.model.js';
import { User } from '../../core/models/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { verifyPaymentDetails, verifyPaymentFrontend } from '../../utils/helpers/verifyPayment.js';

import crypto from 'crypto';
import { createProductOrderRazorpay } from './utils/createRazorpayOrder.js';
import { getIO } from '../../sockets/socket.config.js';
import { createNotification } from '../notification/utils/createNotification.js';
import { addressService } from '../../features/address/services/address.service.js';
import { formatProductPricing } from '../product/utils/index.js';
import { loaderService } from '../../services/common/loader.query.service.js';

const generateOrderId = (userId) => {
  const randomStr = crypto.randomBytes(3).toString('hex');
  return `ORD_${userId.toString().substring(0, 6)}_${randomStr}`;
};

export const createProductOrder = asyncHandler(async (req, res, next) => {
  try {
    const { products, address, paymentMethod, couponCode, customAddress } = req.body;
    const userId = req.user._id;

    let coupon = null;

    if (couponCode) {
      coupon = await loaderService.loadCoupon(couponCode);
    }

    const settings = await loaderService.loadSetting();
    const user = await loaderService.loadUserByUserTypeAndUserId(req.userType, req.user._id);

    if (!userId || !products || products.length === 0) {
      return next(new ApiError(400, 'User ID and products are required'));
    }

    let addressId;

    if (!address) {
      if (customAddress) {
        const result = await addressService.createAddress(customAddress);
        if (result.success) {
          addressId = result.data._id;
        }
      } else {
        return next(new ApiError(400, 'Address is required'));
      }
    } else {
      addressId = address;
    }

    let totalAmount = 0;
    let subtotal = 0;
    let productDetails = [];
    for (const item of products) {
      const product = await Product.findById(item.product).select('price name discountPrice discountPercentage').lean();

      if (!product) {
        return next(new ApiError(404, `Product with ID ${item.product} not found`));
      }
      const pricing = formatProductPricing(product, settings, coupon);
      const price = pricing.finalPrice;

      subtotal += price * item.quantity;

      productDetails.push({
        product: item.product,
        productName: product.name,
        price,
        quantity: item.quantity,
        pricing: {
          basePrice: pricing.basePrice * item.quantity,
          discountPrice: pricing.discountPrice * item.quantity,
          couponDiscount: pricing.couponDiscount * item.quantity,
          taxAmount: pricing.taxAmount * item.quantity,
          membershipDiscount: (pricing.membershipDiscount || 0) * item.quantity,
          finalPrice: pricing.finalPrice * item.quantity,
          totalAmount: pricing.totalAmount * item.quantity,
          unit: {
            basePrice: pricing.basePrice,
            discountPrice: pricing.discountPrice,
            discountPercentage: pricing.discountPercentage,
            finalPrice: pricing.finalPrice,
            totalAmount: pricing.totalAmount,
          },
        },
      });
    }

    const taxAmount = (settings.productTaxRate / 100) * subtotal;
    const platformFee = settings.productPlatformFee || 0;

    totalAmount = subtotal + taxAmount + platformFee;

    let discount = 0;

    const orderId = generateOrderId(userId);
    const userType = req.userType;

    const order = new Order({
      orderId,
      userId,
      userType: userType,
      products: productDetails,
      address: addressId,
      totalAmount,
      orderStatus: 'pending',
      payment: {
        paymentMethod,
        paymentStatus: 'pending',
      },
    });

    // Create transaction using your existing schema
    const transaction = new Transaction({
      amount: totalAmount,
      currency: 'INR',
      transactionType: 'debit', // Customer paying (money going out)
      status: 'pending',
      paymentMethod: paymentMethod,
      transactionFor: 'product_order',

      paymentDetails: {
        paymentStatus: 'pending',
        paymentDate: new Date(),
      },

      relatedEntity: {
        entityType: 'Order',
        entityId: order._id,
      },

      user: {
        userType: userType,
        userId: userId,
      },

      metadata: {
        description: `Payment for order ${orderId}`,
        notes: `Order containing ${products.length} item(s)`,
        channel: 'web',
      },

      financial: {
        grossAmount: totalAmount + discount, // Original amount before discount
        netAmount: totalAmount, // Final amount after discount
        fees: {
          discount: discount,
          gatewayFee: 0,
          processingFee: 0,
          platformFee: 0,
          tax: 0,
        },
      },

      references: {
        referenceId: `TXN_${orderId}_${Date.now()}`,
        invoiceNumber: `INV_${orderId}`,
      },

      audit: {
        createdBy: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        source: 'web_app',
      },

      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          reason: 'Order created, awaiting payment',
        },
      ],
    });

    let razorpayOrder = null;

    const customer = {
      name: user.firstName + ' ' + user.lastName,
      email: user.email,
      contact: user.phoneNumber,
    };

    // Handle Razorpay payment
    if (paymentMethod?.toLowerCase() === 'razorpay') {
      try {
        const { razorpayOrder: response, paymentLink } = await createProductOrderRazorpay({
          totalAmount,
          orderId,
          orderMongoId: order._id.toString(),
          userId,
          userType,
          transactionId: transaction._id.toString(),
          customer,
        });

        razorpayOrder = response;

        console.log('Payment link created:', paymentLink);

        // Update transaction with Razorpay details
        transaction.paymentDetails.gateway = {
          name: 'razorpay',
          orderId: razorpayOrder.id,
        };

        order.payment.razorpayOrderId = razorpayOrder.id;
      } catch (razorpayError) {
        return next(new ApiError(500, `Razorpay order creation failed: ${razorpayError.message}`));
      }
    }

    // Save order and transaction
    await Promise.all([order.save(), transaction.save()]);

    await createNotification({
      title: 'New Order Received',
      description: `${req.user.firstName} placed an order for ${productDetails
        .map((p) => `${p.name} x ${p.quantity}`)
        .join(', ')}`,
      userType: req.userType,
      userId: req.user._id,
      category: 'product_order',
    });

    getIO()
      .to('admins')
      .emit('newProductOrder', {
        productDetails,
        order,
        productName: productDetails.map((p) => `${p.name} x ${p.quantity}`).join(', '),
        customerName: req.user.name,
        userType: req.userType,
      });

    const responseData =
      paymentMethod === 'cash'
        ? { order, transactionId: transaction._id }
        : { razorpayOrder, order, transactionId: transaction._id };

    res.status(201).json(new ApiResponse(201, responseData, 'Order created successfully'));
  } catch (error) {
    next(new ApiError(500, error.message || 'Something went wrong'));
  }
});

export const verifyProductPayment = asyncHandler(async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // Step 1: Verify Razorpay signature
    if (!verifyPaymentFrontend(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return next(new ApiError(400, 'Payment verification failed'));
    }

    // Step 2: Fetch order details
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ApiError(404, 'Order not found'));
    }

    // Step 3: Find the related transaction
    const transaction = await Transaction.findOne({
      'relatedEntity.entityId': orderId,
      'relatedEntity.entityType': 'Order',
      status: 'pending',
    });

    if (!transaction) {
      return next(new ApiError(404, 'Transaction not found or already processed'));
    }

    // Step 4: Verify payment status with Razorpay
    const { status, paymentDetails } = await verifyPaymentDetails(razorpay_payment_id);
    if (!status) {
      return next(new ApiError(400, 'Payment verification failed with gateway'));
    }

    // Step 5: Update transaction with payment details
    transaction.status = 'success';
    transaction.paymentDetails.paymentStatus = 'paid';
    transaction.paymentDetails.transactionId = razorpay_payment_id;
    transaction.paymentDetails.paymentDate = new Date();
    transaction.paymentDetails.gateway.transactionId = razorpay_payment_id;
    transaction.paymentDetails.gateway.paymentId = razorpay_payment_id;

    // Add gateway fees if available
    if (paymentDetails.fee) {
      transaction.financial.fees.gatewayFee = paymentDetails.fee / 100; // Convert from paise
    }

    // Update status history
    transaction.statusHistory.push({
      status: 'success',
      timestamp: new Date(),
      reason: 'Payment verified successfully',
      updatedBy: order.userId,
    });

    // Update audit trail
    transaction.audit.updatedBy = order.userId;

    // Step 6: Update order payment status
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        'payment.paymentStatus': 'paid',
        'payment.paymentMethod': paymentDetails.method,
        'payment.transactionId': razorpay_payment_id,
        'payment.paymentDate': new Date(),
        orderStatus: 'confirmed',
      },
      { new: true }
    );

    // Save the updated transaction
    await transaction.save();

    // Step 7: Send order confirmation email
    try {
      const user = await User.findById(updatedOrder.userId);
      if (user && user.email) {
        await sendOrderConfirmationEmail(
          user.email,
          user.firstName,
          updatedOrder.orderId,
          updatedOrder.products,
          updatedOrder.totalAmount
        );
      }
    } catch (emailError) {
      // Log email error but don't fail the payment verification
      console.error('Failed to send confirmation email:', emailError);
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          order: updatedOrder,
          transaction: {
            id: transaction._id,
            status: transaction.status,
            amount: transaction.amount,
            transactionId: transaction.paymentDetails.transactionId,
            paymentDate: transaction.paymentDetails.paymentDate,
          },
        },
        'Payment verified successfully'
      )
    );
  } catch (error) {
    // If there's an error after payment verification, we should still update the transaction status
    if (error.statusCode !== 400) {
      try {
        const transaction = await Transaction.findOne({
          'relatedEntity.entityId': req.body.orderId,
          'relatedEntity.entityType': 'Order',
        });

        if (transaction) {
          transaction.status = 'failed';
          transaction.statusHistory.push({
            status: 'failed',
            timestamp: new Date(),
            reason: error.message || 'Payment verification error',
          });
          await transaction.save();
        }
      } catch (updateError) {
        console.error('Failed to update transaction status on error:', updateError);
      }
    }

    return next(new ApiError(500, error.message || 'Something went wrong'));
  }
});

// Helper function to handle failed payments
export const handleFailedPayment = asyncHandler(async (req, res, next) => {
  try {
    const { orderId, reason } = req.body;

    const transaction = await Transaction.findOne({
      'relatedEntity.entityId': orderId,
      'relatedEntity.entityType': 'Order',
    });

    if (transaction) {
      transaction.status = 'failed';
      transaction.paymentDetails.paymentStatus = 'failed';
      transaction.statusHistory.push({
        status: 'failed',
        timestamp: new Date(),
        reason: reason || 'Payment failed',
      });

      await transaction.save();
    }

    // Update order status
    await Order.findByIdAndUpdate(orderId, {
      'payment.paymentStatus': 'failed',
      orderStatus: 'cancelled',
    });

    res.status(200).json(new ApiResponse(200, {}, 'Payment failure handled'));
  } catch (error) {
    return next(new ApiError(500, error.message || 'Failed to handle payment failure'));
  }
});

//  Get user orders
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId);

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    console.log(orders);

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

//  Update order status (Admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOneAndUpdate({ orderId }, { orderStatus: status }, { new: true });

    res.json({ success: true, message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

//  Cancel an order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOneAndUpdate(
      { orderId },
      { orderStatus: 'cancelled', 'timestamps.cancelledAt': new Date() },
      { new: true }
    );

    res.json({ success: true, message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const checkPriceAfterCoupon = asyncHandler(async (req, res, next) => {
  try {
    const { products, couponCode } = req.body;

    if (!products || products.length === 0) {
      return next(new ApiError(400, 'Products are required'));
    }

    // Fetch correct product prices from the database
    let totalAmount = 0;
    const productDetails = await Promise.all(
      products.map(async (item) => {
        const product = await Product.findById(item.product).select('price name');
        if (!product) {
          throw new ApiError(404, `Product with ID ${item.product} not found`);
        }
        const price = product.price;
        totalAmount += price * item.quantity;
        return {
          product: item.product,
          productName: product.name,
          price,
          quantity: item.quantity,
        };
      })
    );

    let discount = 0;
    let discountApplied = false;

    // Check if a valid coupon is applied
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });

      if (!coupon) {
        return next(new ApiError(400, 'Invalid or expired coupon code'));
      }

      if (totalAmount < coupon.minOrderValue) {
        return next(new ApiError(400, `Coupon requires minimum order value of ₹${coupon.minOrderValue}`));
      }

      discount =
        coupon.discountType === 'percentage' ? (totalAmount * coupon.discountValue) / 100 : coupon.discountValue;

      discount = Math.min(discount, coupon.maxDiscount); // Apply max discount cap
      totalAmount -= discount;
      discountApplied = true;
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          originalAmount: totalAmount + discount,
          discountApplied,
          discountAmount: discount,
          finalAmount: totalAmount,
          products: productDetails,
        },
        'Price calculated successfully'
      )
    );
  } catch (error) {
    return next(new ApiError(500, error.message || 'Something went wrong'));
  }
});
