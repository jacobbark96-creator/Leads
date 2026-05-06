const { Resend } = require('resend');
const resend = new Resend('re_9jTQk2aP_2XbnSUQMhdzzaPJvBTRA7RnU');

async function test() {
  const { data, error } = await resend.emails.send({
    from: 'Openlead <onboarding@openlead.co.uk>',
    to: ['test@example.com'], // Try a random email
    subject: 'Test',
    html: '<p>Test</p>'
  });
  console.log('Result:', data, error);
}
test();
