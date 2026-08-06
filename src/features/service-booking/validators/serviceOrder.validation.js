import { z } from 'zod';
import { objectIdSchema } from '../../service-catalog/validators/common.validation.js';

export const assignVendorSchema = {
  params: z.object({ id: objectIdSchema }),
  body: z.object({ vendorId: objectIdSchema }),
};
