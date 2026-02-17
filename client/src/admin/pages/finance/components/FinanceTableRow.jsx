import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Eye,
  FileText,
  Printer,
} from "lucide-react";

function FinanceTableRow({ transaction }) {
  const isIncome = transaction.type === "Income";

  const getStatusStyle = (status) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-yellow-100 text-yellow-700";
      case "Overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition">
      {/* Transaction Info */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${isIncome ? "bg-green-100" : "bg-red-100"}`}
          >
            {isIncome ? (
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {transaction.description}
            </p>
            <p className="text-xs text-gray-500">ID: #{transaction.id}</p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-6 py-4 hidden md:table-cell">
        <span className="text-sm text-gray-600">{transaction.category}</span>
      </td>

      {/* Date */}
      <td className="px-6 py-4 hidden lg:table-cell">
        <span className="text-sm text-gray-500">{transaction.date}</span>
      </td>

      {/* Amount */}
      <td className="px-6 py-4">
        <span
          className={`text-sm font-bold ${isIncome ? "text-green-600" : "text-red-600"}`}
        >
          {isIncome ? "+" : "-"}${transaction.amount.toLocaleString()}
        </span>
      </td>

      {/* Status */}
      <td className="px-6 py-4 hidden md:table-cell">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(transaction.status)}`}
        >
          {transaction.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition group"
            title="View"
          >
            <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition group"
            title="Print"
          >
            <Printer className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default FinanceTableRow;
