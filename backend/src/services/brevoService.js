/**
 * Brevo (formerly Sendinblue) Transactional SMS & Email OTP Service
 * Handles mobile OTP dispatch to riders when driver accepts booking requests.
 * Uses Brevo v3 Transactional SMS API (https://api.brevo.com/v3/transactionalSMS/send-sms)
 * and Brevo Transactional Email API (https://api.brevo.com/v3/smtp/email) as a reliable cross-channel backup.
 */

export async function sendBrevoOtp({
  recipientPhone,
  recipientEmail,
  recipientName,
  otpCode,
  driverName,
  origin,
  destination,
}) {
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  const senderName = process.env.BREVO_SMS_SENDER || 'RideShare';

  const cleanPhone = recipientPhone ? recipientPhone.replace(/\D/g, '') : '';
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const smsText = `Your RideShare verification OTP is ${otpCode}. Share this with driver ${driverName || 'your driver'} to confirm seat reservation for route ${origin?.split(',')[0] || 'Origin'} -> ${destination?.split(',')[0] || 'Destination'}. Valid for 10 minutes.`;

  const results = {
    smsSent: false,
    emailSent: false,
    mode: brevoApiKey ? 'brevo_api' : 'simulated_local',
    otpCode,
  };

  // 1. If Brevo API key is available, call Brevo Transactional SMS API
  if (brevoApiKey && formattedPhone) {
    try {
      const smsPayload = {
        sender: senderName.substring(0, 11), // Brevo allows alphanumeric up to 11 chars
        recipient: formattedPhone,
        content: smsText,
        type: 'transactional',
      };

      const smsRes = await fetch('https://api.brevo.com/v3/transactionalSMS/send-sms', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(smsPayload),
      });

      const smsData = await smsRes.json().catch(() => ({}));
      if (smsRes.ok) {
        console.log(`[Brevo SMS Success] OTP ${otpCode} sent to ${formattedPhone}. MessageId:`, smsData.messageId);
        results.smsSent = true;
        results.smsData = smsData;
      } else {
        console.warn(`[Brevo SMS Notice] Status: ${smsRes.status}, Response:`, smsData);
      }
    } catch (err) {
      console.error('[Brevo SMS Error]:', err.message);
    }

    // 2. Cross-Channel Backup: If recipient has an email, also deliver via Brevo Transactional Email
    if (recipientEmail && recipientEmail.includes('@')) {
      try {
        const emailPayload = {
          sender: {
            name: 'RideShare Local Verification',
            email: process.env.BREVO_SENDER_EMAIL || 'support@ridesharelocal.app',
          },
          to: [{ email: recipientEmail, name: recipientName || 'Rider' }],
          subject: `🔐 Your RideShare Booking OTP: ${otpCode}`,
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
              <h2 style="color: #059669; margin-top: 0;">RideShareLocal OTP Verification</h2>
              <p>Hello <strong>${recipientName || 'Rider'}</strong>,</p>
              <p>Driver <strong>${driverName || 'Your driver'}</strong> is ready to accept your seat reservation.</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 14px; color: #166534; display: block; margin-bottom: 5px;">Your Mobile Booking OTP Code:</span>
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #047857;">${otpCode}</span>
                <span style="font-size: 11px; color: #64748b; display: block; margin-top: 5px;">Valid for 10 minutes</span>
              </div>
              <p style="font-size: 12px; color: #64748b;">
                Share this OTP with your driver to complete the mutual verification.
              </p>
            </div>
          `,
        };

        const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        if (emailRes.ok) {
          results.emailSent = true;
          console.log(`[Brevo Email Backup Success] OTP sent to ${recipientEmail}`);
        }
      } catch (err) {
        console.error('[Brevo Email Error]:', err.message);
      }
    }
  } else {
    // Simulated Local Gateway Delivery (useful when testing or during cold sandbox runs)
    console.log(`[Local / Simulated Brevo Gateway] Mobile OTP: ${otpCode} for Rider ${recipientName} (${recipientPhone || 'No Phone'})`);
  }

  return results;
}
