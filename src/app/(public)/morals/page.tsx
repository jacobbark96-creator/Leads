import React from 'react';

export default function Morals() {
  return (
    <section className="py-24 bg-gray-900 text-white relative overflow-hidden min-h-[80vh]">
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-20"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold tracking-wide text-blue-400 uppercase mb-3">Our Morals</h2>
          <h3 className="text-3xl md:text-4xl font-bold mb-4">Built on Trust & Transparency</h3>
          <p className="text-lg text-gray-400">
            We don't just sell data; we build partnerships. Our core values dictate every decision we make and every lead we generate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { title: 'Quality Over Quantity', desc: 'We refuse to pad our numbers with unqualified data. Every lead is rigorously checked for intent and accuracy before it reaches you.' },
            { title: 'Absolute Transparency', desc: 'No hidden fees, no shared leads disguised as exclusive. You see exactly what you pay for and exactly what you get.' },
            { title: 'Client Success First', desc: 'If our clients aren\'t closing, we aren\'t succeeding. We actively seek feedback to refine our targeting and improve your ROI.' }
          ].map((moral, idx) => (
            <div key={idx} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-blue-400">{idx + 1}</span>
              </div>
              <h4 className="text-xl font-bold mb-4">{moral.title}</h4>
              <p className="text-gray-400 leading-relaxed">{moral.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}