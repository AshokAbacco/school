import React from "react";
import {
  Mail,
  Phone,
  Shield,
  School,
  User,
  BadgeDollarSign,
} from "lucide-react";

export default function FinanceProfile() {
  const auth = JSON.parse(localStorage.getItem("auth"));
  const user = auth?.user;

  return (
    <div className="min-h-screen bg-[#f6f9fc] p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#e8eef5] p-8 mb-6">
          <div className="flex items-center gap-5">

            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#88BDF2] to-[#5d7fa3] flex items-center justify-center text-white text-3xl font-bold">
              {user?.name?.charAt(0)}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-[#384959]">
                {user?.name || "Finance User"}
              </h1>

              <p className="text-[#6A89A7] mt-1">
                {user?.role || "FINANCE"}
              </p>

              <div className="mt-3 inline-flex items-center gap-2 bg-[#eef5fc] px-4 py-2 rounded-xl text-sm text-[#384959]">
                <BadgeDollarSign size={16} />
                Finance Department Access
              </div>
            </div>

          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Personal */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8eef5]">
            <h2 className="text-lg font-semibold text-[#384959] mb-5">
              Personal Information
            </h2>

            <div className="space-y-4">

              <div className="flex items-center gap-3">
                <User className="text-[#88BDF2]" size={18} />
                <div>
                  <p className="text-xs text-[#6A89A7]">Full Name</p>
                  <p className="font-medium text-[#384959]">
                    {user?.name || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="text-[#88BDF2]" size={18} />
                <div>
                  <p className="text-xs text-[#6A89A7]">Email Address</p>
                  <p className="font-medium text-[#384959]">
                    {user?.email || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="text-[#88BDF2]" size={18} />
                <div>
                  <p className="text-xs text-[#6A89A7]">Phone Number</p>
                  <p className="font-medium text-[#384959]">
                    {user?.phone || "-"}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* School Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8eef5]">
            <h2 className="text-lg font-semibold text-[#384959] mb-5">
              School Information
            </h2>

            <div className="space-y-4">

              <div className="flex items-center gap-3">
                <School className="text-[#88BDF2]" size={18} />
                <div>
                  <p className="text-xs text-[#6A89A7]">School Name</p>
                  <p className="font-medium text-[#384959]">
                    {user?.school?.name || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="text-[#88BDF2]" size={18} />
                <div>
                  <p className="text-xs text-[#6A89A7]">Role</p>
                  <p className="font-medium text-[#384959]">
                    {user?.role || "-"}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}