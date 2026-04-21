import React from 'react';
import { Shield, Target, Users, Zap } from 'lucide-react';

export default function Services() {
  return (
    <section className="py-24 bg-gray-50 min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold tracking-wide text-blue-600 uppercase mb-3">Our Services</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What We Do</h3>
          <p className="text-lg text-gray-600">
            We specialize in generating high-intent, exclusive leads across key service industries. 
            Our multi-channel approach ensures you're only talking to prospects ready to buy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: 'Solar Installation', icon: Zap, desc: 'Homeowners actively looking to transition to renewable solar energy solutions.' },
            { title: 'Solar Cleaning', icon: Target, desc: 'Maintenance leads for existing solar arrays requiring professional cleaning.' },
            { title: 'Roofing Services', icon: Shield, desc: 'High-ticket repair and replacement leads from qualified homeowners.' },
            { title: 'Asbestos Removal', icon: Users, desc: 'Commercial and residential leads requiring certified abatement services.' },
          ].map((service, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-shadow border border-gray-100 group">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <service.icon className="w-7 h-7 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h4>
              <p className="text-gray-600 leading-relaxed">{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}