import { getCurrentProfile } from '@/services/user.service';
import { getUserPayments } from '@/services/payment.service';
import { redirect } from 'next/navigation';
import { PaymentsClient } from '@/components/payment/payments-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thanh toán',
};

export default async function PaymentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const payments = await getUserPayments(profile.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Thanh toán</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Theo dõi lịch sử và các khoản cần thanh toán
        </p>
      </div>

      <PaymentsClient payments={payments} />
    </div>
  );
}
