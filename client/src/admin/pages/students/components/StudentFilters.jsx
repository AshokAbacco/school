// admin/pages/students/components/StudentFilters.jsx
import { Search, RefreshCw, Download, Plus } from "lucide-react";

const inputCls =
  `px-3 py-2.5 rounded-xl text-sm font-medium bg-white focus:outline-none transition-all`.trim();

// ✅ Props updated: filterSectionId, filterYearId, classSections, academicYears
// Removed: filterGrade, hardcoded GRADES array
export default function StudentFilters({
  searchTerm,
  setSearchTerm,
  filterSectionId,
  setFilterSectionId,
  filterYearId,
  setFilterYearId,
  filterStatus,
  setFilterStatus,
  classSections = [],
  academicYears = [],
  loading,
  onRefresh,
  onAdd,
}) {
  const borderStyle = {
    border: "1px solid rgba(136,189,242,0.35)",
    color: "#384959",
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-4 mb-5"
      style={{ border: "1px solid rgba(136,189,242,0.25)" }}
    >
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        {/* Search */}
        <div className="flex-1 relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "#6A89A7" }}
          />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputCls + " w-full pl-10 pr-4"}
            style={{ ...borderStyle, outline: "none" }}
            onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(136,189,242,0.35)")
            }
          />
        </div>

        {/* ✅ Class/Section filter — dynamic from API */}
        <select
          value={filterSectionId}
          onChange={(e) => setFilterSectionId(e.target.value)}
          className={inputCls}
          style={borderStyle}
        >
          <option value="all">All Classes</option>
          {classSections.map((cs) => (
            <option key={cs.id} value={cs.id}>
              {cs.name} (Grade {cs.grade})
            </option>
          ))}
        </select>

        {/* ✅ Academic Year filter — dynamic from API */}
        <select
          value={filterYearId}
          onChange={(e) => setFilterYearId(e.target.value)}
          className={inputCls}
          style={borderStyle}
        >
          <option value="all">All Years</option>
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={inputCls}
          style={borderStyle}
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="GRADUATED">Graduated</option>
        </select>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ ...borderStyle, background: "white" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(189,221,252,0.25)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
              style={{ color: "#6A89A7" }}
            />
            <span className="hidden sm:inline" style={{ color: "#6A89A7" }}>
              Refresh
            </span>
          </button>

          <button
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ ...borderStyle, background: "white" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(189,221,252,0.25)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
          >
            <Download size={14} style={{ color: "#6A89A7" }} />
            <span className="hidden sm:inline" style={{ color: "#6A89A7" }}>
              Export
            </span>
          </button>

          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all"
            style={{ background: "#384959" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#6A89A7")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#384959")}
          >
            <Plus size={14} /> Add Student
          </button>
        </div>
      </div>
    </div>
  );
}
