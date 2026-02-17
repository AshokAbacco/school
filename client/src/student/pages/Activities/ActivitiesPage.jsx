import React from 'react';
import { Trophy, Music, Palette, Dumbbell, Users, Brain, Camera, Globe } from 'lucide-react';
import PageLayout from '../../components/PageLayout';

function Activities() {
  const activities = [
    {
      name: 'Science Club',
      icon: Brain,
      category: 'Academic',
      schedule: 'Monday & Wednesday, 3:30 PM - 4:30 PM',
      teacher: 'Ms. Johnson',
      enrolled: true,
      color: 'blue',
      description: 'Explore scientific concepts through experiments'
    },
    {
      name: 'Music Band',
      icon: Music,
      category: 'Arts',
      schedule: 'Tuesday & Thursday, 3:30 PM - 5:00 PM',
      teacher: 'Mr. Anderson',
      enrolled: true,
      color: 'blue',
      description: 'Learn instruments and perform in school events'
    },
    {
      name: 'Basketball Team',
      icon: Dumbbell,
      category: 'Sports',
      schedule: 'Daily, 4:00 PM - 5:30 PM',
      teacher: 'Coach Davis',
      enrolled: true,
      color: 'blue',
      description: 'School basketball team training and competitions'
    },
    {
      name: 'Art Club',
      icon: Palette,
      category: 'Arts',
      schedule: 'Friday, 3:30 PM - 5:00 PM',
      teacher: 'Ms. Lee',
      enrolled: false,
      color: 'blue',
      description: 'Painting, sketching, and creative art projects'
    },
    {
      name: 'Debate Society',
      icon: Users,
      category: 'Academic',
      schedule: 'Wednesday, 3:30 PM - 4:30 PM',
      teacher: 'Mrs. Williams',
      enrolled: true,
      color: 'green',
      description: 'Develop public speaking and argumentation skills'
    },
    {
      name: 'Photography Club',
      icon: Camera,
      category: 'Arts',
      schedule: 'Saturday, 10:00 AM - 12:00 PM',
      teacher: 'Mr. Roberts',
      enrolled: false,
      color: 'indigo',
      description: 'Learn photography techniques and editing'
    },
    {
      name: 'Drama Club',
      icon: Users,
      category: 'Arts',
      schedule: 'Tuesday & Friday, 3:30 PM - 5:00 PM',
      teacher: 'Ms. Martinez',
      enrolled: false,
      color: 'red',
      description: 'Theater performances and acting workshops'
    },
    {
      name: 'Quiz Club',
      icon: Brain,
      category: 'Academic',
      schedule: 'Thursday, 3:30 PM - 4:30 PM',
      teacher: 'Mr. Patel',
      enrolled: true,
      color: 'yellow',
      description: 'General knowledge and competitive quizzing'
    },
    {
      name: 'Environmental Club',
      icon: Globe,
      category: 'Social',
      schedule: 'Saturday, 9:00 AM - 11:00 AM',
      teacher: 'Ms. Green',
      enrolled: false,
      color: 'teal',
      description: 'Environmental awareness and sustainability projects'
    },
  ];

  const achievements = [
    { title: 'Basketball - District Championship', position: '1st Place', date: 'Jan 2026' },
    { title: 'Science Fair', position: '2nd Place', date: 'Dec 2025' },
    { title: 'Inter-School Debate', position: 'Best Speaker', date: 'Nov 2025' },
    { title: 'Music Concert Performance', position: 'Participant', date: 'Oct 2025' },
  ];

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-500',
    blue: 'from-blue-500 to-blue-600 border-blue-500',
    blue: 'from-blue-500 to-blue-600 border-blue-500',
    blue: 'from-blue-500 to-blue-600 border-blue-500',
    green: 'from-green-500 to-green-600 border-green-500',
    indigo: 'from-indigo-500 to-indigo-600 border-indigo-500',
    red: 'from-red-500 to-red-600 border-red-500',
    yellow: 'from-yellow-500 to-yellow-600 border-yellow-500',
    teal: 'from-teal-500 to-teal-600 border-teal-500',
  };

  const enrolled = activities.filter(a => a.enrolled);
  const available = activities.filter(a => !a.enrolled);

  return (
    <PageLayout>
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold">Extracurricular Activities</h1>
              <p className="text-blue-100 mt-1">Enrolled in {enrolled.length} activities</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm">Total Activities</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{activities.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <p className="text-gray-600 text-sm">Currently Enrolled</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{enrolled.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm">Achievements</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{achievements.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">My Activities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrolled.map((activity, index) => (
                <div key={index} className={`rounded-xl border-l-4 ${colorClasses[activity.color]} bg-gradient-to-r ${colorClasses[activity.color]} p-4 text-white`}>
                  <div className="flex items-start gap-3">
                    <activity.icon className="w-8 h-8 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{activity.name}</h3>
                      <p className="text-sm opacity-90 mt-1">{activity.description}</p>
                      <p className="text-xs opacity-75 mt-2">{activity.schedule}</p>
                      <p className="text-xs opacity-75 mt-1">Teacher: {activity.teacher}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Available Activities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {available.map((activity, index) => (
                <div key={index} className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${colorClasses[activity.color]}`}>
                      <activity.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{activity.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-2">{activity.schedule}</p>
                      <button className="mt-3 px-4 py-1 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                        Enroll
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-600" />
            Achievements
          </h2>
          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <h3 className="font-bold text-gray-800 text-sm">{achievement.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-semibold">
                    {achievement.position}
                  </span>
                  <span className="text-xs text-gray-500">{achievement.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default Activities;