import React from 'react';
import { Award, Download, Calendar, Trophy, Star, Medal } from 'lucide-react';
import PageLayout from '../../components/PageLayout';

function Certificates() {
  const certificates = [
    {
      title: 'Academic Excellence Award',
      issuedBy: 'School Principal',
      date: 'March 15, 2026',
      category: 'Academic',
      description: 'For outstanding academic performance in Grade 10',
      color: 'blue',
      icon: Trophy
    },
    {
      title: 'Basketball Championship Winner',
      issuedBy: 'Sports Department',
      date: 'January 20, 2026',
      category: 'Sports',
      description: 'District Level Basketball Tournament - 1st Place',
      color: 'blue',
      icon: Medal
    },
    {
      title: 'Best Speaker Award',
      issuedBy: 'English Department',
      date: 'November 10, 2025',
      category: 'Debate',
      description: 'Inter-School Debate Competition',
      color: 'purple',
      icon: Star
    },
    {
      title: 'Science Fair Participation',
      issuedBy: 'Science Club',
      date: 'December 5, 2025',
      category: 'Academic',
      description: 'National Science Exhibition - 2nd Place',
      color: 'green',
      icon: Award
    },
    {
      title: 'Perfect Attendance',
      issuedBy: 'School Administration',
      date: 'February 28, 2026',
      category: 'Attendance',
      description: 'For maintaining 100% attendance in Term 1',
      color: 'teal',
      icon: Star
    },
    {
      title: 'Music Concert Performance',
      issuedBy: 'Music Department',
      date: 'October 15, 2025',
      category: 'Arts',
      description: 'Annual Music Concert Lead Performer',
      color: 'pink',
      icon: Trophy
    },
    {
      title: 'Community Service Award',
      issuedBy: 'Social Welfare Club',
      date: 'September 20, 2025',
      category: 'Social',
      description: 'For 50+ hours of community service',
      color: 'indigo',
      icon: Award
    },
    {
      title: 'Mathematics Olympiad',
      issuedBy: 'Mathematics Department',
      date: 'August 12, 2025',
      category: 'Academic',
      description: 'State Level Mathematics Competition - Qualifier',
      color: 'blue',
      icon: Medal
    },
  ];

  const stats = {
    total: certificates.length,
    academic: certificates.filter(c => c.category === 'Academic').length,
    sports: certificates.filter(c => c.category === 'Sports').length,
    arts: certificates.filter(c => c.category === 'Arts').length,
  };

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-500',
    // blue: 'from-blue-500 to-blue-600 border-blue-500',
    purple: 'from-purple-500 to-purple-600 border-purple-500',
    green: 'from-green-500 to-green-600 border-green-500',
    teal: 'from-teal-500 to-teal-600 border-teal-500',
    pink: 'from-pink-500 to-pink-600 border-pink-500',
    indigo: 'from-indigo-500 to-indigo-600 border-indigo-500',
    // blue: 'from-blue-500 to-blue-600 border-blue-500',
  };

  return (
    <PageLayout>
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold">Certificates & Awards</h1>
              <p className="text-blue-100 mt-1">Student XYZ Surname - SLC20252026</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-blue-100 text-sm">Total Certificates</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Awards</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p>
            </div>
            <Trophy className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Academic</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.academic}</p>
            </div>
            <Award className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Sports</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.sports}</p>
            </div>
            <Medal className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Arts & Others</p>
              <p className="text-3xl font-bold text-pink-600 mt-2">{stats.arts}</p>
            </div>
            <Star className="w-12 h-12 text-pink-500 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">All Certificates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert, index) => {
            const Icon = cert.icon;
            return (
              <div
                key={index}
                className={`relative rounded-xl border-l-4 ${colorClasses[cert.color]} bg-gradient-to-br from-gray-50 to-white p-5 hover:shadow-lg transition overflow-hidden`}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-r ${colorClasses[cert.color]} opacity-10 rounded-bl-full`}></div>

                <div className="relative">
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${colorClasses[cert.color]} mb-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="font-bold text-gray-800 text-lg mb-2">{cert.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{cert.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Award className="w-4 h-4" />
                      <span>Issued by: {cert.issuedBy}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{cert.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r ${colorClasses[cert.color]} text-white`}>
                      {cert.category}
                    </span>
                    <button className="text-gray-600 hover:text-blue-600 transition">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <Download className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Download All Certificates</h3>
              <p className="text-sm text-gray-600 mt-1">Get all your certificates in a single PDF file</p>
            </div>
          </div>
          <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-8 rounded-xl font-semibold transition shadow-md hover:shadow-lg transform hover:-translate-y-1">
            Download All
          </button>
        </div>
      </div>
    </PageLayout>
  );
}

export default Certificates;