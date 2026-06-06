"use client";
import React from 'react';
import { X, Calendar as CalendarIcon, User } from 'lucide-react';
import { Lead } from '../../../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, leads }) => {
  if (!isOpen) return null;

  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start, end });

  // Filter leads that have a booking date
  const bookedLeads = leads.filter(l => l.booking_date);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start mb-6">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Booked Appointments - {format(today, 'MMMM yyyy')}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Overview of all your scheduled lead appointments for this month.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 gap-px border-b border-gray-200 bg-gray-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {daysInMonth.map((day, dayIdx) => {
                const dayLeads = bookedLeads.filter(l => isSameDay(new Date(l.booking_date!), day));
                const isFirstDay = dayIdx === 0;
                const startingColSpan = isFirstDay ? day.getDay() + 1 : 1;

                return (
                  <div 
                    key={day.toISOString()} 
                    className={`min-h-[100px] bg-white px-2 py-2 ${isFirstDay ? `col-start-${startingColSpan}` : ''}`}
                  >
                    <p className={`text-sm font-medium ${isSameDay(day, today) ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </p>
                    <div className="mt-1 space-y-1">
                      {dayLeads.map(lead => (
                        <div key={lead.id} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 flex items-center truncate">
                          <User className="w-3 h-3 mr-1" />
                          <span className="truncate">{lead.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};