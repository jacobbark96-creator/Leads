import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
resend.emails.send({
  from: 'Openlead <onboarding@openlead.co.uk>',
  to: ['jake@example.com'],
  subject: 'Test',
  html: '<p>Test</p>'
}).then(console.log).catch(console.error);
