import { RefundForm } from '@/components/refund/refund-form'

export const metadata = {
  title: 'Refund Request | Property Management Portal',
}

export default function RefundPage() {
  return (
    <div className="py-4">
      <RefundForm />
    </div>
  )
}
