import mongoose from 'mongoose';

import { Category } from '../../models/category.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Vendor } from '../../core/models/index.js';
import { ServiceTemplate } from '../../models/serviceTemplateSchema.js';
import { VendorService } from '../../models/vendorServiceSchema.js';
import { vendorSelect, vendorSelectSmall } from '../../config/populate/vendorPopulate.js';
import { bookingPriceService } from '../../services/booking/booking.price.service.js';
import { loaderService } from '../../services/common/loader.query.service.js';

const createServiceTemplate = asyncHandler(async (req, res, next) => {
  try {
    const { title, category } = req.body;

    const categoryExists = await Category.findById(category);

    if (!categoryExists) {
      return next(new ApiError(404, 'Category not found'));
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const serviceTemplate = new ServiceTemplate({
      ...req.body,
      slug,
      createdBy: req.user._id,
    });

    await serviceTemplate.save();

    const populatedTemplate = await ServiceTemplate.findById(serviceTemplate._id).populate(
      'category subCategory childCategory',
      'name slug type'
    );

    res.status(201).json(new ApiResponse(201, populatedTemplate, 'Service template created successfully'));
  } catch (error) {
    return next(new ApiError(400, error.message || 'Failed to create service template'));
  }
});

const updateServiceTemplate = asyncHandler(async (req, res, next) => {
  try {
    if (!req.user.role === 'admin') {
      return next(new ApiError(403, 'Only admin can update service templates'));
    }

    const { id } = req.params;
    const { title } = req.body;

    let updateData = { ...req.body, updatedBy: req.user._id };

    if (title) {
      updateData.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    const updatedTemplate = await ServiceTemplate.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('category subCategory childCategory', 'name slug type');

    if (!updatedTemplate) {
      return next(new ApiError(404, 'Service template not found'));
    }

    res.status(200).json(new ApiResponse(200, updatedTemplate, 'Service template updated successfully'));
  } catch (error) {
    return next(new ApiError(400, error.message || 'Failed to update service template'));
  }
});

const deleteServiceTemplate = asyncHandler(async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(new ApiError(403, 'Only admin can delete service templates'));
    }

    const { id } = req.params;

    // Check if any vendors are offering this service
    const vendorServicesCount = await VendorService.countDocuments({
      serviceTemplate: id,
      isDeleted: false,
    });

    if (vendorServicesCount > 0) {
      return next(new ApiError(400, 'Cannot delete service template. Vendors are offering this service.'));
    }

    const deletedTemplate = await ServiceTemplate.findByIdAndUpdate(
      id,
      { isDeleted: true, updatedBy: req.user._id },
      { new: true }
    );

    if (!deletedTemplate) {
      return next(new ApiError(404, 'Service template not found'));
    }

    res.status(200).json(new ApiResponse(200, null, 'Service template deleted successfully'));
  } catch (error) {
    return next(new ApiError(500, error.message || 'Failed to delete service template'));
  }
});

