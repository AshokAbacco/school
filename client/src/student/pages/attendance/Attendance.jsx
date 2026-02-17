import React, { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, Award, AlertCircle } from 'lucide-react';
import PageLayout from '../../components/PageLayout';

function Attendance() {
  const [selectedMonth, setSelectedMonth] = useState('February 2026');

  // Sample attendance data
  const attendanceStats = {
    totalDays: 20,
    present: 19,
    absent: 1,
    late: 2,
    percentage: 95.0
  };

  const monthlyAttendance = [
    { date: '01', day: 'Mon', status: 'present' },
    { date: '02', day: 'Tue', status: 'present' },
    { date: '03', day: 'Wed', status: 'present' },
    { date: '04', day: 'Thu', status: 'present' },
    { date: '05', day: 'Fri', status: 'present' },
    { date: '06', day: 'Sat', status: 'holiday' },
    { date: '07', day: 'Sun', status: 'holiday' },
    { date: '08', day: 'Mon', status: 'present' },
    { date: '09', day: 'Tue', status: 'absent' },
    { date: '10', day: 'Wed', status: 'present' },
    { date: '11', day: 'Thu', status: 'present' },
    { date: '12', day: 'Fri', status: 'late' },
    { date: '13', day: 'Sat', status: 'holiday' },
    { date: '14', day: 'Sun', status: 'holiday' },
    { date: '15', day: 'Mon', status: 'present' },
    { date: '16', day: 'Tue', status: 'present' },
    { date: '17', day: 'Wed', status: 'present' },
    { date: '18', day: 'Thu', status: 'present' },
    { date: '19', day: 'Fri', status: 'late' },
    { date: '20', day: 'Sat', status: 'holiday' },
  ];

  const recentRecords = [
    { date: '17 Feb 2026', day: 'Wednesday', checkIn: '08:45 AM', checkOut: '03:30 PM', status: 'present' },
    { date: '16 Feb 2026', day: 'Tuesday', checkIn: '08:42 AM', checkOut: '03:28 PM', status: 'present' },
    { date: '15 Feb 2026', day: 'Monday', checkIn: '08:50 AM', checkOut: '03:35 PM', status: 'present' },
    { date: '12 Feb 2026', day: 'Friday', checkIn: '09:15 AM', checkOut: '03:30 PM', status: 'late' },
    { date: '11 Feb 2026', day: 'Thursday', checkIn: '08:40 AM', checkOut: '03:25 PM', status: 'present' },
    { date: '09 Feb 2026', day: 'Tuesday', checkIn: '-', checkOut: '-', status: 'absent' },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'late': return 'bg-yellow-500';
      case 'holiday': return 'bg-gray-300';
      default: return 'bg-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'present': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'absent': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'late': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return null;
    }
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold">Attendance Tracker</h1>
              <p className="text-blue-100 mt-1">Student XYZ Surname - SLC20252026</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{attendanceStats.percentage}%</div>
            <div className="text-blue-100 text-sm">Overall Attendance</div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Present Days</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{attendanceStats.present}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Absent Days</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{attendanceStats.absent}</p>
            </div>
            <XCircle className="w-12 h-12 text-red-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Late Arrivals</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{attendanceStats.late}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Days</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{attendanceStats.totalDays}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Monthly Calendar
            </h2>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>February 2026</option>
              <option>January 2026</option>
              <option>December 2025</option>
            </select>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
            
            {monthlyAttendance.map((item, index) => (
              <div key={index} className="aspect-square">
                <div className={`h-full rounded-lg ${getStatusColor(item.status)} flex flex-col items-center justify-center text-white font-semibold text-sm hover:scale-105 transition cursor-pointer`}>
                  <span>{item.date}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-600">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span className="text-sm text-gray-600">Holiday</span>
            </div>
          </div>
        </div>

        {/* Attendance Status */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            Attendance Goal
          </h2>
          
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-blue-600">
                  Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {attendanceStats.percentage}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-blue-100">
              <div style={{width: `${attendanceStats.percentage}%`}} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="text-green-800 font-semibold text-sm">Excellent!</p>
              <p className="text-green-600 text-xs mt-1">You're maintaining great attendance</p>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-blue-800 font-semibold text-sm">Target: 95%</p>
              <p className="text-blue-600 text-xs mt-1">Current status: On Track ✓</p>
            </div>

            {attendanceStats.absent > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p className="text-yellow-800 font-semibold text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Reminder
                </p>
                <p className="text-yellow-600 text-xs mt-1">You have {attendanceStats.absent} absent day(s) this month</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Attendance Records */}
      <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Attendance Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Day</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentRecords.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{record.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.day}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.checkIn}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.checkOut}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.status)}
                      <span className={`text-sm font-semibold capitalize ${
                        record.status === 'present' ? 'text-green-600' :
                        record.status === 'absent' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}

export default Attendance;