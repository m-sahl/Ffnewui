import React, { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import Ic from "../common/Ic";
import Modal from "../common/Modal";
import { ACCENT, CATS, catColor } from "../../styles/DesignTokens";

const normalizeCategory = (cat) => {
  if (!cat) return null;
  const str = String(cat).trim().toLowerCase();
  if (str.includes("sub") || str === "sj") return "Sub-Junior";
  if (str.includes("gen")) return "General";
  if (str.includes("jun") || str === "jr") return "Junior";
  if (str.includes("sen") || str === "sr") return "Senior";
  return null;
};

const normalizeType = (type) => {
  if (!type) return "Stage";
  const str = String(type).trim().toLowerCase();
  if (str.includes("off")) return "Off-Stage";
  return "Stage";
};

const ImportProgramsModal = ({ isOpen, onClose, programs = [], registrations = [], onImport, dark }) => {
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [sheetMappings, setSheetMappings] = useState({}); // { [sheetName]: category || "" }
  const [importMode, setImportMode] = useState("append"); // "append" | "replace"
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const fileInputRef = useRef(null);

  const border = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  // 1. Download Sample Template (One sheet per Category)
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const sampleDataByCategory = {
      "Sub-Junior": [
        ["Name", "Type", "Max Participants"],
        ["Action Song", "Stage", 1],
        ["Story Telling", "Stage", 1],
        ["Pencil Drawing", "Off-Stage", 1],
      ],
      "Junior": [
        ["Name", "Type", "Max Participants"],
        ["Elocution English", "Stage", 1],
        ["Group Song", "Stage", 6],
        ["Water Colouring", "Off-Stage", 1],
      ],
      "Senior": [
        ["Name", "Type", "Max Participants"],
        ["Debate", "Stage", 2],
        ["Dafmuttu", "Stage", 10],
        ["Essay Writing English", "Off-Stage", 1],
      ],
      "General": [
        ["Name", "Type", "Max Participants"],
        ["Quiz", "Stage", 3],
        ["Collage", "Off-Stage", 2],
      ],
    };

    CATS.forEach(cat => {
      const rows = sampleDataByCategory[cat] || [
        ["Name", "Type", "Max Participants"],
        [`Sample ${cat} Event`, "Stage", 1],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 26 }, { wch: 14 }, { wch: 18 }];
      const safeSheetName = cat.replace(/[:\\/?*\[\]]/g, "").slice(0, 31).trim();
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });

    XLSX.writeFile(wb, "FestFlow_Events_Template.xlsx");
  };

  // 2. Parse file
  const processFile = (file) => {
    setErrorMsg("");
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setErrorMsg("Please upload a valid Excel file (.xlsx or .xls).");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target.result);
        const wb = XLSX.read(buffer, { type: "array" });

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          setErrorMsg("The uploaded workbook contains no sheets.");
          return;
        }

        const parsedSheets = {};
        const initialMappings = {};

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (!rawRows || rawRows.length === 0) return;

          // Header inspection
          let headerIdx = -1;
          let nameCol = 0;
          let typeCol = 1;
          let maxCol = 2;

          for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
            const row = rawRows[i];
            if (!Array.isArray(row)) continue;
            const rowStr = row.map(c => String(c).toLowerCase().trim());
            const nIdx = rowStr.findIndex(c => c.includes("name") || c.includes("program") || c.includes("event") || c.includes("item"));
            if (nIdx !== -1) {
              headerIdx = i;
              nameCol = nIdx;
              const tIdx = rowStr.findIndex(c => c.includes("type") || c.includes("session") || c.includes("stage"));
              if (tIdx !== -1) typeCol = tIdx;
              const mIdx = rowStr.findIndex(c => c.includes("max") || c.includes("participant") || c.includes("limit") || c.includes("count"));
              if (mIdx !== -1) maxCol = mIdx;
              break;
            }
          }

          const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;
          const rows = [];

          for (let r = startRow; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!Array.isArray(row) || row.length === 0) continue;

            const rawName = row[nameCol] !== undefined ? String(row[nameCol]).trim() : "";
            const rawType = row[typeCol] !== undefined ? String(row[typeCol]).trim() : "";
            const rawMax = row[maxCol] !== undefined ? String(row[maxCol]).trim() : "1";

            // Skip completely empty lines
            if (!rawName && !rawType && !rawMax) continue;

            const name = rawName;
            const type = normalizeType(rawType);
            const parsedMax = parseInt(rawMax) || 1;
            const maxParticipants = Math.max(1, parsedMax);

            let error = null;
            if (!name) {
              error = "Missing event name";
            }

            rows.push({
              rowNum: r + 1,
              name,
              type,
              maxParticipants,
              isValid: !error,
              error,
            });
          }

          parsedSheets[sheetName] = rows;

          // Automatic sheet to category matching
          const autoCat = normalizeCategory(sheetName);
          initialMappings[sheetName] = autoCat || "";
        });

        setFileData(parsedSheets);
        setSheetMappings(initialMappings);
      } catch (err) {
        console.error("Error reading Excel file:", err);
        setErrorMsg("Failed to parse the Excel file. Please ensure it is not corrupted or password-protected.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 3. Calculate final list, sequential orders, and conflict checking
  const { previewPrograms, stats, conflictWarning } = useMemo(() => {
    if (!fileData) return { previewPrograms: [], stats: { total: 0, valid: 0, invalid: 0, categoriesCount: 0 }, conflictWarning: null };

    const activeMappedCategories = new Set(Object.values(sheetMappings).filter(Boolean));

    // Check if replacing any category would delete programs with active registrations
    let blockedCategory = null;
    let registeredProgCount = 0;

    if (importMode === "replace") {
      for (const cat of activeMappedCategories) {
        const inCat = programs.filter(p => p.category === cat);
        const hasReg = inCat.some(p => registrations.some(r => r.programId === p.id));
        if (hasReg) {
          blockedCategory = cat;
          registeredProgCount = inCat.filter(p => registrations.some(r => r.programId === p.id)).length;
          break;
        }
      }
    }

    // Determine baseline sequential order
    let startingOrder = 0;
    if (importMode === "append") {
      startingOrder = programs.reduce((max, p) => Math.max(max, p.order || 0), 0);
    } else {
      const remainingPrograms = programs.filter(p => !activeMappedCategories.has(p.category));
      startingOrder = remainingPrograms.reduce((max, p) => Math.max(max, p.order || 0), 0);
    }

    let validCount = 0;
    let invalidCount = 0;
    const list = [];
    const categoriesUsed = new Set();
    let currentOrder = startingOrder;

    Object.entries(fileData).forEach(([sheetName, rows]) => {
      const targetCategory = sheetMappings[sheetName];
      if (!targetCategory) return; // Skipped sheet

      categoriesUsed.add(targetCategory);

      rows.forEach(r => {
        if (!r.isValid) {
          invalidCount++;
          list.push({
            ...r,
            sheetName,
            category: targetCategory,
            order: "—",
          });
          return;
        }

        validCount++;
        currentOrder += 1;

        list.push({
          id: "p-" + Math.random().toString(36).substr(2, 6) + "-" + Date.now().toString(36),
          name: r.name,
          category: targetCategory,
          type: r.type,
          session: r.type,
          maxParticipants: r.maxParticipants,
          order: currentOrder,
          sheetName,
          isValid: true,
          error: null,
        });
      });
    });

    const conflictMsg = blockedCategory
      ? `Cannot use Replace mode: "${blockedCategory}" has ${registeredProgCount} event(s) with active participant entries. Please use Append mode instead.`
      : null;

    return {
      previewPrograms: list,
      stats: {
        total: validCount + invalidCount,
        valid: validCount,
        invalid: invalidCount,
        categoriesCount: categoriesUsed.size,
      },
      conflictWarning: conflictMsg,
    };
  }, [fileData, sheetMappings, importMode, programs, registrations]);

  // 4. Search Filter in preview
  const filteredList = useMemo(() => {
    if (!searchFilter.trim()) return previewPrograms;
    const q = searchFilter.toLowerCase();
    return previewPrograms.filter(
      p => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q)
    );
  }, [previewPrograms, searchFilter]);

  // 5. Submit import
  const handleConfirmImport = () => {
    if (stats.valid === 0 || conflictWarning) return;

    const validNewPrograms = previewPrograms.filter(p => p.isValid).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      type: p.type,
      session: p.session,
      maxParticipants: p.maxParticipants,
      order: p.order,
    }));

    onImport(validNewPrograms, importMode, Object.values(sheetMappings).filter(Boolean), stats.valid);
    handleReset();
  };

  const handleReset = () => {
    setFileData(null);
    setFileName("");
    setSheetMappings({});
    setErrorMsg("");
    setSearchFilter("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  return (
    <Modal title="Import Events from Excel" onClose={() => { handleReset(); onClose(); }} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxHeight: "78vh" }}>
        
        {/* Top Info Banner */}
        <div style={{
          padding: "12px 16px",
          borderRadius: 10,
          background: dark ? "rgba(241,77,77,0.08)" : "rgba(241,77,77,0.06)",
          border: `1px solid ${dark ? "rgba(241,77,77,0.2)" : "rgba(241,77,77,0.15)"}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: ACCENT }}>Category Organization: </span>
            Each sheet in your Excel file represents one <strong>Category</strong> (Sub-Junior, Junior, Senior, or General). Events will be automatically assigned sequential <strong>order numbers</strong> across the fest.
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="btn btn-ghost"
            style={{
              padding: "6px 12px",
              height: "auto",
              fontSize: 12,
              fontWeight: 700,
              color: ACCENT,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: dark ? "rgba(255,255,255,0.06)" : "white",
              borderRadius: 8,
              border: `1px solid ${border}`,
            }}
          >
            <Ic name="download" size={13} />
            Download Sample Template
          </button>
        </div>

        {/* File Upload Dropzone */}
        {!fileData ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            style={{
              border: `2px dashed ${dragOver ? ACCENT : border}`,
              borderRadius: 14,
              padding: "36px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? (dark ? "rgba(241,77,77,0.05)" : "rgba(241,77,77,0.03)") : cardBg,
              transition: "all 0.15s ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
            />
            <div style={{ width: 44, height: 44, borderRadius: 12, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: ACCENT }}>
              <Ic name="upload" size={22} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              Click or drag your Events Excel file here
            </div>
            <div style={{ fontSize: 12, color: mutedTx }}>
              Supports .xlsx, .xls containing sheets matching your categories (Sub-Junior, Junior, Senior, General)
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: cardBg, border: `1px solid ${border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: ACCENT }}><Ic name="check" size={16} /></span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{fileName}</span>
              <span style={{ fontSize: 12, color: mutedTx }}>({Object.keys(fileData).length} sheets detected)</span>
            </div>
            <button
              onClick={handleReset}
              className="btn btn-ghost"
              style={{ padding: "4px 10px", height: "auto", fontSize: 12, color: mutedTx }}
            >
              Change File
            </button>
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        {/* Configuration & Preview Section when file is loaded */}
        {fileData && (
          <>
            {/* Sheet to Category Mapping Bar */}
            <div style={{ borderRadius: 12, padding: 14, background: cardBg, border: `1px solid ${border}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Sheet to Category Mapping:</span>
                <span style={{ fontSize: 11, color: mutedTx, fontWeight: 500 }}>Confirm which category each sheet belongs to</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {Object.keys(fileData).map(sheetName => {
                  const currentMappedCategory = sheetMappings[sheetName] || "";
                  const count = fileData[sheetName]?.length || 0;
                  return (
                    <div key={sheetName} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", border: `1px solid ${border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          📑 {sheetName}
                        </span>
                        <span style={{ fontSize: 11, color: mutedTx }}>{count} rows</span>
                      </div>
                      <select
                        className="input select"
                        style={{ height: 32, fontSize: 12, padding: "2px 8px" }}
                        value={currentMappedCategory}
                        onChange={(e) => setSheetMappings(prev => ({ ...prev, [sheetName]: e.target.value }))}
                      >
                        <option value="">(Skip this sheet)</option>
                        {CATS.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Import Mode Selection */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setImportMode("append")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `1px solid ${importMode === "append" ? ACCENT : border}`,
                    background: importMode === "append" ? (dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)") : "transparent",
                    color: importMode === "append" ? ACCENT : mutedTx,
                    transition: "all 0.15s",
                  }}
                >
                  Append to Existing Events
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("replace")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `1px solid ${importMode === "replace" ? "#e11d48" : border}`,
                    background: importMode === "replace" ? (dark ? "rgba(225,29,72,0.12)" : "rgba(225,29,72,0.08)") : "transparent",
                    color: importMode === "replace" ? "#e11d48" : mutedTx,
                    transition: "all 0.15s",
                  }}
                >
                  Replace Events in Selected Categories
                </button>
              </div>

              {/* Stats Summary */}
              <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                <span style={{ color: ACCENT, fontWeight: 700 }}>✓ {stats.valid} ready to import</span>
                {stats.invalid > 0 && <span style={{ color: "#f59e0b", fontWeight: 700 }}>⚠️ {stats.invalid} invalid</span>}
                <span style={{ color: mutedTx }}>across {stats.categoriesCount} category(s)</span>
              </div>
            </div>

            {conflictWarning && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.12)", color: "#ef4444", fontSize: 13, border: "1px solid rgba(239,68,68,0.25)" }}>
                ⚠️ {conflictWarning}
              </div>
            )}

            {/* Search Filter for Preview Table */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  className="input"
                  style={{ fontSize: 12, height: 36, paddingLeft: 30 }}
                  placeholder="Filter preview by event name, type, or category…"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchFilter("");
                  }}
                />
                <span style={{ position: "absolute", left: 10, top: 10, color: mutedTx }}>
                  <Ic name="search" size={13} />
                </span>
              </div>
            </div>

            {/* Preview Table */}
            <div style={{
              borderRadius: 12,
              border: `1px solid ${border}`,
              overflow: "hidden",
              maxHeight: 280,
              display: "flex",
              flexDirection: "column",
            }}>
              {/* Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "70px 110px 1fr 95px 80px",
                padding: "8px 14px",
                background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                borderBottom: `1px solid ${border}`,
                fontSize: 11,
                fontWeight: 700,
                color: mutedTx,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                <div>Order #</div>
                <div>Category</div>
                <div>Event Name</div>
                <div>Type</div>
                <div>Max Part.</div>
              </div>

              {/* Rows */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {filteredList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 0", color: mutedTx, fontSize: 13 }}>
                    No events found in mapped category sheets.
                  </div>
                ) : (
                  filteredList.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 110px 1fr 95px 80px",
                        alignItems: "center",
                        padding: "8px 14px",
                        borderTop: idx > 0 ? `1px solid ${border}` : "none",
                        fontSize: 13,
                        background: !p.isValid ? (dark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)") : idx % 2 === 0 ? "transparent" : (dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"),
                      }}
                    >
                      {/* Auto Order # */}
                      <div>
                        {p.isValid ? (
                          <span style={{
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                            fontWeight: 800,
                            color: ACCENT,
                            fontSize: 12,
                            background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                            padding: "2px 6px",
                            borderRadius: 6,
                          }}>
                            #{p.order}
                          </span>
                        ) : (
                          <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>Error</span>
                        )}
                      </div>

                      {/* Category */}
                      <div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: catColor[p.category] || mutedTx,
                          background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                          padding: "2px 7px",
                          borderRadius: 6,
                        }}>
                          {p.category}
                        </span>
                      </div>

                      {/* Name */}
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name || <span style={{ color: "#ef4444" }}>[Empty Name]</span>}
                        {p.error && <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 400 }}>{p.error}</div>}
                      </div>

                      {/* Type */}
                      <div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 5,
                          background: p.type === "Stage" ? (dark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)") : (dark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)"),
                          color: p.type === "Stage" ? "#3b82f6" : "#f59e0b",
                        }}>
                          {p.type}
                        </span>
                      </div>

                      {/* Max Participants */}
                      <div style={{ fontWeight: 600, fontSize: 12 }}>
                        {p.maxParticipants}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Modal Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, height: 44 }}
            onClick={() => { handleReset(); onClose(); }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, height: 44 }}
            disabled={!fileData || stats.valid === 0 || !!conflictWarning}
            onClick={handleConfirmImport}
          >
            <Ic name="upload" size={14} />
            {stats.valid > 0 ? `Import ${stats.valid} Event${stats.valid > 1 ? "s" : ""}` : "Import Events"}
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default ImportProgramsModal;
