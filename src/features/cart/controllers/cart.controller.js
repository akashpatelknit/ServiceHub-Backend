import { StatusCodes } from 'http-status-codes';
import { ApiResponse, asyncHandler } from '../../../utils/index.js';
import { CartService } from '../services/cart.service.js';

export const CartController = {
  addItem: asyncHandler(async (req, res) => {
    const cart = await CartService.addItem(req.user._id, req.body);
    return res.status(StatusCodes.CREATED).json(new ApiResponse(StatusCodes.CREATED, cart, 'Item added to cart'));
  }),

  updateItem: asyncHandler(async (req, res) => {
    const cart = await CartService.updateItem(req.user._id, req.params.itemId, req.body);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, cart, 'Cart item updated'));
  }),

  removeItem: asyncHandler(async (req, res) => {
    const cart = await CartService.removeItem(req.user._id, req.params.itemId);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, cart, 'Cart item removed'));
  }),

  getCart: asyncHandler(async (req, res) => {
    const result = await CartService.getPopulatedCart(req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, result, 'Cart retrieved'));
  }),

  clearCart: asyncHandler(async (req, res) => {
    const cart = await CartService.clear(req.user._id);
    return res.status(StatusCodes.OK).json(new ApiResponse(StatusCodes.OK, cart, 'Cart cleared'));
  }),
};
