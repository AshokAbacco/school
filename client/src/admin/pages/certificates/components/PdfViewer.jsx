// client/src/admin/pages/certificates/components/PdfViewer.jsx
import { Download, Printer, ExternalLink, FileWarning } from "lucide-react";
import { C } from "./theme";

export default function PdfViewer({ url, fileName = "certificate.pdf", height = 520 }) {
  if (!url) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl text-sm"
        style={{ height, border: `1px dashed ${C.border}`, color: C.textLight }}
      >
        <FileWarning size={26} className="mb-2 opacity-50" />
        No PDF to preview yet.
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handlePrint = () => {
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        try {
          win.print();
        } catch {
          /* browser may block programmatic print; user can print manually */
        }
      });
    }
  };

  // Suppress the browser's own PDF-viewer chrome (toolbar, thumbnail
  // sidebar, zoom controls, its own print/download icons) inside the
  // iframe — we already provide Open/Print/Download below, so the native
  // toolbar was just showing a second, redundant set of controls plus a
  // page-thumbnail rail that made the preview look like a print dialog
  // instead of a plain document page.
  const viewerUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0`;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${C.border}`, height }}
      >
        <iframe src={viewerUrl} title="Certificate PDF" width="100%" height="100%" style={{ border: "none" }} />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => window.open(url, "_blank")}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border"
          style={{ borderColor: C.border, color: C.deep }}
        >
          <ExternalLink size={14} /> Open
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border"
          style={{ borderColor: C.border, color: C.deep }}
        >
          <Printer size={14} /> Print
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg"
          style={{ background: C.deep, color: "#fff" }}
        >
          <Download size={14} /> Download
        </button>
      </div>
    </div>
  );
}