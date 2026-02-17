import React, { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import FinanceStatsCards from "./components/FinanceStatsCards";
import FinanceTableRow from "./components/FinanceTableRow";

function FinanceList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // Income or Expense
  const [filterStatus, setFilterStatus] = useState("all");

  // Mixed Data: Income and Expenses
  const transactions = [
    {
      id: "TXN-101",
      description: "Tuition Fee - Emma Wilson",
      category: "Fee",
      date: "Mar 15, 2026",
      amount: 1200,
      type: "Income",
      status: "Paid",
    },
    {
      id: "TXN-102",
      description: "Teacher Salary - John Doe",
      category: "Salary",
      date: "Mar 01, 2026",
      amount: 3500,
      type: "Expense",
      status: "Paid",
    },
    {
      id: "TXN-103",
      description: "Library Books Purchase",
      category: "Supplies",
      date: "Mar 12, 2026",
      amount: 450,
      type: "Expense",
      status: "Paid",
    },
    {
      id: "TXN-104",
      description: "Transport Fee - Liam Brown",
      category: "Transport",
      date: "Mar 10, 2026",
      amount: 150,
      type: "Income",
      status: "Pending",
    },
    {
      id: "TXN-105",
      description: "Electricity Bill",
      category: "Utilities",
      date: "Mar 05, 2026",
      amount: 800,
      type: "Expense",
      status: "Paid",
    },
    {
      id: "TXN-106",
      description: "Admission Fee - New Student",
      category: "Admission",
      date: "Mar 18, 2026",
      amount: 500,
      type: "Income",
      status: "Overdue",
    },
    {
      id: "TXN-107",
      description: "Lab Equipment Repair",
      category: "Maintenance",
      date: "Mar 20, 2026",
      amount: 275,
      type: "Expense",
      status: "Pending",
    },
  ];

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" ||
      txn.type.toLowerCase() === filterType.toLowerCase();
    const matchesStatus =
      filterStatus === "all" ||
      txn.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate totals for summary (optional, based on filtered data or all data)
  const totalIncome = transactions
    .filter((t) => t.type === "Income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "Expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Finance & Accounts
            </h1>
            <p className="text-gray-500 mt-1">
              Manage school revenue, expenses, and invoices
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <FinanceStatsCards />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Calendar className="w-4 h-4" />
              <span>Date</span>
            </button>
          </div>
        </div>

        {/* Finance Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((txn) => (
                  <FinanceTableRow key={txn.id} transaction={txn} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">
                {filteredTransactions.length}
              </span>{" "}
              transactions
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                Previous
              </button>
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm">
                1
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                2
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default FinanceList;
