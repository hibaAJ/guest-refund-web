'use client'

import { CheckCircle2, FileText, Calendar, Mail, Hash, Tag } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { RefundRequest } from '@/lib/supabase'

const REASON_LABELS: Record<string, string> = {
  cancellation: 'Booking Cancellation',
  service_issue: 'Service Issue',
  double_charge: 'Double Charge',
  property_condition: 'Property Condition',
  other: 'Other',
}

interface Props {
  data: RefundRequest
  onReset: () => void
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
    </div>
  )
}

export function RefundSuccessScreen({ data, onReset }: Props) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold">Request Submitted Successfully</h2>
        <p className="text-muted-foreground max-w-sm">
          Your refund request has been received. Our team will review it and respond within 3–5
          business days.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <SummaryRow
              icon={<FileText className="h-4 w-4" />}
              label="Full Name"
              value={data.full_name}
            />
            <Separator />
            <SummaryRow
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={data.email}
            />
            <Separator />
            <SummaryRow
              icon={<Hash className="h-4 w-4" />}
              label="Booking Reference"
              value={data.booking_ref}
            />
            <Separator />
            <SummaryRow
              icon={<Calendar className="h-4 w-4" />}
              label="Booking Date"
              value={format(new Date(data.booking_date + 'T00:00:00'), 'MMMM d, yyyy')}
            />
            <Separator />
            <SummaryRow
              icon={<Tag className="h-4 w-4" />}
              label="Refund Reason"
              value={REASON_LABELS[data.refund_reason] ?? data.refund_reason}
            />
            {data.details && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Additional Details
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{data.details}</p>
                </div>
              </>
            )}
            {data.file_url && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Attached File
                  </p>
                  <a
                    href={data.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    View uploaded file
                  </a>
                </div>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Reference ID:{' '}
              <span className="font-mono font-medium">{data.id}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted: {format(new Date(data.created_at), 'PPP p')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onReset} variant="outline" className="w-full">
        Submit Another Request
      </Button>
    </div>
  )
}
