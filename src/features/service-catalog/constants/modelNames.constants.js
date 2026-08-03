// Legacy src/models/ (still reachable at boot via bookingExpirationScheduler.service.js
// -> src/models/index.js) already registers Mongoose models named Category, Service,
// VendorService, and AddOn. Registering under those same names here would throw
// OverwriteModelError the moment both sides load in the same process. Prefixing the
// colliding ones with "Catalog" keeps this feature fully isolated from the legacy
// models without touching them. Subcategory/ServiceGroup have no legacy equivalent and
// keep their plain names.
export const MODEL_NAMES = {
  CATEGORY: 'CatalogCategory',
  SUBCATEGORY: 'Subcategory',
  SERVICE_GROUP: 'ServiceGroup',
  SERVICE: 'CatalogService',
  VENDOR_SERVICE: 'CatalogVendorService',
  ADD_ON: 'CatalogAddOn',
};
