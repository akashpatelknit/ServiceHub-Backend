export const VENDOR_SERVICE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Drives frontend click behavior on Category/Subcategory tiles: 'modal' opens a picker
// sheet with the item's children (falling back to 'navigate' if it turns out to have
// none); 'navigate' routes straight to the detail page.
export const DISPLAY_TYPES = {
  NAVIGATE: 'navigate',
  MODAL: 'modal',
};

export const ADDON_TARGET_TYPES = {
  SERVICE: 'service',
  SERVICE_GROUP: 'serviceGroup',
};

// Maps a catalog entity to its R2 storage folder for presigned image uploads. Reused
// by features/product-catalog too (product/productCategory) rather than duplicating
// the whole presigned-URL mechanism — see MediaService.generatePresignedUploadUrl.
export const CATALOG_MEDIA_FOLDERS = {
  category: 'categories',
  subcategory: 'subcategories',
  serviceGroup: 'service-groups',
  service: 'services',
  addOn: 'add-ons',
  product: 'products',
  productCategory: 'product-categories',
};

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

