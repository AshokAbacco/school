import React, { useState } from 'react';
import { BookOpen, TrendingUp, Award, FileText, BarChart3, Target, Star, ChevronDown } from 'lucide-react';
import PageLayout from '../../components/PageLayout';

function MarksResults() {
  const [selectedTerm, setSelectedTerm] = useState('Term 2 - 2025-26');

  const subjectMarks = [
    { subject: 'Mathematics', obtained: 92, total: 100, grade: 'A+', percentage: 92, teacher: 'Mr. Smith' },
    { subject: 'Science', obtained: 88, total: 100, grade: 'A+', percentage: 88, teacher: 'Ms. Johnson' },
    { subject: 'English', obtained: 85, total: 100, grade: 'A', percentage: 85, teacher: 'Mrs. Williams' },
    { subject: 'Social Studies', obtained: 90, total: 100, grade: 'A+', percentage: 90, teacher: 'Mr. Brown' },
    { subject: 'Hindi', obtained: 78, total: 100, grade: 'B+', percentage: 78, teacher: 'Ms. Sharma' },
    { subject: 'Computer Science', obtained: 95, total: 100, grade: 'A+', percentage: 95, teacher: 'Mr. Kumar' },
    { subject: 'Physical Education', obtained: 82, total: 100, grade: 'A', percentage: 82, teacher: 'Coach Davis' },
    { subject: 'Art & Craft', obtained: 87, total: 100, grade: 'A', percentage: 87, teacher: 'Ms. Lee' },
  ];

  const overallStats = {
    totalMarks: 697,
    maxMarks: 800,
    percentage: 87.13,
    grade: 'A',
    rank: 21,
    totalStudents: 150
  };

  const termResults = [
    { term: 'Term 1 - 2025-26', percentage: 85.5, grade: 'A', rank: 23 },
    { term: 'Term 2 - 2025-26', percentage: 87.13, grade: 'A', rank: 21 },
  ];

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-700 border-green-500';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700 border-blue-500';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-700 border-yellow-500';
    return 'bg-red-100 text-red-700 border-red-500';
  };

  const getPercentageColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    if (percentage >= 75) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (percentage >= 60) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    return 'bg-gradient-to-r from-red-500 to-pink-500';
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold">Marks & Results</h1>
              <p className="text-blue-100 mt-1">Student XYZ Surname - SLC20252026 - Grade 10 Section A</p>
            </div>
          </div>
          <select 
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-4 py-2 bg-white text-gray-800 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {termResults.map((term) => (
              <option key={term.term} value={term.term}>{term.term}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overall Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Marks</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{overallStats.totalMarks}/{overallStats.maxMarks}</p>
            </div>
            <FileText className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Percentage</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{overallStats.percentage}%</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Overall Grade</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{overallStats.grade}</p>
            </div>
            <Star className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Class Rank</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">#{overallStats.rank}</p>
              <p className="text-xs text-gray-500 mt-1">of {overallStats.totalStudents} students</p>
            </div>
            <Award className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject-wise Marks */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Subject-wise Performance
          </h2>
          
          <div className="space-y-4">
            {subjectMarks.map((subject, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{subject.subject}</h3>
                    <p className="text-xs text-gray-500 mt-1">Teacher: {subject.teacher}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getPercentageColor(subject.percentage)}`}>
                        {subject.obtained}/{subject.total}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{subject.percentage}%</p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg border-2 ${getGradeColor(subject.grade)} font-bold text-lg min-w-[60px] text-center`}>
                      {subject.grade}
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full ${getProgressBarColor(subject.percentage)} transition-all duration-500`}
                    style={{ width: `${subject.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Analysis */}
        <div className="space-y-6">
          {/* Grade Distribution */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Grade Distribution
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-sm">A+</div>
                  <span className="text-sm text-gray-600">Excellent</span>
                </div>
                <span className="font-bold text-gray-800">5 subjects</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm">A</div>
                  <span className="text-sm text-gray-600">Very Good</span>
                </div>
                <span className="font-bold text-gray-800">2 subjects</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center text-white font-bold text-sm">B+</div>
                  <span className="text-sm text-gray-600">Good</span>
                </div>
                <span className="font-bold text-gray-800">1 subject</span>
              </div>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600" />
              Performance Insights
            </h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p className="text-green-800 font-semibold text-sm mb-2">🏆 Top Performers</p>
                <ul className="text-green-700 text-xs space-y-1">
                  <li>• Computer Science (95%)</li>
                  <li>• Mathematics (92%)</li>
                  <li>• Social Studies (90%)</li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p className="text-yellow-800 font-semibold text-sm mb-2">📈 Room for Improvement</p>
                <ul className="text-yellow-700 text-xs space-y-1">
                  <li>• Hindi (78%)</li>
                  <li>• Focus on grammar & comprehension</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-blue-800 font-semibold text-sm mb-2">💡 Teacher's Recommendation</p>
                <p className="text-blue-700 text-xs">Excellent overall performance! Keep up the consistent effort in all subjects.</p>
              </div>
            </div>
          </div>

          {/* Term Comparison */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Term Comparison
            </h2>
            
            <div className="space-y-3">
              {termResults.map((term, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">{term.term}</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(term.grade)}`}>
                      {term.grade}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Percentage: <span className="font-bold text-blue-600">{term.percentage}%</span></span>
                    <span className="text-gray-600">Rank: <span className="font-bold text-orange-600">#{term.rank}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Download Report Button */}
      <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Download Report Card</h3>
            <p className="text-sm text-gray-600 mt-1">Get your detailed performance report in PDF format</p>
          </div>
          <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-8 rounded-xl font-semibold transition shadow-md hover:shadow-lg transform hover:-translate-y-1 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Download Report
          </button>
        </div>
      </div>
    </PageLayout>
  );
}

export default MarksResults;