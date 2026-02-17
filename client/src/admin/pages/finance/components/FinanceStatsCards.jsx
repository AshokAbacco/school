import React from "react";
import { TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";

function FinanceStatsCards() {
  const stats = [
    {
      label: "Total Revenue",
      value: "$145,230",
      change: "+12.5%",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-500",
    },
    {
      label: "Total Expenses",
      value: "$89,400",
      change: "+5.2%",
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-500",
    },
    {
      label: "Net Balance",
      value: "$55,830",
      change: "+8.1%",
      icon: Wallet,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-500",
    },
    {
      label: "Pending Fees",
      value: "$12,450",
      change: "34 Invoices",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${stat.borderColor}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stat.value}
              </p>
              <p className={`text-xs mt-1 ${stat.color}`}>{stat.change}</p>
            </div>
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default FinanceStatsCards;
