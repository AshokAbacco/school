// components/DocumentsInfo.jsx

import React from "react";
import { FileText } from "lucide-react";

import {
  SectionHeading,
  Loading,
  ErrorMsg,
  Empty,
  C,
} from "./shared.jsx";

export default function DocumentsInfo({ docs, loading, error }) {
  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  if (!docs.length) return <Empty message="No documents uploaded." />;

  return (
    <div>
      <SectionHeading
        icon={FileText}
        title={`Documents (${docs.length})`}
      />

      <div className="pf-doc-grid">
        {docs.map((doc) => (
          <div key={doc.id} className="pf-info-card">
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                flexShrink: 0,
                background: `linear-gradient(135deg, ${C.light}, ${C.mid})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={13} color="#fff" />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  color: C.dark,
                  fontSize: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {doc.documentType}
              </div>

              <div style={{ fontSize: 11, color: C.mid, marginTop: 3 }}>
                {doc.fileType}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}