const getServiceTemplates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      category,
      subCategory,
      childCategory,
      search,
      tags,
      priceType,
      minPrice,
      maxPrice,
      isActive,
      isFeatured,
      hasVendors,
      minDuration,
      maxDuration,
      supportedBrand,
      features,
    } = req.query;

    const filter = {};

    // Only show active templates by default
    if (isActive) {
      filter.isActive = isActive;
    }

    if (isFeatured) {
      filter.isFeatured = isFeatured;
    }

    // Exclude deleted templates unless specifically requested
    // if (includeDeleted !== 'true') {
    //   filter.isDeleted = false;
    // }

    // Category filters
    if (category && category.toLowerCase() !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = new mongoose.Types.ObjectId(category);
    }

    if (subCategory && subCategory.toLowerCase() !== 'all' && mongoose.Types.ObjectId.isValid(subCategory)) {
      filter.subCategory = new mongoose.Types.ObjectId(subCategory);
    }

    if (childCategory && childCategory.toLowerCase() !== 'all' && mongoose.Types.ObjectId.isValid(childCategory)) {
      filter.childCategory = new mongoose.Types.ObjectId(childCategory);
    }

    // Pricing filters
    if (priceType && priceType.toLowerCase() !== 'all') {
      filter['pricingGuidelines.priceType'] = priceType;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter['pricingGuidelines.basePrice'] = {};
      if (minPrice !== undefined && !isNaN(minPrice) && minPrice !== '') {
        filter['pricingGuidelines.basePrice'].$gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(maxPrice) && maxPrice !== '') {
        filter['pricingGuidelines.basePrice'].$lte = parseFloat(maxPrice);
      }
    }

    // Duration filters
    if (minDuration !== undefined || maxDuration !== undefined) {
      const durationFilter = {};
      if (minDuration !== undefined && !isNaN(minDuration) && minDuration !== '') {
        durationFilter.$gte = parseInt(minDuration);
      }
      if (maxDuration !== undefined && !isNaN(maxDuration) && maxDuration !== '') {
        durationFilter.$lte = parseInt(maxDuration);
      }
      if (Object.keys(durationFilter).length > 0) {
        filter['estimatedDuration.min'] = durationFilter;
      }
    }

    // Vendors filter
    if (hasVendors === 'true') {
      filter.vendors = { $exists: true, $ne: [] };
    } else if (hasVendors === 'false') {
      filter.$or = [{ vendors: { $exists: false } }, { vendors: { $size: 0 } }];
    }

    // Tags filter
    if (tags && tags.trim() !== '') {
      const tagArray = tags.split(',').map((tag) => tag.trim().toLowerCase());
      filter.tags = { $in: tagArray };
    }

    // Supported brand filter
    if (supportedBrand && supportedBrand.trim() !== '') {
      filter['supportedBrands.name'] = { $regex: supportedBrand, $options: 'i' };
    }

    // Features filter
    if (features && features.trim() !== '') {
      const featureArray = features.split(',').map((feature) => feature.trim());
      filter['features.name'] = { $in: featureArray.map((f) => new RegExp(f, 'i')) };
    }

    // Search functionality
    if (search && search.trim() !== '') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { 'features.name': { $regex: search, $options: 'i' } },
        { defaultIncluded: { $regex: search, $options: 'i' } },
      ];
    }

    // Count total documents for pagination
    const totalTemplates = await ServiceTemplate.countDocuments(filter);

    // Sort configuration
    const sortObject = {};
    sortObject[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination calculation
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Fetch service templates with populated references
    const serviceTemplates = await ServiceTemplate.find(filter)
      .populate('category', 'name description slug')
      .populate('subCategory', 'name description slug')
      .populate('childCategory', 'name description slug')
      .populate('vendors', 'businessName rating isActive')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('images')
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum)
      .lean()
      .exec();

    // Enhance service templates with computed fields
    const enhancedTemplates = serviceTemplates.map((template) => {
      const activeVendors = template.vendors ? template.vendors.filter((v) => v.isActive).length : 0;
      const totalVendors = template.vendors ? template.vendors.length : 0;
      const avgVendorRating =
        template.vendors && template.vendors.length > 0
          ? template.vendors.reduce((sum, v) => sum + (v.rating || 0), 0) / template.vendors.length
          : 0;

      // Format duration
      const formatDuration = (min, max, unit) => {
        if (!min && !max) return null;
        const unitLabel = unit === 'minutes' ? 'min' : unit === 'hours' ? 'hr' : 'day';
        if (min && max && min !== max) {
          return `${min}-${max} ${unitLabel}`;
        }
        return `${min || max} ${unitLabel}`;
      };

      // Primary image
      const primaryImage = template.images?.find((img) => img.isPrimary) || template.images?.[0];

      return {
        ...template,
        // Computed fields
        vendorStats: {
          total: totalVendors,
          active: activeVendors,
          averageRating: Math.round(avgVendorRating * 10) / 10,
        },

        // Formatted fields
        formattedPrice: new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: template.pricingGuidelines?.currency || 'INR',
        }).format(template.pricingGuidelines?.basePrice || 0),

        formattedDuration: formatDuration(
          template.estimatedDuration?.min,
          template.estimatedDuration?.max,
          template.estimatedDuration?.unit
        ),

        // Image handling
        image: primaryImage ? primaryImage?.url : null,

        imageCount: template.images?.length || 0,
        images: template.images?.map((img) => img.url),

        // Feature count
        featureCount: template.features?.length || 0,

        // FAQ count
        faqCount: template.commonFaqs?.length || 0,

        // Category path
        categoryPath: [template.category?.name, template.subCategory?.name, template.childCategory?.name]
          .filter(Boolean)
          .join(' > '),

        // Availability status
        availabilityStatus: {
          hasVendors: activeVendors > 0,
          isBookable: template.isActive && activeVendors > 0,
          status: template.isActive ? (activeVendors > 0 ? 'available' : 'no_vendors') : 'inactive',
        },

        // SEO data
        seoTitle: template.seo?.metaTitle || template.title,
        seoDescription: template.seo?.metaDescription || template.shortDescription,

        // Remove sensitive/verbose data for list view
        vendors: undefined, // Remove full vendor data, keep only stats
        commonFaqs: undefined, // Remove FAQs from list view
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalTemplates / limitNum);
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Get basic statistics
    const statisticsPromises = [
      ServiceTemplate.countDocuments({ isActive: true, isDeleted: false }),
      ServiceTemplate.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      ServiceTemplate.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$pricingGuidelines.priceType', count: { $sum: 1 } } },
      ]),
      ServiceTemplate.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$pricingGuidelines.basePrice' },
            minPrice: { $min: '$pricingGuidelines.basePrice' },
            maxPrice: { $max: '$pricingGuidelines.basePrice' },
          },
        },
      ]),
    ];

    const [activeTemplates, categoryStats, priceTypeStats, priceStats] = await Promise.all(statisticsPromises);

    const response = {
      success: true,
      data: {
        serviceTemplates: enhancedTemplates,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total: totalTemplates,
          limit: limitNum,
          hasNextPage,
          hasPrevPage,
          skip,
          showing: `${skip + 1}-${Math.min(skip + limitNum, totalTemplates)} of ${totalTemplates}`,
        },
        statistics: {
          total: totalTemplates,
          active: activeTemplates,
          byCategory: categoryStats,
          byPriceType: priceTypeStats,
          pricing: priceStats[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0 },
        },
      },
      message: `Retrieved ${enhancedTemplates.length} service template(s) successfully`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching service templates:', error);

    const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Internal server error';

    res.status(500).json({
      success: false,
      message: 'Failed to fetch service templates',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
};

const getServiceTemplateById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await ServiceTemplate.findById(id)
      .populate('category subCategory childCategory vendors', 'name slug type description')
      .lean();

    const settings = await loaderService.loadSetting();

    const vendors = await Vendor.find({
      'services.childCategory': template.subCategory,
    })
      .select(vendorSelectSmall)
      .select(vendorSelect);

    if (!template || template.isDeleted) {
      return next(new ApiError(404, 'Service template not found'));
    }

    if (!template.vendors) template.vendors = [];

    const primaryImage = template.images?.find((img) => img.isPrimary) || template.images?.[0];
    const images = template.images.map((img) => img.url);

    let membership = null;

    if (req.userType === 'User') {
      membership = await loaderService.loadMembership(req.user._id, req.userType);
    }

    console.log(membership);

    const pricing = await bookingPriceService.calculateBookingPricing({
      service: template,
      appliedCoupon: null,
      user: req.user,
      settings,
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { ...template, image: primaryImage?.url, vendors, images, pricing },
          'Service template fetched successfully'
        )
      );
  } catch (error) {
    console.error('Error fetching service requests:', error);
    return next(new ApiError(500, error.message || 'Failed to fetch service template'));
  }
});

