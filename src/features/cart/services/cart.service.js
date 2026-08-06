import { Cart } from '../models/cart.model.js';
import { Service as CatalogService, AddOn as CatalogAddOn } from '../../service-catalog/models/index.js';
import { Product } from '../../../models/product.model.js';
import { ApiError } from '../../../utils/index.js';

const addonBelongsToService = (addon, service) =>
  Boolean(addon) &&
  ((addon.service && addon.service.equals(service._id)) || (addon.serviceGroup && addon.serviceGroup.equals(service.serviceGroup)));

export const CartService = {
  async findOrCreate(userId) {
    return Cart.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, items: [] } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  },

  async _validateServiceSelection(refId, selectedAddonIds) {
    const service = await CatalogService.findById(refId);
    if (!service || !service.isActive) {
      throw new ApiError(400, 'Selected service is not available');
    }

    if (selectedAddonIds.length) {
      const addons = await CatalogAddOn.find({ _id: { $in: selectedAddonIds } });
      if (addons.length !== selectedAddonIds.length) {
        throw new ApiError(400, 'One or more selected add-ons do not exist');
      }
      for (const addon of addons) {
        if (!addon.isActive || !addonBelongsToService(addon, service)) {
          throw new ApiError(400, `Add-on "${addon.name}" is not available for the selected service`);
        }
      }
    }

    return service;
  },

  async _validateProductSelection(refId) {
    const product = await Product.findById(refId);
    if (!product || !product.isActive) {
      throw new ApiError(400, 'Selected product is not available');
    }
    return product;
  },

  async addItem(userId, { itemType, refId, quantity, selectedAddons }) {
    if (itemType === 'service') {
      await this._validateServiceSelection(refId, selectedAddons);
    } else {
      if (selectedAddons.length) throw new ApiError(400, 'Add-ons are only valid for service items');
      await this._validateProductSelection(refId);
    }

    const cart = await this.findOrCreate(userId);

    // Merge into an existing identical line (same item + same addon set) instead of
    // creating a duplicate row — standard cart UX, and keeps quantity meaningful.
    const addonsKey = [...selectedAddons].map(String).sort().join(',');
    const existing = cart.items.find(
      (item) =>
        item.itemType === itemType &&
        item.refId.equals(refId) &&
        [...item.selectedAddons].map(String).sort().join(',') === addonsKey
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ itemType, refId, quantity, selectedAddons, addedAt: new Date() });
    }

    await cart.save();
    return cart;
  },

  async updateItem(userId, itemId, { quantity, selectedAddons }) {
    const cart = await this.findOrCreate(userId);
    const item = cart.items.id(itemId);
    if (!item) throw new ApiError(404, 'Cart item not found');

    if (selectedAddons !== undefined) {
      if (item.itemType !== 'service') throw new ApiError(400, 'Add-ons are only valid for service items');
      await this._validateServiceSelection(item.refId, selectedAddons);
      item.selectedAddons = selectedAddons;
    }

    if (quantity !== undefined) {
      item.quantity = quantity;
    }

    await cart.save();
    return cart;
  },

  async removeItem(userId, itemId) {
    const cart = await this.findOrCreate(userId);
    if (!cart.items.id(itemId)) throw new ApiError(404, 'Cart item not found');
    cart.items.pull({ _id: itemId });
    await cart.save();
    return cart;
  },

  async clear(userId) {
    const cart = await this.findOrCreate(userId);
    cart.items = [];
    await cart.save();
    return cart;
  },

  // Bulk-resolves every cart item against live catalog data in one round trip per
  // collection. Shared by GET /cart (flags unavailable items, doesn't drop them) and
  // checkout (rejects the whole checkout if anything here is unavailable) — see
  // services/checkout.service.js.
  async resolveItems(items) {
    const serviceIds = items.filter((i) => i.itemType === 'service').map((i) => i.refId);
    const productIds = items.filter((i) => i.itemType === 'product').map((i) => i.refId);
    const addonIds = items.flatMap((i) => i.selectedAddons);

    const [services, products, addons] = await Promise.all([
      serviceIds.length ? CatalogService.find({ _id: { $in: serviceIds } }) : [],
      productIds.length ? Product.find({ _id: { $in: productIds } }) : [],
      addonIds.length ? CatalogAddOn.find({ _id: { $in: addonIds } }) : [],
    ]);

    const serviceMap = new Map(services.map((s) => [s._id.toString(), s]));
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const addonMap = new Map(addons.map((a) => [a._id.toString(), a]));

    return items.map((item) => {
      const source = item.itemType === 'service' ? serviceMap.get(item.refId.toString()) : productMap.get(item.refId.toString());
      const resolvedAddons = item.selectedAddons.map((id) => addonMap.get(id.toString()));

      let unavailable = !source || !source.isActive;
      if (!unavailable && item.itemType === 'service') {
        unavailable = resolvedAddons.some((addon) => !addon || !addon.isActive || !addonBelongsToService(addon, source));
      }

      return { cartItem: item, source, resolvedAddons, unavailable };
    });
  },

  async getPopulatedCart(userId) {
    const cart = await this.findOrCreate(userId);
    const resolved = cart.items.length ? await this.resolveItems(cart.items) : [];

    const items = resolved.map(({ cartItem, source, resolvedAddons, unavailable }) => ({
      _id: cartItem._id,
      itemType: cartItem.itemType,
      refId: cartItem.refId,
      quantity: cartItem.quantity,
      addedAt: cartItem.addedAt,
      unavailable,
      name: source?.name ?? null,
      price: source?.price ?? null,
      image: cartItem.itemType === 'service' ? (source?.images?.[0] ?? null) : (source?.images?.[0] ?? source?.productImages?.[0] ?? null),
      ...(cartItem.itemType === 'service'
        ? {
            durationMins: source?.durationMins ?? null,
            selectedAddons: cartItem.selectedAddons.map((addonId, i) => ({
              _id: addonId,
              name: resolvedAddons[i]?.name ?? null,
              price: resolvedAddons[i]?.price ?? null,
              unavailable: !resolvedAddons[i] || !resolvedAddons[i].isActive,
            })),
          }
        : {}),
    }));

    return { cart, items };
  },
};
