import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
// Only initialize if the key exists to prevent crashing if it's missing in dev
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Replace this with your actual verified sending domain (e.g., 'hello@openlead.co.uk' or 'onboarding@openlead.co.uk')
export const defaultFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@openlead.co.uk';

/**
 * Sends a welcome email to a newly onboarded client.
 */
export const sendWelcomeEmail = async (email: string, name: string) => {
  if (!resend) {
    console.warn('Resend API key not configured. Skipping welcome email.');
    return { success: false, error: 'Resend API key missing' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Openlead <${defaultFromEmail}>`,
      to: [email],
      subject: 'Welcome to Openlead - You are fully onboarded!',
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #2563eb;">Welcome to Openlead, ${name}! 🎉</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            We are thrilled to inform you that your account has been fully reviewed and successfully onboarded. 
            You now have full access to our exclusive, high-intent marketplace.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>Next Steps:</strong>
          </p>
          <ul style="color: #4b5563; line-height: 1.6;">
            <li>Log in to your Client Dashboard</li>
            <li>Review the exclusive leads available in your area</li>
            <li>Contact your Personal Openlead Coach if you have any questions or need to set up child accounts for your team.</li>
          </ul>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Openlead. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Welcome Email Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to send welcome email:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Sends an email when an advisor is assigned or changed
 */
export const sendAdvisorEmail = async (
  email: string, 
  clientName: string, 
  advisor: { name: string, phone?: string, email?: string },
  isNewAssignment: boolean
) => {
  if (!resend) {
    console.warn('Resend API key not configured. Skipping advisor email.');
    return { success: false, error: 'Resend API key missing' };
  }

  const subject = isNewAssignment 
    ? 'Welcome to Openlead - Meet your Personal Account Manager!' 
    : 'Update: Your New Personal Account Manager at Openlead';

  const introText = isNewAssignment
    ? `We are thrilled to inform you that your account has been fully reviewed and successfully onboarded. You now have full access to our exclusive, high-intent marketplace.`
    : `We are writing to let you know that your dedicated account manager at Openlead has been updated.`;

  const managerIntro = isNewAssignment
    ? `To help you get the most out of our platform, we have assigned you a dedicated Personal Account Manager.`
    : `Your new Personal Account Manager is here to ensure you continue to get the absolute best out of our platform and leads.`;

  try {
    const { data, error } = await resend.emails.send({
      from: `Openlead <${defaultFromEmail}>`,
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #2563eb;">${isNewAssignment ? `Welcome to Openlead, ${clientName}! 🎉` : `Account Update for ${clientName}`}</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            ${introText}
          </p>

          <p style="color: #4b5563; line-height: 1.6;">
            ${managerIntro}
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Your Account Manager Details</h3>
            <p style="margin: 5px 0; color: #334155;"><strong>Name:</strong> ${advisor.name}</p>
            ${advisor.phone ? `<p style="margin: 5px 0; color: #334155;"><strong>Phone/WhatsApp:</strong> ${advisor.phone}</p>` : ''}
            ${advisor.email ? `<p style="margin: 5px 0; color: #334155;"><strong>Email:</strong> ${advisor.email}</p>` : ''}
            
            <p style="margin-top: 15px; margin-bottom: 0; color: #475569; font-size: 14px;">
              ${advisor.name} will be your primary point of contact for any questions, account adjustments, or lead feedback. 
              ${advisor.phone ? `Feel free to reach out via WhatsApp at any time.` : `Feel free to reach out via email.`}
            </p>
          </div>

          <p style="color: #4b5563; line-height: 1.6;">
            <strong>Next Steps:</strong>
          </p>
          <ul style="color: #4b5563; line-height: 1.6;">
            <li>Log in to your Client Dashboard</li>
            <li>Review the exclusive leads available in your area</li>
            <li>Reach out to ${advisor.name} if you need help adjusting your service areas or categories.</li>
          </ul>

          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Go to Dashboard
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Openlead. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Advisor Email Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to send advisor email:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Send Receipt Email (To be called from Stripe Webhook later)
 */
export const sendReceiptEmail = async (email: string, leadId: string, amount: number) => {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: `Openlead Billing <${defaultFromEmail}>`,
      to: [email],
      subject: `Your Receipt from Openlead - Lead #${leadId.split('-')[0]}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
          <h2>Thank you for your purchase!</h2>
          <p>You have successfully purchased a lead for £${amount.toFixed(2)}.</p>
          <p>You can view the full unredacted details of this lead in your Client Dashboard immediately.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send receipt email:', err);
  }
};

/**
 * Add contact to Audience for Marketing Emails (e.g. weekly newsletters)
 * Note: Requires you to create an Audience in Resend and grab the Audience ID
 */
export const addContactToMarketingAudience = async (email: string, firstName: string, lastName?: string) => {
  if (!resend) return;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) return;

  try {
    await resend.contacts.create({
      email,
      firstName,
      lastName,
      unsubscribed: false,
      audienceId,
    });
  } catch (err) {
    console.error('Failed to add contact to marketing audience:', err);
  }
};
