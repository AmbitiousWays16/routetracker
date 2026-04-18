import { auth } from '@/lib/firebase';

export interface VoucherEmailPayload {
  action: 'submit' | 'approve' | 'reject' | 'final_approval';
  recipientEmail: string;
  employeeName: string;
  month: string;
  totalMiles: number;
  voucherId: string;
  nextApproverRole?: string;
  rejectionReason?: string;
}

/**
 * Sends a voucher notification email via the sendVoucherEmail Cloud Function.
 * This is fire-and-forget: failures are logged but do not throw,
 * so voucher operations are not blocked by email delivery issues.
 */
export async function sendVoucherNotification(payload: VoucherEmailPayload): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('sendVoucherNotification: No authenticated user, skipping email.');
      return;
    }

    const token = await currentUser.getIdToken();
    const response = await fetch(
      import.meta.env.VITE_SEND_VOUCHER_EMAIL_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('sendVoucherNotification: Cloud Function returned error', response.status, errorData);
    }
  } catch (error) {
    console.error('sendVoucherNotification: Failed to send email notification', error);
  }
}
