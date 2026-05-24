/**
 * Email Service — uses Resend (free: 100 emails/day)
 * Only needs 2 env vars: RESEND_API_KEY + ADMIN_EMAIL
 * Sign up at https://resend.com → get API key → done.
 */

exports.sendAppointmentNotification = async ({ booking, userName, userEmail }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!apiKey || !adminEmail) {
    console.log("[Email] ══════════════════════════════════════");
    console.log("[Email] NEW APPOINTMENT (email not configured)");
    console.log(`[Email] From: ${userName} (${userEmail})`);
    console.log(`[Email] Type: ${booking.requestType} | Location: ${booking.location}`);
    console.log(`[Email] Phone: ${booking.phone} | Time: ${booking.preferredTime || "—"}`);
    console.log("[Email] Add RESEND_API_KEY + ADMIN_EMAIL to .env to enable email.");
    console.log("[Email] ══════════════════════════════════════");
    return;
  }

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:18px 22px;border-radius:12px 12px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:17px;">🧠 MindTrack — New Appointment</h2>
      </div>
      <div style="padding:20px 22px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:7px 0;color:#64748b;width:130px;">From</td><td style="font-weight:600;">${userName} (${userEmail})</td></tr>
          <tr><td style="padding:7px 0;color:#64748b;">Specialist</td><td style="font-weight:600;">${booking.requestType}</td></tr>
          <tr><td style="padding:7px 0;color:#64748b;">📍 Location</td><td>${booking.location}</td></tr>
          <tr><td style="padding:7px 0;color:#64748b;">📞 Phone</td><td>${booking.phone}</td></tr>
          ${booking.preferredTime ? `<tr><td style="padding:7px 0;color:#64748b;">🕐 Time</td><td>${booking.preferredTime}</td></tr>` : ""}
          ${booking.message ? `<tr><td style="padding:7px 0;color:#64748b;">💬 Note</td><td>${booking.message}</td></tr>` : ""}
        </table>
        <p style="font-size:12px;color:#94a3b8;margin:14px 0 0;">Automated notification from MindTrack</p>
      </div>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "MindTrack <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `🆕 Appointment Request — ${booking.requestType} (${userName})`,
        html,
      }),
    });

    if (res.ok) {
      console.log(`[Email] ✅ Appointment notification sent to ${adminEmail}`);
    } else {
      const err = await res.text();
      console.error(`[Email] ❌ Resend ${res.status}: ${err}`);
    }
  } catch (err) {
    console.error("[Email] ❌ Failed:", err.message);
  }
};
