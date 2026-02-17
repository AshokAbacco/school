import React, { useState } from 'react';
import { Clock, Calendar, BookOpen, Coffee } from 'lucide-react';
import PageLayout from '../../components/PageLayout';

function TimeTable() {
  const [selectedDay, setSelectedDay] = useState('Monday');
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const schedule = {
    Monday: [
      { time: '08:00 - 08:45', subject: 'Mathematics', teacher: 'Mr. Smith', room: '101' },
      { time: '08:45 - 09:30', subject: 'Science', teacher: 'Ms. Johnson', room: '204' },
      { time: '09:30 - 10:15', subject: 'English', teacher: 'Mrs. Williams', room: '105' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'Social Studies', teacher: 'Mr. Brown', room: '203' },
      { time: '11:15 - 12:00', subject: 'Hindi', teacher: 'Ms. Sharma', room: '107' },
      { time: '12:00 - 12:45', subject: 'Computer Science', teacher: 'Mr. Kumar', room: 'Lab 1' },
      { time: '12:45 - 01:30', subject: 'Lunch Break', teacher: '-', room: '-' },
      { time: '01:30 - 02:15', subject: 'Physical Education', teacher: 'Coach Davis', room: 'Ground' },
      { time: '02:15 - 03:00', subject: 'Art & Craft', teacher: 'Ms. Lee', room: '109' },
    ],
    Tuesday: [
      { time: '08:00 - 08:45', subject: 'Science', teacher: 'Ms. Johnson', room: '204' },
      { time: '08:45 - 09:30', subject: 'Mathematics', teacher: 'Mr. Smith', room: '101' },
      { time: '09:30 - 10:15', subject: 'Hindi', teacher: 'Ms. Sharma', room: '107' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'English', teacher: 'Mrs. Williams', room: '105' },
      { time: '11:15 - 12:00', subject: 'Computer Science', teacher: 'Mr. Kumar', room: 'Lab 1' },
      { time: '12:00 - 12:45', subject: 'Social Studies', teacher: 'Mr. Brown', room: '203' },
      { time: '12:45 - 01:30', subject: 'Lunch Break', teacher: '-', room: '-' },
      { time: '01:30 - 02:15', subject: 'Art & Craft', teacher: 'Ms. Lee', room: '109' },
      { time: '02:15 - 03:00', subject: 'Library', teacher: 'Mrs. Clark', room: 'Library' },
    ],
    Wednesday: [
      { time: '08:00 - 08:45', subject: 'Mathematics', teacher: 'Mr. Smith', room: '101' },
      { time: '08:45 - 09:30', subject: 'English', teacher: 'Mrs. Williams', room: '105' },
      { time: '09:30 - 10:15', subject: 'Science', teacher: 'Ms. Johnson', room: '204' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'Computer Science', teacher: 'Mr. Kumar', room: 'Lab 1' },
      { time: '11:15 - 12:00', subject: 'Hindi', teacher: 'Ms. Sharma', room: '107' },
      { time: '12:00 - 12:45', subject: 'Social Studies', teacher: 'Mr. Brown', room: '203' },
      { time: '12:45 - 01:30', subject: 'Lunch Break', teacher: '-', room: '-' },
      { time: '01:30 - 02:15', subject: 'Physical Education', teacher: 'Coach Davis', room: 'Ground' },
      { time: '02:15 - 03:00', subject: 'Music', teacher: 'Mr. Anderson', room: '110' },
    ],
    Thursday: [
      { time: '08:00 - 08:45', subject: 'English', teacher: 'Mrs. Williams', room: '105' },
      { time: '08:45 - 09:30', subject: 'Mathematics', teacher: 'Mr. Smith', room: '101' },
      { time: '09:30 - 10:15', subject: 'Social Studies', teacher: 'Mr. Brown', room: '203' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'Science', teacher: 'Ms. Johnson', room: '204' },
      { time: '11:15 - 12:00', subject: 'Computer Science', teacher: 'Mr. Kumar', room: 'Lab 1' },
      { time: '12:00 - 12:45', subject: 'Hindi', teacher: 'Ms. Sharma', room: '107' },
      { time: '12:45 - 01:30', subject: 'Lunch Break', teacher: '-', room: '-' },
      { time: '01:30 - 02:15', subject: 'Art & Craft', teacher: 'Ms. Lee', room: '109' },
      { time: '02:15 - 03:00', subject: 'Physical Education', teacher: 'Coach Davis', room: 'Ground' },
    ],
    Friday: [
      { time: '08:00 - 08:45', subject: 'Science', teacher: 'Ms. Johnson', room: '204' },
      { time: '08:45 - 09:30', subject: 'Mathematics', teacher: 'Mr. Smith', room: '101' },
      { time: '09:30 - 10:15', subject: 'Hindi', teacher: 'Ms. Sharma', room: '107' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'English', teacher: 'Mrs. Williams', room: '105' },
      { time: '11:15 - 12:00', subject: 'Social Studies', teacher: 'Mr. Brown', room: '203' },
      { time: '12:00 - 12:45', subject: 'Computer Science', teacher: 'Mr. Kumar', room: 'Lab 1' },
      { time: '12:45 - 01:30', subject: 'Lunch Break', teacher: '-', room: '-' },
      { time: '01:30 - 02:15', subject: 'Club Activities', teacher: 'Various', room: 'Various' },
      { time: '02:15 - 03:00', subject: 'Sports', teacher: 'Coach Davis', room: 'Ground' },
    ],
    Saturday: [
      { time: '08:00 - 08:45', subject: 'Mathematics', teacher: 'Mr. Smith', room: '101' },
      { time: '08:45 - 09:30', subject: 'Science', teacher: 'Ms. Johnson', room: '204' },
      { time: '09:30 - 10:15', subject: 'English', teacher: 'Mrs. Williams', room: '105' },
      { time: '10:15 - 10:30', subject: 'Break', teacher: '-', room: '-' },
      { time: '10:30 - 11:15', subject: 'Extra Class', teacher: 'Various', room: 'Various' },
      { time: '11:15 - 12:00', subject: 'Library', teacher: 'Mrs. Clark', room: 'Library' },
    ],
  };

  const currentSchedule = schedule[selectedDay] || [];

  return (
    <PageLayout>
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Calendar className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-bold">Class Time Table</h1>
            <p className="text-blue-100 mt-1">Grade 10 - Section A | Academic Year 2025-26</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-6 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
                selectedDay === day
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {currentSchedule.map((period, index) => {
            const isBreak = period.subject.includes('Break');
            return (
              <div
                key={index}
                className={`p-4 rounded-xl border-l-4 transition hover:shadow-md ${
                  isBreak
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <Clock className={`w-5 h-5 ${isBreak ? 'text-orange-600' : 'text-blue-600'}`} />
                      <span className="font-semibold text-gray-700">{period.time}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isBreak ? (
                        <Coffee className="w-5 h-5 text-orange-600" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      )}
                      <span className="font-bold text-gray-800 text-lg">{period.subject}</span>
                    </div>
                  </div>

                  {!isBreak && (
                    <div className="flex gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-gray-500 text-xs">Teacher</p>
                        <p className="font-semibold text-gray-800">{period.teacher}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-xs">Room</p>
                        <p className="font-semibold text-blue-600">{period.room}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm">Total Periods</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">10</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
          <p className="text-gray-600 text-sm">Class Timing</p>
          <p className="text-2xl font-bold text-green-600 mt-1">8:00 AM - 3:00 PM</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
          <p className="text-gray-600 text-sm">Working Days</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">6 Days/Week</p>
        </div>
      </div>
    </PageLayout>
  );
}

export default TimeTable;