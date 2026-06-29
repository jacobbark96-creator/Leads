import React from 'react';
import type { Metadata } from 'next';
import CalculatorClient from './CalculatorClient';

export const metadata: Metadata = {
  title: 'Contractor Lead Generation ROI Calculator | Openlead',
  description: 'Calculate your exact return on investment (ROI), cost per acquisition (CPA), and monthly revenue from purchasing exclusive contractor leads.',
  alternates: {
    canonical: '/roi-calculator',
  },
  openGraph: {
    title: 'Lead Generation ROI Calculator | Openlead',
    description: 'Calculate your exact return on investment (ROI) from purchasing exclusive contractor leads.',
    url: 'https://openlead.co.uk/roi-calculator',
  }
};

export default function ROICalculatorPage() {
  return (
    <div className="min-h-screen bg-white pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Lead Generation <span className="text-transparent bg-clip-text bg-gradient-to-r from-openlead-blue to-cyan-500">ROI Calculator</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Stop guessing your marketing returns. Use our free calculator to determine exactly how many leads you need to hit your revenue goals, your true cost per acquisition, and your projected ROI.
          </p>
        </div>

        <CalculatorClient />

        <div className="max-w-3xl mx-auto mt-24 prose prose-lg prose-slate">
          <h2>Why Calculate Your Lead Generation ROI?</h2>
          <p>
            For UK contractors in the solar, roofing, and home services sectors, knowing your numbers is the difference between scaling profitably and burning cash on bad marketing. 
          </p>
          <p>
            Our calculator helps you understand the relationship between your <strong>Cost Per Lead (CPL)</strong> and your <strong>Cost Per Acquisition (CPA)</strong>. A cheap lead that doesn't convert is far more expensive than a premium, exclusive lead that turns into a high-value job.
          </p>
          <h3>How to improve these metrics:</h3>
          <ul>
            <li><strong>Increase Conversion Rate:</strong> Respond to leads within 5 minutes. Openlead's real-time CRM delivery makes this easy.</li>
            <li><strong>Buy Exclusive Data:</strong> Shared leads drive down your conversion rate because you are fighting 3-4 other contractors. Openlead provides exclusive options to keep your close rate high.</li>
            <li><strong>Know Your Margins:</strong> Adjust the average job value slider to match your specific industry (e.g., Solar PV vs Boiler Replacement) to get an accurate picture of your potential gross profit.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}