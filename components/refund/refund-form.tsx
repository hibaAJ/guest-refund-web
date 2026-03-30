'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { AlertTriangle, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { refundSchema, type RefundFormData } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { isOver90DaysAgo, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefundSuccessScreen } from './success-screen'
import type { RefundRequest } from '@/lib/supabase'

const REFUND_REASONS = [
  { value: 'cancellation', label: 'Booking Cancellation' },
  { value: 'service_issue', label: 'Service Issue' },
  { value: 'double_charge', label: 'Double Charge' },
  { value: 'property_condition', label: 'Property Condition' },
  { value: 'other', label: 'Other' },
]

const fieldClass =
  'flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700'

export function RefundForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedData, setSubmittedData] = useState<RefundRequest | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dateValue, setDateValue] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<RefundFormData>({
    resolver: zodResolver(refundSchema),
  })

  const bookingDate = watch('booking_date')
  const showWarning = bookingDate && isOver90DaysAgo(bookingDate)

  const onSubmit = async (data: RefundFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      let fileUrl: string | null = null

      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('refund-receipts')
          .upload(path, selectedFile, { contentType: selectedFile.type })

        if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`)

        const { data: urlData } = supabase.storage.from('refund-receipts').getPublicUrl(path)
        fileUrl = urlData.publicUrl
      }

      const payload = {
        full_name: data.full_name.trim(),
        email: data.email.toLowerCase().trim(),
        booking_ref: data.booking_ref.trim().toUpperCase(),
        booking_date: format(data.booking_date, 'yyyy-MM-dd'),
        refund_reason: data.refund_reason,
        details: data.details?.trim() || null,
        file_url: fileUrl,
      }

      const { error } = await supabase.from('refund_requests').insert(payload)

      if (error) throw new Error(error.message)

      // Build success data locally — anon role has INSERT only, not SELECT
      const successData: RefundRequest = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...payload,
      }

      setSubmittedData(successData)
      reset()
      setSelectedFile(null)
      setDateValue('')

      setTimeout(() => {
        toast.success('Email Confirmation Sent', {
          description: `A confirmation has been sent to ${data.email}`,
        })
      }, 800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.'
      setSubmitError(msg)
      toast.error('Submission Failed', { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submittedData) {
    return <RefundSuccessScreen data={submittedData} onReset={() => setSubmittedData(null)} />
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Guest Refund Request</CardTitle>
        <CardDescription>
          Complete the form below to submit a refund request. We aim to respond within 3–5 business
          days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="Jane Smith"
              {...register('full_name')}
              aria-invalid={!!errors.full_name}
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          {/* Booking Reference */}
          <div className="space-y-1.5">
            <Label htmlFor="booking_ref">
              Booking Reference <span className="text-destructive">*</span>
            </Label>
            <Input
              id="booking_ref"
              placeholder="BK-123456"
              {...register('booking_ref')}
              aria-invalid={!!errors.booking_ref}
            />
            {errors.booking_ref && (
              <p className="text-sm text-destructive">{errors.booking_ref.message}</p>
            )}
          </div>

          {/* Booking Date */}
          <div className="space-y-1.5">
            <Label htmlFor="booking_date">
              Booking Date <span className="text-destructive">*</span>
            </Label>
            <input
              id="booking_date"
              type="date"
              value={dateValue}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => {
                const raw = e.target.value
                setDateValue(raw)
                if (raw) {
                  setValue('booking_date', new Date(raw + 'T00:00:00'), { shouldValidate: true })
                }
              }}
              className={cn(fieldClass, !!errors.booking_date && 'border-destructive')}
            />
            {errors.booking_date && (
              <p className="text-sm text-destructive">{errors.booking_date.message}</p>
            )}
          </div>

          {/* 90-day warning banner — exact text from spec */}
          {showWarning && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-600 p-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Your booking is outside the standard refund window. Your request will be reviewed on a case-by-case basis.
              </p>
            </div>
          )}

          {/* Refund Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="refund_reason">
              Refund Reason <span className="text-destructive">*</span>
            </Label>
            <select
              id="refund_reason"
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value
                if (val) {
                  setValue('refund_reason', val as RefundFormData['refund_reason'], {
                    shouldValidate: true,
                  })
                }
              }}
              className={cn(fieldClass, !!errors.refund_reason && 'border-destructive')}
            >
              <option value="" disabled>Select a reason</option>
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.refund_reason && (
              <p className="text-sm text-destructive">{errors.refund_reason.message}</p>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-1.5">
            <Label htmlFor="details">Additional Details</Label>
            <Textarea
              id="details"
              placeholder="Please describe your situation in detail..."
              rows={4}
              {...register('details')}
              aria-invalid={!!errors.details}
            />
            {errors.details && (
              <p className="text-sm text-destructive">{errors.details.message}</p>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-1.5">
            <Label>Supporting Document (optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              {selectedFile ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground truncate max-w-[80%]">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      setValue('file', undefined)
                    }}
                    className="ml-2 shrink-0 rounded p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    JPEG, PNG, WebP, PDF · Max 5MB
                  </p>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium file:cursor-pointer cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setSelectedFile(file)
                        setValue('file', file, { shouldValidate: true })
                      }
                    }}
                  />
                </div>
              )}
            </div>
            {errors.file && (
              <p className="text-sm text-destructive">{errors.file.message as string}</p>
            )}
          </div>

          {/* Inline submission error — more visible than toast alone */}
          {submitError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <strong>Submission failed:</strong> {submitError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Refund Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
