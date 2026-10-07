const { z } = require('zod');

const planSchema = z
  .object({
    name: z.string({ required_error: 'Name is required.' }).trim().min(2, 'Name must be at least 2 characters.').max(120),
    description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.').default(''),
    bedrooms: z.coerce.number({ invalid_type_error: 'Bedrooms must be a number.' }).int().min(0).max(20),
    bathrooms: z.coerce.number({ invalid_type_error: 'Bathrooms must be a number.' }).min(0).max(20),
    floors: z.coerce.number({ invalid_type_error: 'Floors must be a number.' }).int().min(1, 'Floors must be at least 1.').max(5),
    floor_area_m2: z.coerce.number({ invalid_type_error: 'Floor area must be a number.' }).positive('Floor area must be greater than zero.').max(100000),
    footprint_m2: z.coerce.number({ invalid_type_error: 'Footprint must be a number.' }).positive('Footprint must be greater than zero.').max(100000),
    min_plot_size_m2: z.coerce.number({ invalid_type_error: 'Minimum plot size must be a number.' }).positive('Minimum plot size must be greater than zero.').max(1000000),
    style: z.string({ required_error: 'Style is required.' }).trim().min(2).max(60),
    image_url: z
      .string()
      .trim()
      .max(2000)
      .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Image URL must start with http:// or https://')
      .default(''),
    is_active: z.coerce.boolean().default(true),
  })
  .refine((p) => p.footprint_m2 <= p.floor_area_m2 * 1.5, {
    message: 'Footprint looks too large compared to the floor area.',
    path: ['footprint_m2'],
  })
  .refine((p) => p.min_plot_size_m2 >= p.footprint_m2, {
    message: 'Minimum plot size must be at least as large as the footprint.',
    path: ['min_plot_size_m2'],
  });

const rateSchema = z.object({
  rate_per_m2: z.coerce.number({ invalid_type_error: 'Rate must be a number.' }).positive('Rate per m² must be greater than zero.').max(1000000),
});

const finishLevelParam = z.object({
  level: z.enum(['basic', 'standard', 'premium'], { errorMap: () => ({ message: 'Finish level must be basic, standard or premium.' }) }),
});

const activeSchema = z.object({ is_active: z.boolean({ required_error: 'is_active is required.' }) });

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

module.exports = { planSchema, rateSchema, finishLevelParam, activeSchema, idParamSchema };
