// The legacy src/models/order.model.js already registers a Mongoose model named
// "Order". Registering the new base discriminator model under that same name would
// throw OverwriteModelError, so this feature uses "CustomerOrder" instead. Its
// discriminators (ServiceOrder / ProductOrder, registered by the service-booking and
// product-order features) don't collide with anything legacy.
export const MODEL_NAMES = {
  CUSTOMER_ORDER: 'CustomerOrder',
};
