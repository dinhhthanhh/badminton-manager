import { getAllPayments } from '@/services/payment.service';
import { AdminPaymentsClient } from '@/components/admin/payments-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin Payments' };

export default async function AdminPaymentsPage() {
  const payments = await getAllPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">Verify and manage payments</p>
      </div>
      <AdminPaymentsClient payments={payments} />
    </div>
  );
}
