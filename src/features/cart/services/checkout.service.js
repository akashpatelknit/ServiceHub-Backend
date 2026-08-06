import mongoose from 'mongoose';
import { CartService } from './cart.service.js';
import { Address } from '../../address/models/address.model.js';
import { PaymentService } from '../../payment/index.js';
import { ServiceOrderService } from '../../service-booking/index.js';
import { ProductOrderService } from '../../product-order/index.js';
import { ApiError } from '../../../utils/index.js';

export const CheckoutService = {
  async checkout(userId, { addressId, scheduledDate, scheduledSlot, paymentMethod }) {
    // 1. Reload cart fresh from DB — never trust client-sent cart state.
    const cart = await CartService.findOrCreate(userId);
    if (!cart.items.length) {
      throw new ApiError(400, 'Cart is empty');
    }

    // 2. Re-validate every item is still active/available — reject with a clear list
    // of what became unavailable rather than silently dropping items. ApiError's 3rd
    // arg must be an array — globalErrorHandler does Array.isArray(errors) and
    // silently drops anything else (see handleValidationError for the same shape).
    const resolved = await CartService.resolveItems(cart.items);
    const unavailable = resolved.filter((r) => r.unavailable);
    if (unavailable.length) {
      throw new ApiError(
        409,
        'Some items in your cart are no longer available',
        unavailable.map((r) => ({
          field: `cartItem.${r.cartItem._id}`,
          message: `${r.cartItem.itemType} item is no longer available`,
        }))
      );
    }

    // 3. Verify the address belongs to the requesting user.
    const address = await Address.findOne({ _id: addressId, owner: userId, ownerType: 'User' });
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    // 4. Group by itemType.
    const serviceItems = resolved.filter((r) => r.cartItem.itemType === 'service');
    const productItems = resolved.filter((r) => r.cartItem.itemType === 'product');

    // Schedule fields can only be validated as required once we know the cart
    // actually contains service items — see validators/checkout.validation.js for why
    // this can't be enforced at the Zod layer.
    if (serviceItems.length && (!scheduledDate || !scheduledSlot)) {
      throw new ApiError(400, 'scheduledDate and scheduledSlot are required when the cart contains service items');
    }

    const addressSnapshot = {
      fullAddress: address.completeAddress,
      city: address.city,
      state: address.state,
      pincode: address.pinCode,
      geolocation: address.geolocation,
      label: address.label,
    };

    const serviceOrderItems = serviceItems.map(({ source, resolvedAddons }) => ({
      serviceId: source._id,
      serviceNameSnapshot: source.name,
      priceSnapshot: source.price,
      durationSnapshot: source.durationMins,
      addonsSnapshot: resolvedAddons.map((addon) => ({ name: addon.name, price: addon.price })),
    }));

    const productOrderItems = productItems.map(({ cartItem, source }) => ({
      productId: source._id,
      productNameSnapshot: source.name,
      priceSnapshot: source.price,
      quantity: cartItem.quantity,
    }));

    const serviceTotal = serviceItems.reduce((sum, { cartItem, source, resolvedAddons }) => {
      const addonsTotal = resolvedAddons.reduce((s, a) => s + a.price, 0);
      return sum + (source.price + addonsTotal) * cartItem.quantity;
    }, 0);

    const productTotal = productItems.reduce((sum, { cartItem, source }) => sum + source.price * cartItem.quantity, 0);

    // 6. Create the Razorpay order OUTSIDE the Mongo transaction — external HTTP
    // calls shouldn't run inside session.withTransaction(). If this fails, nothing
    // has touched Mongo yet, so there's nothing to roll back.
    const { payment, gatewayOrderId, keyId, amount, currency } = await PaymentService.createIntent({
      purposeType: 'CustomerOrder',
      amount: serviceTotal + productTotal,
      // Razorpay caps receipt at 40 chars — full ObjectId + timestamp doesn't fit,
      // so this trims to the last 8 hex chars of the user id plus a base36 timestamp.
      receipt: `ck_${userId.toString().slice(-8)}_${Date.now().toString(36)}`,
      notes: { userId: userId.toString(), paymentMethod },
    });

    // 7. Everything below is atomic — order(s) + cart clear. Any failure rolls the
    // whole thing back; the cart stays intact and nothing is partially created. The
    // only possible leftover is the orphaned Razorpay order from step 6, which is
    // harmless (never gets paid, costs nothing).
    const session = await mongoose.startSession();
    let serviceOrder = null;
    let productOrder = null;

    try {
      await session.withTransaction(async () => {
        if (serviceOrderItems.length) {
          serviceOrder = await ServiceOrderService.createFromCheckout(
            {
              user: userId,
              items: serviceOrderItems,
              scheduledDate,
              scheduledSlot,
              addressSnapshot,
              totalAmount: serviceTotal,
              paymentId: payment._id,
            },
            session
          );
        }

        if (productOrderItems.length) {
          productOrder = await ProductOrderService.createFromCheckout(
            {
              user: userId,
              items: productOrderItems,
              addressSnapshot,
              totalAmount: productTotal,
              paymentId: payment._id,
            },
            session
          );
        }

        cart.items = [];
        await cart.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return {
      serviceOrder: serviceOrder ? { orderNumber: serviceOrder.orderNumber, totalAmount: serviceOrder.totalAmount } : undefined,
      productOrder: productOrder ? { orderNumber: productOrder.orderNumber, totalAmount: productOrder.totalAmount } : undefined,
      payment: { gatewayOrderId, keyId, amount, currency },
    };
  },
};
