import { Resend } from 'resend';
const resend = new Resend('re_9jTQk2aP_2XbnSUQMhdzzaPJvBTRA7RnU');

async function test() {
  const res = await resend.emails.send({
    from: 'Openlead <onboarding@openlead.co.uk>',
    to: ['test@example.com'], 
    subject: 'Test',
    html: '<p>Test</p>'
  });
  console.log('Result:', res.data, res.error);
}
test();
