import { Resend } from 'resend';
import { APP_CONFIG } from '@/lib/config';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || `${APP_CONFIG.name} <onboarding@resend.dev>`;
// Resend free tier owner email for fallback delivery in dev mode
const DEV_TEST_EMAIL = 'thanh.nd225670@outlook.com';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend.
 * Gracefully handles missing API key or free tier sandbox restrictions.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!resend) {
    console.warn('[Email Warning] RESEND_API_KEY chưa được cấu hình trong .env.local. Email không thể gửi:', options.subject);
    return false;
  }

  try {
    // Attempt sending to target email
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.warn(`[Email Resend Warning] Không thể gửi tới ${options.to}:`, error.message);

      // If Resend free tier restricts recipient to account owner, retry sending to DEV_TEST_EMAIL
      if (error.message?.includes('only send to your own email') && options.to !== DEV_TEST_EMAIL) {
        console.log(`[Email Dev Fallback] Đang gửi lại Email xem thử tới hòm thư Resend Owner: ${DEV_TEST_EMAIL}`);
        const fallbackRes = await resend.emails.send({
          from: FROM_EMAIL,
          to: DEV_TEST_EMAIL,
          subject: `[DEV TEST -> ${options.to}] ${options.subject}`,
          html: `<div style="background:#fef3c7;padding:12px;border-radius:8px;margin-bottom:16px;font-size:12px;color:#92400e;">
            <strong>⚠️ [DEV MODE NOTICE]</strong> Email này gốc được gửi tới <code>${options.to}</code>. Do tài khoản Resend chưa Verify Domain custom nên được chuyển tiếp tới hòm thư thử nghiệm của bạn để bạn xem nội dung.
          </div>` + options.html,
        });

        if (!fallbackRes.error) {
          console.log('[Email Dev Fallback Success]: ID', fallbackRes.data?.id);
          return true;
        }
      }
      return false;
    }

    console.log('[Email Sent Success]:', data?.id, '-> Target:', options.to);
    return true;
  } catch (error) {
    console.error('[Email Exception]:', error);
    return false;
  }
}

