import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function About() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                alt="Our Team" 
                className="rounded-3xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-blue-600 text-white p-8 rounded-3xl shadow-xl hidden md:block">
                <p className="text-4xl font-bold mb-1">10k+</p>
                <p className="text-blue-100 font-medium">Leads Delivered</p>
              </div>
            </div>
          </div>
          <div className="lg:w-1/2">
            <h2 className="text-sm font-bold tracking-wide text-blue-600 uppercase mb-3">About Us</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Bridging the gap between great services and ready customers.</h3>
            <p className="text-xl text-slate-600 leading-relaxed">
              At Openlead, we understand that your time is best spent closing deals and serving customers—not hunting for prospects. Founded by industry veterans, our platform was built to solve the biggest bottleneck in contracting businesses: predictable revenue.
            </p>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              We leverage data-driven marketing, rigorous vetting processes, and a proprietary CRM system to deliver a seamless pipeline of opportunities directly to your team.
            </p>
            <ul className="space-y-4">
              {[
                'Exclusive, never-shared leads',
                'Real-time delivery to your dashboard',
                'Dedicated account management',
                'Transparent pricing matrix'
              ].map((item, i) => (
                <li key={i} className="flex items-center text-gray-800 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}