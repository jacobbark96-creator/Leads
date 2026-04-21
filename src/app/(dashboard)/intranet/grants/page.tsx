"use client";
import React from 'react';
import { ExternalLink, Award } from 'lucide-react';

export default function GrantsInfo() {
  const grants = [
    {
      id: 1,
      title: 'Solar Panel Rebate Program 2024',
      amount: 'Up to $3,000',
      description: 'State-sponsored rebate for residential solar installations. Available for homeowners meeting specific income criteria.',
      deadline: 'Dec 31, 2024',
      status: 'Active',
    },
    {
      id: 2,
      title: 'Commercial Energy Efficiency Grant',
      amount: '$10,000 - $50,000',
      description: 'Federal grant for small to medium businesses upgrading their facilities to renewable energy sources.',
      deadline: 'Rolling',
      status: 'Active',
    },
    {
      id: 3,
      title: 'Asbestos Removal Assistance',
      amount: 'Up to $5,000',
      description: 'Financial assistance program for the safe removal of asbestos from properties built before 1990.',
      deadline: 'Oct 15, 2024',
      status: 'Closing Soon',
    }
  ];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-900">Grants & Funding Information</h2>
          <p className="text-sm text-gray-500">Current grants available for clients to help close sales.</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {grants.map((grant) => (
          <div key={grant.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${grant.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {grant.status}
                </span>
                <Award className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{grant.title}</h3>
              <p className="text-2xl font-bold text-blue-600 mb-4">{grant.amount}</p>
              <p className="text-sm text-gray-500 mb-4">{grant.description}</p>
              <div className="mt-auto">
                <p className="text-sm font-medium text-gray-900">Deadline: <span className="font-normal text-gray-500">{grant.deadline}</span></p>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center">
                View official guidelines
                <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};