const getServiceTemplatesByCategory = asyncHandler(async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.isValidObjectId(categoryId)) {
      throw new ApiError(400, 'Invalid category ID');
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Get all descendant categories
    const descendants = await category.getDescendants();
    const categoryIds = [categoryId, ...descendants.map((d) => d._id.toString())];

    const filter = {
      $or: [
        { category: { $in: categoryIds } },
        { subCategory: { $in: categoryIds } },
        { childCategory: { $in: categoryIds } },
      ],
      isActive: true,
      isDeleted: false,
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [templates, totalCount] = await Promise.all([
      ServiceTemplate.find(filter)
        .populate('category subCategory childCategory', 'name slug type')
        .select('title slug description pricingGuidelines estimatedDuration features defaultIncluded')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ServiceTemplate.countDocuments(filter),
    ]);

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      totalCount,
      hasNext: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
      hasPrev: parseInt(page) > 1,
    };

    res.status(200).json(
      new ApiResponse(
        200,
        {
          services: templates,
          pagination,
          category: {
            _id: category._id,
            name: category.name,
            slug: category.slug,
          },
        },
        'Service templates fetched successfully'
      )
    );
  } catch (error) {
    return next(new ApiError(500, error.message || 'Failed to fetch service templates'));
  }
});

const requestServiceByVendor = asyncHandler(async (req, res, next) => {
  try {
    const { vendorId, services } = req.body;

    if (!vendorId || !Array.isArray(services) || services.length === 0) {
      return next(new ApiError(400, 'VendorId and services are required'));
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return next(new ApiError(404, 'Vendor not found'));
    }

    if (!vendor.isKYCVerified) {
      return next(new ApiError(403, 'Vendor KYC is not verified'));
    }

    const createdServices = [];
    const skippedServices = [];

    for (const service of services) {
      const { category, childCategory } = service;

      // Validate category
      const childCategoryExisted = await Category.findById(childCategory);
      if (!childCategoryExisted) {
        skippedServices.push({
          category,
          childCategory,
          reason: 'Category not found',
        });
        continue;
      }

      // Check vendor already has this service
      const isServiceExist = vendor.services?.some(
        (s) => s.category?.toString() === category && s.childCategory?.toString() === childCategory
      );

      if (isServiceExist) {
        skippedServices.push({
          category,
          childCategory,
          reason: 'Service already exists in vendor profile',
        });
        continue;
      }

      // Check already requested
      const existingService = await VendorService.findOne({
        vendor: vendorId,
        category,
        childCategory,
        isDeleted: false,
      });

      if (existingService) {
        skippedServices.push({
          category,
          childCategory,
          reason:
            existingService.status === 'approved' ? 'Service already approved' : 'Already requested, pending approval',
        });
        continue;
      }

      // Create service request
      const vendorService = new VendorService({
        title: childCategoryExisted.name,
        category,
        childCategory,
        vendor: vendorId,
        status: 'pending',
        createdBy: req.user._id,
      });

      await vendorService.save();
      createdServices.push(vendorService._id);
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          createdServices,
          skippedServices,
        },
        'Service request processed'
      )
    );
  } catch (error) {
    return next(new ApiError(500, error.message || 'Something went wrong'));
  }
});

