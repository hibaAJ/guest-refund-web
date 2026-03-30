'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

type FormErrors = Partial<Record<string, string>>

function isOver90DaysAgo(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  return date < ninetyDaysAgo
}

export function RefundForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [bookingRef, setBookingRef] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [details, setDetails] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedData, setSubmittedData] = useState<RefundRequest | null>(null)

  const showWarning = bookingDate !== '' && isOver90DaysAgo(bookingDate)

  function validate(): FormErrors {
    const e: FormErrors = {}

    if (!fullName.trim()) {
      e.fullName = 'Full name is required'
    } else if (fullName.trim().length < 2) {
      e.fullName = 'Full name must be at least 2 characters'
    } else if (!/^[a-zA-Z\s'-]+$/.test(fullName.trim())) {
      e.fullName = 'Full name contains invalid characters'
    }

    if (!email.trim()) {
      e.email = 'Email address is required'
    } else if (!/^[^@]+@[^@]+\.[^@]+$/.test(email.trim())) {
      e.email = 'Please enter a valid email address'
    }

    if (!bookingRef.trim()) {
      e.bookingRef = 'Booking reference is required'
    } else if (!/^[a-zA-Z0-9-_]+$/.test(bookingRef.trim())) {
      e.bookingRef = 'Booking reference contains invalid characters'
    }

    if (!bookingDate) {
      e.bookingDate = 'Please select a booking date'
    } else if (new Date(bookingDate + 'T00:00:00') > new Date()) {
      e.bookingDate = 'Booking date cannot be in the future'
    }

    if (!refundReason) {
      e.refundReason = 'Please select a refund reason'
    }

    if (details.length > 2000) {
      e.details = 'Details must be under 2000 characters'
    }

    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) e.file = 'File must be under 5MB'
      else if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(selectedFile.type)) {
        e.file = 'File must be JPEG, PNG, WebP, or PDF'
      }
    }

    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setIsSubmitting(true)

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
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
        booking_ref: bookingRef.trim().toUpperCase(),
        booking_date: bookingDate,
        refund_reason: refundReason,
        details: details.trim() || null,
        file_url: fileUrl,
      }

      const { error } = await supabase.from('refund_requests').insert(payload)
      if (error) throw new Error(error.message)

      const successData: RefundRequest = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...payload,
      }

      setSubmittedData(successData)

      setTimeout(() => {
        toast.success('Email Confirmation Sent', {
          description: `A confirmation has been sent to ${email}`,
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

  function resetForm() {
    setFullName('')
    setEmail('')
    setBookingRef('')
    setBookingDate('')
    setRefundReason('')
    setDetails('')
    setSelectedFile(null)
    setErrors({})
    setSubmitError(null)
    setSubmittedData(null)
  }

  if (submittedData) {
    return <RefundSuccessScreen data={submittedData} onReset={resetForm} />
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
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <input
              id="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className={cn(fieldClass, errors.fullName && 'border-destructive')}
            />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className={cn(fieldClass, errors.email && 'border-destructive')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          {/* Booking Reference */}
          <div className="space-y-1.5">
            <Label htmlFor="booking_ref">
              Booking Reference <span className="text-destructive">*</span>
            </Label>
            <input
              id="booking_ref"
              type="text"
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value)}
              placeholder="BK-123456"
              className={cn(fieldClass, errors.bookingRef && 'border-destructive')}
            />
            {errors.bookingRef && <p className="text-sm text-destructive">{errors.bookingRef}</p>}
          </div>

          {/* Booking Date */}
          <div className="space-y-1.5">
            <Label htmlFor="booking_date">
              Booking Date <span className="text-destructive">*</span>
            </Label>
            <input
              id="booking_date"
              type="date"
              value={bookingDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setBookingDate(e.target.value)}
              className={cn(fieldClass, errors.bookingDate && 'border-destructive')}
            />
            {errors.bookingDate && <p className="text-sm text-destructive">{errors.bookingDate}</p>}
          </div>

          {/* 90-day warning banner */}
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
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className={cn(fieldClass, errors.refundReason && 'border-destructive')}
            >
              <option value="" disabled>Select a reason</option>
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.refundReason && <p className="text-sm text-destructive">{errors.refundReason}</p>}
          </div>

          {/* Additional Details */}
          <div className="space-y-1.5">
            <Label htmlFor="details">Additional Details</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please describe your situation in detail..."
              rows={4}
              className={cn(errors.details && 'border-destructive')}
            />
            {errors.details && <p className="text-sm text-destructive">{errors.details}</p>}
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
                    onClick={() => setSelectedFile(null)}
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
                      if (file) setSelectedFile(file)
                    }}
                  />
                </div>
              )}
            </div>
            {errors.file && <p className="text-sm text-destructive">{errors.file}</p>}
          </div>

          {/* Inline submission error */}
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
