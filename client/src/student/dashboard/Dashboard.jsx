import React from 'react';
import { BookOpen, Calendar, Trophy, Clock, TrendingUp, TrendingDown, MoreVertical, ArrowUpRight, User, Award, CheckCircle, AlertCircle } from 'lucide-react';
import PageLayout from '../components/PageLayout';

function StudentDashboard() {
  const stats = [
    { 
      label: 'Overall GPA', 
      value: '3.8', 
      change: '+0.2', 
      trend: 'up',
      icon: Trophy, 
      gradient: 'from-blue-500 to-indigo-600',
    },
    { 
      label: 'Courses Enrolled', 
      value: '6', 
      change: '+1', 
      trend: 'up',
      icon: BookOpen, 
      gradient: 'from-purple-500 to-pink-600',
    },
    { 
      label: 'Attendance Rate', 
      value: '94%', 
      change: '-2%', 
      trend: 'down',
      icon: CheckCircle, 
      gradient: 'from-green-500 to-emerald-600',
    },
    { 
      label: 'Pending Tasks', 
      value: '12', 
      change: '-3', 
      trend: 'down',
      icon: Clock, 
      gradient: 'from-orange-500 to-red-600',
    },
  ];

  const recentGrades = [
    { subject: 'Mathematics', assignment: 'Calculus Test', grade: 'A', score: 92, date: 'Feb 15, 2026' },
    { subject: 'Physics', assignment: 'Lab Report #3', grade: 'B+', score: 87, date: 'Feb 14, 2026' },
    { subject: 'English', assignment: 'Essay - Modern Literature', grade: 'A-', score: 90, date: 'Feb 12, 2026' },
    { subject: 'Chemistry', assignment: 'Mid-term Exam', grade: 'B', score: 83, date: 'Feb 10, 2026' },
    { subject: 'History', assignment: 'Research Paper', grade: 'A', score: 95, date: 'Feb 8, 2026' },
  ];

  const upcomingAssignments = [
    { title: 'Physics Assignment - Newton\'s Laws', dueDate: 'Feb 19, 2026', time: '11:59 PM', priority: 'high' },
    { title: 'Math Homework - Chapter 7', dueDate: 'Feb 21, 2026', time: '11:59 PM', priority: 'medium' },
    { title: 'English Essay - Poetry Analysis', dueDate: 'Feb 23, 2026', time: '11:59 PM', priority: 'medium' },
    { title: 'Chemistry Lab Report', dueDate: 'Feb 25, 2026', time: '11:59 PM', priority: 'low' },
  ];

  const todaySchedule = [
    { subject: 'Mathematics', time: '8:00 AM - 9:30 AM', teacher: 'Mr. Anderson', room: 'Room 204', status: 'completed' },
    { subject: 'Physics', time: '9:45 AM - 11:15 AM', teacher: 'Dr. Wilson', room: 'Lab 3', status: 'completed' },
    { subject: 'English', time: '11:30 AM - 1:00 PM', teacher: 'Ms. Davis', room: 'Room 312', status: 'current' },
    { subject: 'Chemistry', time: '2:00 PM - 3:30 PM', teacher: 'Prof. Brown', room: 'Lab 1', status: 'upcoming' },
  ];

  const getGradeColor = (score) => {
    if (score >= 90) return 'from-green-500 to-emerald-600';
    if (score >= 80) return 'from-blue-500 to-indigo-600';
    if (score >= 70) return 'from-purple-500 to-pink-600';
    return 'from-orange-500 to-red-600';
  };

  return (
    <PageLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Welcome back, Emma! 👋</h1>
              <p className="text-blue-100 mt-2">Here's your academic overview for today</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <div>
                <p className="text-sm text-blue-100">Today</p>
                <p className="font-semibold">Tuesday, Feb 17, 2026</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className={`bg-gradient-to-br ${stat.gradient} w-14 h-14 rounded-xl flex items-center justify-center shadow-md`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <span className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${
                  stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wide">{stat.label}</h3>
              <p className="text-4xl font-bold text-gray-800 mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Grades */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Recent Grades</h3>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-md">
                View All
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {recentGrades.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all border-l-4 border-transparent hover:border-blue-600 group">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-14 h-14 bg-gradient-to-br ${getGradeColor(item.score)} rounded-xl flex items-center justify-center text-white font-bold shadow-md`}>
                        {item.grade}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-lg">{item.subject}</p>
                        <p className="text-sm text-gray-500">{item.assignment}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-800">{item.score}<span className="text-sm text-gray-500">%</span></p>
                        <p className="text-xs text-gray-400">{item.date}</p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Assignments */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Upcoming</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {upcomingAssignments.map((assignment, idx) => (
                  <div key={idx} className="group cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 -mx-2 px-2 py-3 rounded-xl transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-sm text-gray-800 flex-1 leading-tight">{assignment.title}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                        assignment.priority === 'high' ? 'bg-red-100 text-red-700' : 
                        assignment.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {assignment.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <p className="text-xs font-medium">{assignment.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 mt-1">
                      <Clock className="w-4 h-4" />
                      <p className="text-xs">{assignment.time}</p>
                    </div>
                    {idx < upcomingAssignments.length - 1 && (
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mt-4"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Today's Schedule</h3>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1 hover:underline">
              Full Schedule <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todaySchedule.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {item.subject.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-gray-800">{item.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.teacher}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{item.room}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        item.status === 'completed' ? 'bg-gray-100 text-gray-700' : 
                        item.status === 'current' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-600' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default StudentDashboard;