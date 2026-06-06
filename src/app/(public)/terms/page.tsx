import React from 'react';

export default function TermsOfService() {
  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Terms of Service</h1>
          <p className="mt-4 text-lg text-slate-500">Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="prose prose-blue prose-lg max-w-none text-slate-600">
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using Openlead, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>

          <h2>2. Use License & Account Access</h2>
          <p>
            Permission is granted to temporarily access the materials (information or software) on Openlead's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul>
            <li>Modify or copy the materials;</li>
            <li>Use the materials for any commercial purpose beyond your registered business operations;</li>
            <li>Attempt to decompile or reverse engineer any software contained on Openlead's website;</li>
            <li>Remove any copyright or other proprietary notations from the materials; or</li>
            <li>Share your account credentials or transfer the materials to another person or "mirror" the materials on any other server.</li>
          </ul>

          <h2>3. Lead Purchases and Exclusivity</h2>
          <p>
            When purchasing leads through the Openlead platform, the following terms apply:
          </p>
          <ul>
            <li><strong>Pay-As-You-Go:</strong> All leads are billed individually at the time of purchase unless utilizing account credits or agreed bulk-pricing arrangements.</li>
            <li><strong>Exclusivity:</strong> Leads are sold on a strict exclusivity basis according to our stated marketplace policies (e.g., Exclusive leads are sold to only one contractor; Shared leads are sold to a maximum of 3 contractors).</li>
            <li><strong>Refunds & Replacements:</strong> Refunds or lead replacements are handled on a case-by-case basis strictly if the provided contact information is definitively invalid or fraudulent, subject to verification by the Openlead QA team.</li>
          </ul>

          <h2>4. Disclaimer</h2>
          <p>
            The materials on Openlead's website are provided on an 'as is' basis. Openlead makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>

          <h2>5. Limitations of Liability</h2>
          <p>
            In no event shall Openlead or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Openlead's website, even if Openlead or an authorized representative has been notified orally or in writing of the possibility of such damage.
          </p>

          <h2>6. Revisions and Errata</h2>
          <p>
            The materials appearing on Openlead's website could include technical, typographical, or photographic errors. Openlead does not warrant that any of the materials on its website are accurate, complete, or current. We may make changes to the materials contained on its website at any time without notice.
          </p>

          <h2>7. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in accordance with the laws of the United Kingdom and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
          </p>
        </div>
      </div>
    </div>
  );
}