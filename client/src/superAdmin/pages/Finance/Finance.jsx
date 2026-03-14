import { useEffect, useState } from "react";
import { getFinances, deleteFinance } from "./components/financeApi";
import AddFinance from "./AddFinancers";
import PageLayout from "../../components/PageLayout";
import {
  Users, RefreshCw, Plus, Search, Mail, School,
  Pencil, Trash2, BadgeCheck, ShieldOff, TrendingUp
} from "lucide-react";

const C = {
  dark:    "#384959",
  mid:     "#6A89A7",
  light:   "#88BDF2",
  lighter: "#BDDDFC",
  bg:      "#EEF4FB",
};

export default function FinanceListPage() {
  const [finances, setFinances]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editFinance, setEditFinance] = useState(null);
  const [search, setSearch]       = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getFinances();
      setFinances(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this finance account?")) return;
    await deleteFinance(id);
    fetchData();
  };

  const handleEdit = (f) => {
    setEditFinance(f);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditFinance(null);
  };

  const filtered = finances.filter((f) =>
    [f.user?.name, f.user?.email, f.designation, f.school?.name]
      .some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const total    = finances.length;
  const active   = finances.filter((f) => f.status !== "inactive").length;
  const inactive = finances.filter((f) => f.status === "inactive").length;

  const Avatar = ({ name }) => (
    <div style={{ background: C.lighter, color: C.dark }}
      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 uppercase">
      {name?.[0] || "F"}
    </div>
  );

  return (
    <PageLayout>
      <div style={{ background: C.bg, minHeight: "100vh" }} className="p-6 font-sans">

        {/* Header */}
        <div className="flex justify-between items-center mb-7">
          <div className="flex items-center gap-3">
            <div style={{ background: C.lighter }} className="p-2.5 rounded-2xl">
              <Users size={22} style={{ color: C.dark }} />
            </div>
            <div>
              <h1 style={{ color: C.dark }} className="text-2xl font-extrabold tracking-tight leading-tight">
                Finance Management
              </h1>
              <p style={{ color: C.mid }} className="text-sm mt-0.5">Manage all finance accounts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData}
              style={{ border: `1.5px solid ${C.lighter}`, color: C.mid }}
              className="p-2.5 bg-white rounded-xl hover:bg-blue-50 transition" title="Refresh">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => { setEditFinance(null); setShowModal(true); }}
              style={{ background: C.dark }}
              className="text-white px-5 py-2.5 rounded-xl shadow-lg hover:opacity-90 transition flex items-center gap-2 font-semibold text-sm">
              <Plus size={16} strokeWidth={2.5} /> Add Finance
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div style={{ background: C.dark, border: `1.5px solid ${C.dark}` }}
            className="rounded-2xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <p style={{ color: C.lighter }} className="text-xs font-semibold uppercase tracking-widest mb-1">Total Accounts</p>
              <p className="text-4xl font-black text-white">{total}</p>
            </div>
            <div style={{ background: "rgba(189,221,252,0.12)" }} className="p-3.5 rounded-2xl">
              <TrendingUp size={26} color={C.lighter} strokeWidth={1.8} />
            </div>
          </div>

          <div style={{ background: C.light, border: `1.5px solid ${C.light}` }}
            className="rounded-2xl p-5 shadow-md flex items-center justify-between">
            <div>
              <p style={{ color: C.dark }} className="text-xs font-semibold uppercase tracking-widest mb-1">Active</p>
              <p style={{ color: C.dark }} className="text-4xl font-black">{active}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.25)" }} className="p-3.5 rounded-2xl">
              <BadgeCheck size={26} color={C.dark} strokeWidth={1.8} />
            </div>
          </div>

          <div style={{ background: "#fff", border: `1.5px solid ${C.lighter}` }}
            className="rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p style={{ color: C.mid }} className="text-xs font-semibold uppercase tracking-widest mb-1">Inactive</p>
              <p style={{ color: C.dark }} className="text-4xl font-black">{inactive}</p>
            </div>
            <div style={{ background: C.bg }} className="p-3.5 rounded-2xl">
              <ShieldOff size={26} color={C.mid} strokeWidth={1.8} />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ border: `1.5px solid ${C.lighter}` }}
          className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm mb-5">
          <Search size={16} style={{ color: C.mid }} />
          <input
            className="flex-1 outline-none text-sm bg-transparent"
            style={{ color: C.dark }}
            placeholder="Search by name, email, school or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ color: C.mid, fontSize: 11, background: C.bg }}
              className="px-2.5 py-1 rounded-lg hover:opacity-70 transition font-medium">
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden"
          style={{ border: `1.5px solid ${C.lighter}` }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ background: C.dark }}>
                {["Finance Account", "Email", "School", "Designation", "Phone", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-4 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: C.lighter }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div style={{ borderColor: C.light, borderTopColor: C.dark }}
                        className="w-8 h-8 border-[3px] rounded-full animate-spin" />
                      <span style={{ color: C.mid }} className="text-sm">Loading accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <Users size={40} style={{ color: C.lighter }} className="mx-auto mb-3" />
                    <p style={{ color: C.mid }} className="text-sm font-medium">No finance accounts found.</p>
                    <p style={{ color: C.light }} className="text-xs mt-1">Try adjusting your search query.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((f, idx) => (
                  <tr key={f.id}
                    style={{ borderBottom: `1px solid ${C.lighter}`, background: idx % 2 === 0 ? "#fff" : "#f5f9ff" }}
                    className="hover:bg-blue-50 transition-colors duration-150 group">

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={f.user?.name} />
                        <span style={{ color: C.dark }} className="font-semibold">{f.user?.name || "—"}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Mail size={13} style={{ color: C.mid }} />
                        <span style={{ color: C.mid }} className="text-xs">{f.user?.email || "—"}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <School size={13} style={{ color: C.mid }} />
                        <span style={{ color: C.dark }} className="text-xs font-medium">{f.school?.name || "—"}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {f.designation ? (
                        <span style={{ background: C.lighter, color: C.dark }}
                          className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                          {f.designation}
                        </span>
                      ) : <span style={{ color: C.light }}>—</span>}
                    </td>

                    <td className="px-5 py-3.5 text-xs" style={{ color: C.mid }}>
                      {f.phone || "—"}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(f)}
                          style={{ border: `1.5px solid ${C.lighter}`, color: C.mid }}
                          className="p-2 rounded-xl hover:bg-blue-50 transition opacity-0 group-hover:opacity-100">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(f.id)}
                          style={{ border: "1.5px solid #fecaca", color: "#ef4444" }}
                          className="p-2 rounded-xl hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && (
            <div style={{ borderTop: `1px solid ${C.lighter}`, color: C.mid }}
              className="flex justify-between items-center px-5 py-3 text-xs">
              <span>Showing <strong style={{ color: C.dark }}>{filtered.length}</strong> of <strong style={{ color: C.dark }}>{total}</strong> finance accounts</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.light }} />
                <span style={{ color: C.light }}>Live</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-7 relative"
              style={{ border: `2px solid ${C.lighter}` }}>
              <button onClick={handleModalClose}
                style={{ color: C.mid }}
                className="absolute top-4 right-4 hover:opacity-60 transition text-2xl leading-none font-light">
                ✕
              </button>
              <AddFinance
                editData={editFinance}
                onSuccess={() => { handleModalClose(); fetchData(); }}
              />
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}