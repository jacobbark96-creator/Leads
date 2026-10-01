import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-lg text-slate-500">Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="prose prose-blue prose-lg max-w-none text-slate-600">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Openlead ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. 
            If you have any questions or concerns about this privacy notice or our practices with regard to your personal information, please contact us at support@openlead.co.uk.
          </p>

          <h2>2. Information We Collect</h2>
          <p>
            We collect personal information that you voluntarily provide to us when you register on the platform, express an interest in obtaining information about us or our products and services, or otherwise when you contact us.
          </p>
          <p>The personal information that we collect depends on the context of your interactions with us and the platform, the choices you make, and the products and features you use. The personal information we collect may include the following:</p>
          <ul>
            <li>Names</li>
            <li>Phone numbers</li>
            <li>Email addresses</li>
            <li>Job titles</li>
            <li>Billing addresses</li>
            <li>Company and business details</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>
            We use personal information collected via our platform for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
          </p>
          <ul>
            <li>To facilitate account creation and logon process.</li>
            <li>To fulfill and manage your orders, payments, and lead purchases.</li>
            <li>To send administrative information to you.</li>
            <li>To protect our Services.</li>
          </ul>

          <h2>4. Will Your Information Be Shared With Anyone?</h2>
          <p>
            We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. Specifically, we may need to process your data or share your personal information in the following situations:
          </p>
          <ul>
            <li><strong>Lead Generation:</strong> When a lead is purchased by a contractor, the specific contact information and address of the lead is shared exclusively with that contractor.</li>
            <li><strong>Service Providers:</strong> We may share your data with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work (e.g., payment processing via Stripe, communication via Twilio).</li>
          </ul>

          <h2>5. How Long Do We Keep Your Information?</h2>
          <p>
            We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements).
          </p>

          <h2>6. How Do We Keep Your Information Safe?</h2>
          <p>
            We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            If you have questions or comments about this notice, you may email us at support@openlead.co.uk.
          </p>
        </div>
      </div>
    </div>
  );
}