const requestSingleServiceByVendor = asyncHandler(async (req, res, next) => {
  try {
    const { vendorId, categorry, childCategory } = req.body;

    // 1. Validate input
    if (!vendorId || !categorry || !childCategory) {
      return next(new ApiError(400, 'vendorId, category and childCategory are required'));
    }

    // 2. Validate vendor
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return next(new ApiError(404, 'Vendor not found'));
    }

    if (!vendor.isKYCVerified) {
      return next(new ApiError(403, 'Vendor KYC is not verified'));
    }

    // 3. Validate category
    const childCategoryExisted = await Category.findById(childCategory);
    if (!childCategoryExisted) {
      return next(new ApiError(404, 'Category not found'));
    }

    // 4. Check if vendor already has this service
    const isServiceExist = vendor.services?.some(
      (s) => s.category?.toString() === categorry && s.childCategory?.toString() === childCategory
    );

    if (isServiceExist) {
      return next(new ApiError(409, 'Service already exists in vendor profile'));
    }

    // 5. Check if already requested
    const existingService = await VendorService.findOne({
      vendor: vendorId,
      category: categorry,
      childCategory,
      isDeleted: false,
    });

    if (existingService) {
      return next(
        new ApiError(
          409,
          existingService.status === 'approved'
            ? 'Service already approved'
            : 'Service already requested and pending approval'
        )
      );
    }

    // 6. Create service request
    const vendorService = await VendorService.create({
      title: childCategoryExisted.name,
      category: categorry,
      childCategory,
      vendor: vendorId,
      status: 'pending',
      createdBy: req.user._id,
    });

    return res.status(201).json(new ApiResponse(201, vendorService, 'Service request submitted successfully'));
  } catch (error) {
    return next(new ApiError(500, error.message || 'Something went wrong'));
  }
});