// ─── Email Templates ────────────────────────────────────────────────

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { font-size: 24px; font-weight: 700; color: #16a34a; margin-bottom: 24px; }
    .logo span { color: #18181b; }
    h1 { font-size: 20px; color: #18181b; margin: 0 0 16px; }
    p { color: #52525b; line-height: 1.6; margin: 0 0 16px; }
    .amount { font-size: 28px; font-weight: 700; color: #16a34a; }
    .btn { display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; margin: 16px 0; }
    .footer { text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">🏸 <span>${APP_CONFIG.name}</span></div>
      ${content}
    </div>
    <div class="footer">
      <p>${APP_CONFIG.name} · ${APP_CONFIG.subtitle}</p>
    </div>
  </div>
</body>
</html>`;

export async function sendAccountApprovedEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: `[${APP_CONFIG.name}] 🎉 Tài khoản của bạn đã được phê duyệt!`,
    html: baseTemplate(`
      <h1>Xin chào ${name}!</h1>
      <p>Chúc mừng bạn! Tài khoản thành viên tại <strong>${APP_CONFIG.name}</strong> đã được Ban Quản Trị phê duyệt thành công.</p>
      <p>Bây giờ bạn đã có thể truy cập hệ thống để chọn khung giờ rảnh, đăng ký buổi tập và tham gia cùng các thành viên khác trong câu lạc bộ!</p>
      <a href="${APP_CONFIG.url}/dashboard" class="btn">Vào Bảng Điều Khiển</a>
    `),
  });
}

export async function sendAccountRejectedEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: `[${APP_CONFIG.name}] ❌ Yêu cầu tham gia đã bị từ chối`,
    html: baseTemplate(`
      <h1>Xin chào ${name},</h1>
      <p>Yêu cầu tham gia câu lạc bộ <strong>${APP_CONFIG.name}</strong> của bạn đã bị Ban Quản Trị từ chối hoặc tạm khóa.</p>
      <p>Nếu có thắc mắc hoặc muốn gửi lại yêu cầu phê duyệt, bạn có thể truy cập trang chủ để gửi lại yêu cầu xin xem xét.</p>
      <a href="${APP_CONFIG.url}/blocked" class="btn">Xem Chi Tiết</a>
    `),
  });
}

export async function sendAdminNewMemberPendingEmail(
  adminEmail: string,
  memberName: string,
  memberEmail: string,
  isResendRequest: boolean = false
) {
  const title = isResendRequest
    ? `🔔 GỬI LẠI YÊU CẦU PHÊ DUYỆT: ${memberName}`
    : `🔔 CÓ THÀNH VIÊN MỚI ĐĂNG KÝ: ${memberName}`;

  return sendEmail({
    to: adminEmail,
    subject: `[${APP_CONFIG.name}] ${title}`,
    html: baseTemplate(`
      <h1>${title}</h1>
      <p>Thành viên <strong>${memberName}</strong> (${memberEmail}) đang chờ Ban Quản Trị phê duyệt tài khoản.</p>
      <div style="background: #f4f4f5; padding: 16px; border-radius: 12px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Họ tên:</strong> ${memberName}</p>
        <p style="margin: 4px 0 0;"><strong>Email:</strong> ${memberEmail}</p>
        <p style="margin: 4px 0 0;"><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
      </div>
      <a href="${APP_CONFIG.url}/admin/members" class="btn">Duyệt Thành Viên Ngay</a>
    `),
  });
}

export async function sendPaymentRequestEmail(
  to: string,
  name: string,
  amount: number,
  sessionDate: string
) {
  const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);
  return sendEmail({
    to,
    subject: `[${APP_CONFIG.name}] Thông báo thanh toán — Ngày ${sessionDate}`,
    html: baseTemplate(`
      <h1>Thông báo thanh toán chi phí buổi tập</h1>
      <p>Xin chào ${name}, chi phí tham gia buổi tập ngày ${sessionDate} của bạn là:</p>
      <p class="amount">${formattedAmount} ₫</p>
      <a href="${APP_CONFIG.url}/payments" class="btn">Xem Chi Tiết Thanh Toán</a>
    `),
  });
}

export async function sendPaymentVerifiedEmail(to: string, name: string, amount: number) {
  const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);
  return sendEmail({
    to,
    subject: `[${APP_CONFIG.name}] ✅ Đã xác nhận thanh toán`,
    html: baseTemplate(`
      <h1>Thanh toán thành công</h1>
      <p>Xin chào ${name}, khoản thanh toán <strong>${formattedAmount} ₫</strong> của bạn đã được Admin xác nhận thành công. Cảm ơn bạn!</p>
    `),
  });
}

export async function sendCourtBookingNotificationEmail(
  toEmail: string,
  memberName: string,
  courtName: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  isUpdate: boolean = false
) {
  const formattedDate = new Date(dateStr).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const subjectText = isUpdate
    ? `[${APP_CONFIG.name}] 📝 Cập nhật thông tin đặt sân ngày ${formattedDate}`
    : `[${APP_CONFIG.name}] 🏸 Thông báo đặt sân mới ngày ${formattedDate}`;

  return sendEmail({
    to: toEmail,
    subject: subjectText,
    html: baseTemplate(`
      <h1>Xin chào ${memberName}!</h1>
      <p>Ban Quản Trị đã ${isUpdate ? 'cập nhật' : 'chốt đặt'} sân đánh cầu cho ngày <strong>${formattedDate}</strong> mà bạn đã chọn khung giờ rảnh.</p>
      
      <div style="background: #f4f4f5; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #10b981;">
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #065f46;">📍 ${courtName}</p>
        <p style="margin: 6px 0 0; color: #374151;">⏰ Giờ đánh: <strong>${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}</strong></p>
        <p style="margin: 4px 0 0; color: #374151;">📅 Ngày: <strong>${formattedDate}</strong></p>
      </div>

      <p>Mời bạn kiểm tra lịch thi đấu và sắp xếp tham gia đúng giờ nhé!</p>
      <a href="${APP_CONFIG.url}/schedule" class="btn">Xem Lịch Thi Đấu CLB</a>
    `),
  });
}
