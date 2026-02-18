import { AivolearningEmail } from '@enterprise-email/aivolearning-email';

const client = new AivolearningEmail({
  apiKey: process.env.OONRUMAIL_API_KEY ?? 'em_sbub2P5zGIRZjSs63Tr_NlRonaaFZHP-o994sxZCGvk=',
});

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:40px 40px 30px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Welcome to AIVO Learning</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px;">Your intelligent learning journey starts now</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">Hi there! &#128075;</p>
<p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
We're thrilled to have you on board. <strong>AIVO Learning</strong> is an AI-powered
education platform designed to make learning engaging, personalised, and effective.
</p>
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">Here's what you can do next:</p>
<ul style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:15px;line-height:1.8;">
<li><strong>Explore courses</strong> curated by expert educators</li>
<li><strong>Track your progress</strong> with real-time analytics</li>
<li><strong>Engage with AI tutoring</strong> for personalised help</li>
<li><strong>Earn certificates</strong> as you complete milestones</li>
</ul>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td style="background:#4F46E5;border-radius:6px;">
<a href="https://app.aivo.io" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Get Started &#8594;</a>
</td></tr></table>
<p style="margin:0;color:#6B7280;font-size:14px;line-height:1.5;text-align:center;">
Questions? Reply to this email or reach us at
<a href="mailto:support@aivo.app" style="color:#4F46E5;text-decoration:none;">support@aivo.app</a>
</p>
</td></tr>
<tr><td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;color:#9CA3AF;font-size:12px;">&copy; 2026 AIVO Learning. All rights reserved.</p>
</td></tr></table></td></tr></table></body></html>`;

async function main() {
  console.log('Sending welcome email via SDK...');
  const result = await client.send({
    from: 'noreply@aivo.app',
    fromName: 'AIVO Learning',
    to: 'ofemeofem@gmail.com',
    subject: 'Welcome to AIVO Learning! \u{1F393}',
    html,
    text: 'Welcome to AIVO Learning! Your intelligent learning journey starts now. Get started at https://app.aivo.io',
    tags: ['welcome', 'test'],
  });
  console.log('Result:', result);
}

main();
