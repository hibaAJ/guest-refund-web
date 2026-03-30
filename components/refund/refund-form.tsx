'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { CalendarIcon, AlertTriangle, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { refundSchema, type RefundFormData } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { isOver90DaysAgo, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefundSuccessScreen } from './success-screen'
import type { RefundRequest } from '@/lib/supabase'

const REFUND_REASONS = [
  { value: 'cancellation', label: 'Booking Cancellation' },
  { value: 'service_issue', label: 'Service Issue' },
  { value: 'double_charge', label: 'Double Charge' },
  { value: 'property_condition', label: 'Property Condition' },
  { value: 'other', label: 'Other' },
]

export function RefundForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedData, setSubmittedData] = useState<RefundRequest | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
    try {
      let fileUrl: string | null = null

      if (data.file && selectedFile) {
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

      const { data: inserted, error } = await supabase
        .from('refund_requests')
        .insert(payload)
        .select()
        .single()

      if (error) throw new Error(error.message)

      setSubmittedData(inserted as RefundRequest)
      reset()
      setSelectedFile(null)

      setTimeout(() => {
        toast.success('Email Confirmation Sent', {
          description: `A confirmation has been sent to ${data.email}`,
        })
      }, 800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.'
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
            <Label>
              Booking Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger
                className={cn(
                  'flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
                  !bookingDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {bookingDate ? format(bookingDate, 'PPP') : 'Pick a date'}
              </PopoverTrigger>
              <PopoverContent align="start">
                <Calendar
                  mode="single"
                  selected={bookingDate}
                  onSelect={(date) =>
                    setValue('booking_date', date as Date, { shouldValidate: true })
                  }
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.booking_date && (
              <p className="text-sm text-destructive">{errors.booking_date.message}</p>
            )}
          </div>

          {/* 90-day warning banner */}
          {showWarning && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-600 p-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Booking is over 90 days old
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-0.5">
                  Refund requests for bookings older than 90 days may require additional review and
                  are subject to our extended refund policy.
                </p>
              </div>
            </div>
          )}

          {/* Refund Reason */}
          <div className="space-y-1.5">
            <Label>
              Refund Reason <span className="text-destructive">*</span>
            </Label>
            <Select
              onValueChange={(val) => {
                if (val !== null) {
                  setValue('refund_reason', val as RefundFormData['refund_reason'], {
                    shouldValidate: true,
                  })
                }
              }}
            >
              <SelectTrigger aria-invalid={!!errors.refund_reason} className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      setSelectedFile(null)
                      setValue('file', undefined)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer py-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground text-center">
                    Click to upload receipt or invoice
                    <br />
                    <span className="text-xs">JPEG, PNG, WebP, PDF · Max 5MB</span>
                  </span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setSelectedFile(file)
                        setValue('file', file, { shouldValidate: true })
                      }
                    }}
                  />
                </label>
              )}
            </div>
            {errors.file && (
              <p className="text-sm text-destructive">{errors.file.message as string}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Refund Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
