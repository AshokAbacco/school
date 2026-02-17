import React, { useState } from 'react';
import { Mail, Phone, MapPin, Calendar, Award, BookOpen, User, Users, FileText, Download, Heart, Activity, Droplet, Ruler, Weight } from 'lucide-react';
import PageLayout from '../components/PageLayout';

function Profile() {
  const [activeTab, setActiveTab] = useState('personalinfo');

  const InfoCard = ({ icon: Icon, label, value, color = 'blue' }) => (
    <div className={`bg-gradient-to-r from-${color}-50 to-${color}-100 p-4 rounded-xl border-l-4 border-${color}-600 hover:shadow-md transition`}>
      <div className="flex items-center gap-3">
        <div className={`bg-${color}-600 p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium">{label}</div>
          <div className="text-gray-800 font-bold">{value}</div>
        </div>
      </div>
    </div>
  );

  const DocumentCard = ({ icon: Icon, label, status, date, statusColor }) => {
    const colors = { green: 'bg-green-100 text-green-700', yellow: 'bg-yellow-100 text-yellow-700', red: 'bg-red-100 text-red-700' };
    return (
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border-l-4 border-blue-600 hover:shadow-md transition">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><Icon className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-sm font-bold text-gray-800">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{date}</div>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${colors[statusColor]}`}>{status}</span>
            </div>
          </div>
          {status === "Verified" && <Download className="w-4 h-4 text-blue-600 cursor-pointer hover:text-blue-800" />}
        </div>
      </div>
    );
  };

  const PersonalInfoContent = () => (
    <div className="lg:col-span-2">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-3 border-b-2 border-blue-600">
        <BookOpen className="w-7 h-7 text-blue-600" />Personal Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard icon={Award} label="Student ID" value="SLC20252026" />
        <InfoCard icon={User} label="Full Name" value="Student XYZ Surname" />
        <InfoCard icon={Calendar} label="Date of Birth" value="15/05/2010" />
        <InfoCard icon={Users} label="Father's Name" value="XYZ" />
        <InfoCard icon={Users} label="Mother's Name" value="ABC" />
        <InfoCard icon={Phone} label="Mobile Number" value="9874563210" />
        <div className="md:col-span-2"><InfoCard icon={Mail} label="Email Address" value="firstlast@gmail.com" /></div>
        <div className="md:col-span-2"><InfoCard icon={MapPin} label="Current Address" value="123 Main Street, City, State - 123456" /></div>
        <div className="md:col-span-2"><InfoCard icon={MapPin} label="Permanent Address" value="456 Oak Avenue, Town, State - 654321" /></div>
      </div>
    </div>
  );

  const DocumentInfoContent = () => (
    <div className="lg:col-span-2">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-3 border-b-2 border-blue-600">
        <FileText className="w-7 h-7 text-blue-600" />Document Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DocumentCard icon={FileText} label="Birth Certificate" status="Verified" date="Uploaded: 01/01/2024" statusColor="green" />
        <DocumentCard icon={FileText} label="Transfer Certificate" status="Verified" date="Uploaded: 15/02/2024" statusColor="green" />
        <DocumentCard icon={FileText} label="Aadhar Card" status="Verified" date="Uploaded: 10/01/2024" statusColor="green" />
        <DocumentCard icon={FileText} label="Previous Marksheet" status="Pending" date="Uploaded: 20/02/2024" statusColor="yellow" />
        <DocumentCard icon={FileText} label="Caste Certificate" status="Verified" date="Uploaded: 05/01/2024" statusColor="green" />
        <DocumentCard icon={FileText} label="Income Certificate" status="Not Uploaded" date="Required" statusColor="red" />
      </div>
    </div>
  );

  const HealthContent = () => (
    <div className="lg:col-span-2">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-3 border-b-2 border-red-600">
        <Heart className="w-7 h-7 text-red-600" />Health Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard icon={Ruler} label="Height" value="165 cm" color="red" />
        <InfoCard icon={Weight} label="Weight" value="55 kg" color="red" />
        <InfoCard icon={Droplet} label="Blood Group" value="O+" color="red" />
        <InfoCard icon={Activity} label="BMI" value="20.2 (Normal)" color="red" />
        <div className="md:col-span-2"><InfoCard icon={FileText} label="Allergies" value="None Reported" color="red" /></div>
        <div className="md:col-span-2"><InfoCard icon={Heart} label="Medical Conditions" value="None" color="red" /></div>
        <div className="md:col-span-2"><InfoCard icon={FileText} label="Emergency Contact" value="Parent - 9874563210" color="red" /></div>
        <div className="md:col-span-2"><InfoCard icon={Calendar} label="Last Checkup" value="15/01/2025" color="red" /></div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'personalinfo': return <PersonalInfoContent />;
      case 'documentinfo': return <DocumentInfoContent />;
      case 'health': return <HealthContent />;
      default: return <PersonalInfoContent />;
    }
  };

  return (
    <PageLayout>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-4 mb-6 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8" />
          <span className="text-xl font-bold">Class Rank 21</span>
        </div>
        <div className="flex gap-2">
          {['Personal Info', 'Document Info', 'Health'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase().replace(' ', ''))}
              className={`px-6 py-2 rounded-full transition ${activeTab === tab.toLowerCase().replace(' ', '') ? 'bg-white text-blue-600 font-semibold' : 'bg-blue-500 hover:bg-blue-400'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
          <div className="flex flex-col items-center justify-start">
            <div className="relative mb-6">
              <div className="w-64 h-64 rounded-full overflow-hidden border-8 border-blue-100 shadow-lg">
                <img src="https://img.freepik.com/premium-photo/3d-avatar-cartoon-character_113255-103130.jpg" alt="Student" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold text-gray-800">Student XYZ Surname</h2>
              <p className="text-gray-500 mt-1 font-medium">Grade 10 - Section A</p>
              <p className="text-blue-600 font-semibold mt-1">SLC20252026</p>
              <div className="flex gap-2 mt-4 justify-center flex-wrap">
                <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-semibold">Active</span>
                <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold">Honor Roll</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600">96.5%</div>
                  <div className="text-xs text-gray-600 mt-1">Attendance</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-indigo-600">3.85</div>
                  <div className="text-xs text-gray-600 mt-1">GPA</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-purple-600">8</div>
                  <div className="text-xs text-gray-600 mt-1">Subjects</div>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-pink-600">12</div>
                  <div className="text-xs text-gray-600 mt-1">Activities</div>
                </div>
              </div>
            </div>
          </div>
          {renderContent()}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['View Grades', 'Download ID', 'Update Info', 'Contact Teacher'].map((action) => (
            <button key={action} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-xl font-semibold transition shadow-md hover:shadow-lg transform hover:-translate-y-1">
              {action}
            </button>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

export default Profile;