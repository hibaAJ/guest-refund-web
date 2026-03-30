import { z } from 'zod'

const MAX_REFUND_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_PHOTO_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_REFUND_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const refundSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be under 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name contains invalid characters'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254, 'Email address is too long'),
  booking_ref: z
    .string()
    .min(3, 'Booking reference must be at least 3 characters')
    .max(50, 'Booking reference must be under 50 characters')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Booking reference contains invalid characters'),
  booking_date: z
    .date({ error: 'Please select a booking date' })
    .max(new Date(), 'Booking date cannot be in the future'),
  refund_reason: z.enum(
    ['cancellation', 'service_issue', 'double_charge', 'property_condition', 'other'],
    { error: 'Please select a refund reason' }
  ),
  details: z.string().max(2000, 'Details must be under 2000 characters').optional(),
  file: z
    .custom<File>()
    .optional()
    .refine((f) => !f || f.size <= MAX_REFUND_FILE_SIZE, 'File must be under 5MB')
    .refine(
      (f) => !f || ALLOWED_REFUND_TYPES.includes(f.type),
      'File must be JPEG, PNG, WebP, or PDF'
    ),
})

export type RefundFormData = z.infer<typeof refundSchema>

export const maintenanceSchema = z.object({
  property: z.enum(
    ['Sunset Villa', 'Ocean Breeze Apt', 'Mountain Lodge', 'City Loft', 'Riverside Cottage'],
    { error: 'Please select a property' }
  ),
  category: z.enum(
    ['plumbing', 'electrical', 'hvac', 'appliances', 'structural', 'cleaning', 'other'],
    { error: 'Please select an issue category' }
  ),
  urgency: z.enum(['low', 'medium', 'high'], { error: 'Please select urgency level' }),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be under 2000 characters'),
  photo: z
    .custom<File>()
    .optional()
    .refine((f) => !f || f.size <= MAX_PHOTO_FILE_SIZE, 'Photo must be under 10MB')
    .refine(
      (f) => !f || ALLOWED_PHOTO_TYPES.includes(f.type),
      'Photo must be JPEG, PNG, or WebP'
    ),
})

export type MaintenanceFormData = z.infer<typeof maintenanceSchema>
