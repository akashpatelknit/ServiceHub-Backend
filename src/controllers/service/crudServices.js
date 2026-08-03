import { Vendor } from '../../core/models/index.js';
import { checkSameUser } from '../../utils/helpers/verifyUser';
import { Service } from '../../models/service.model';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { Category } from '../../models/category.model';
import quicker from '../../utils/quicker';

const addService = asyncHandler(async (req, res, next) => {
  try {
    const { vendor, latitude, longitude, address, category, title, description, pricing } = req.body;

    // Check authorization
    const check = await checkSameUser(req, vendor);
    if (req.user.role !== 'admin' && !check) {
      return next(new ApiError(401, 'You are not authorized to perform this action'));
    }

    // Validate vendor exists
    const existingVendor = await Vendor.findById(vendor);
    if (!existingVendor) {
      return next(new ApiError(404, 'Vendor not found'));
    }

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return next(new ApiError(404, 'Category not found'));
    }

    // Generate coordinates if not provided
    let coordinates = [longitude, latitude];
    if (!longitude || !latitude) {
      if (address && address.completeAddress) {
        const coordsResult = await quicker.generateCoordinatesWithAddress(address.completeAddress);
        coordinates = [coordsResult.longitude, coordsResult.latitude];
      } else {
        return next(new ApiError(400, 'Either coordinates or complete address is required'));
      }
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Create service data
    const serviceData = {
      ...req.body,
      slug,
      location: {
        type: 'Point',
        coordinates,
      },
      // Set default values
      status: req.user.role === 'admin' ? 'approved' : 'pending',
      createdBy: req.user._id,
    };

    const service = new Service(serviceData);
    await service.save();

    if (!service) {
      return next(new ApiError(400, 'Failed to add service'));
    }

    // Add service to vendor's services array
    existingVendor.services.push(service._id);
    await existingVendor.save();

    // Populate service data before sending response
    const populatedService = await Service.findById(service._id)
      .populate('category', 'name slug type')
      .populate('vendor', 'firstName lastName email phoneNumber');

    res.status(201).json(new ApiResponse(201, populatedService, 'Service added successfully'));
  } catch (error) {
    const errorMessage = new ApiError(
      400,
      error.message || 'Invalid request data. Please review request and try again'
    );
    return next(errorMessage);
  }
});