const updateServiceRequest = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, adminNotes, vendorId, isActive, isBlocked, isDeleted, isFeatured } = req.body;

    // Validation for status updates
    if (status) {
      const allowedStatuses = ['pending', 'approved', 'rejected'];

      if (!allowedStatuses.includes(status)) {
        return next(new ApiError(400, 'Invalid status value'));
      }

      if (status === 'rejected' && !rejectionReason) {
        return next(new ApiError(400, 'Rejection Reason is required'));
      }
    }

    // Find service request and vendor
    const serviceRequest = await VendorService.findById(id);
    const vendor = await Vendor.findById(vendorId);

    if (!serviceRequest || serviceRequest.isDeleted) {
      return next(new ApiError(404, 'Service request not found'));
    }

    // Update basic fields
    serviceRequest.updatedBy = req.user._id;

    // Handle status updates (approval/rejection flow)
    if (status) {
      serviceRequest.status = status;

      if (status === 'approved') {
        serviceRequest.approval = {
          approvedBy: req.user._id,
          approvedAt: new Date(),
          isApproved: true,
          adminNotes: adminNotes || '',
          rejectionReason: '',
        };
      } else if (status === 'rejected') {
        serviceRequest.approval = {
          approvedBy: req.user._id,
          approvedAt: new Date(),
          isApproved: false,
          rejectionReason: rejectionReason || 'No reason provided',
          adminNotes: adminNotes || '',
        };
      } else if (status === 'pending') {
        serviceRequest.approval = {
          approvedBy: null,
          approvedAt: null,
          isApproved: false,
          rejectionReason: '',
          adminNotes: '',
        };
      }
    }

    // Handle service state updates (active/blocked/deleted)
    if (isActive !== undefined) {
      serviceRequest.isActive = isActive;
    }
    if (isBlocked !== undefined) {
      serviceRequest.isBlocked = isBlocked;
    }
    if (isDeleted !== undefined) {
      serviceRequest.isDeleted = isDeleted;
    }

    if (isFeatured !== undefined) {
      serviceRequest.isFeatured = isFeatured;
    }

    // Update vendor services
    if (vendor) {
      if (vendor.services === undefined) {
        vendor.services = [];
      }

      // Check if service already exists in vendor's services
      const existingServiceIndex = vendor.services.findIndex(
        (s) => s.service && s.service.toString() === serviceRequest._id.toString()
      );

      console.log('Existing service index:', existingServiceIndex);

      if (existingServiceIndex > -1) {
        // Update existing service
        const existingService = vendor.services[existingServiceIndex];
        existingService.isActive = serviceRequest.isActive;
        existingService.isBlocked = serviceRequest.isBlocked;
        existingService.isDeleted = serviceRequest.isDeleted;
      } else {
        // Add new service (typically when approving)
        vendor.services.push({
          service: serviceRequest._id,
          category: serviceRequest.category,
          childCategory: serviceRequest.childCategory,
          isActive: serviceRequest.isActive,
          isBlocked: serviceRequest.isBlocked,
          isDeleted: serviceRequest.isDeleted,
        });
      }

      await vendor.save();
    }

    await serviceRequest.save();

    // Determine response message
    let message = 'Service request updated successfully';
    if (status) {
      message = `Service request status updated to "${status}" successfully`;
    }

    res.status(200).json(new ApiResponse(200, serviceRequest, message));
  } catch (error) {
    return next(new ApiError(500, error.message || 'Failed to update service request'));
  }
});

const getRequestServiceByVendor = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const requestingUser = req.user;

    // If no vendorId provided, use requesting user's ID
    const targetVendorId = id || requestingUser._id;

    console.log(targetVendorId);

    if (!mongoose.isValidObjectId(targetVendorId)) {
      return next(new ApiError(400, 'Invalid vendor ID'));
    }

    // Authorization check
    const isAdmin = requestingUser.role === 'admin';
    const isVendor = requestingUser.role === 'vendor' && requestingUser._id.toString() === targetVendorId.toString();

    if (!isAdmin && !isVendor) {
      return next(new ApiError(403, 'Access denied. Vendors can only view their own orders.'));
    }

    const serviceRequests = await VendorService.find({
      vendor: targetVendorId,
      isDeleted: false,
    })
      .populate('vendor', 'firstName lastName email phoneNumber rating isVerified profileImage')
      .populate('category', 'name')
      .populate('childCategory', 'name')
      .lean();

    if (!serviceRequests || serviceRequests.length === 0) {
      return next(new ApiError(404, 'No approved service requests found for this vendor'));
    }

    res.status(200).json(new ApiResponse(200, serviceRequests, 'Service requests fetched successfully'));
  } catch (error) {
    return next(new ApiError(500, error.message || 'Failed to fetch service requests'));
  }
});

const getAllServiceRequests = asyncHandler(async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { isDeleted: false };

    if (status && typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [requests, totalCount] = await Promise.all([
      VendorService.find(filter)
        .populate('vendor', 'firstName lastName email phoneNumber rating isVerified profileImage')
        .populate({
          path: 'serviceTemplate',
          select: 'title slug description pricingGuidelines estimatedDuration features defaultIncluded',
          populate: {
            path: 'category subCategory childCategory',
            select: 'name slug type',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      VendorService.countDocuments(filter),
    ]);

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: parseInt(page) < Math.ceil(totalCount / limit),
      hasPrev: parseInt(page) > 1,
    };

    res.status(200).json(new ApiResponse(200, { requests, pagination }, 'Service requests fetched successfully'));
  } catch (error) {
    console.error('Error fetching service requests:', error);
    return next(new ApiError(500, error.message || 'Failed to fetch service requests'));
  }
});

export {
  createServiceTemplate,
  updateServiceTemplate,
  deleteServiceTemplate,
  getServiceTemplates,
  getServiceTemplateById,
  getServiceTemplatesByCategory,
  requestServiceByVendor,
  requestSingleServiceByVendor,
  updateServiceRequest,
  getRequestServiceByVendor,
  getAllServiceRequests,
};
