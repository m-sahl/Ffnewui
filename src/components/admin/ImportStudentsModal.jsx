import React, { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import Ic from "../common/Ic";
import Modal from "../common/Modal";
import { ACCENT, STUDENT_CATS, catColor } from "../../styles/DesignTokens";

const normalizeCategory = (cat) => {
  if (!cat) return null;
  const str = String(cat).trim().toLowerCase();
  if (str.includes("sub") || str === "sj") return "Sub-Junior";
  if (str.includes("jun") || str === "jr") return "Junior";
  if (str.includes("sen") || str === "sr") return "Senior";
  return null;
};

const normalizeRole = (role) => {
  if (!role) return "Member";
  const str = String(role).trim().toLowerCase();
  if (str.includes("asst") || str.includes("assist")) return "Asst. Leader";
  if (str.includes("lead")) return "Leader";
  return "Member";
};

const ImportStudentsModal = ({ isOpen, onClose, groups = [], students = {}, onImport, dark }) => {
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [sheetMappings, setSheetMappings] = useState({}); // { [sheetName]: groupId or "" }
  const [importMode, setImportMode] = useState("append"); // "append" | "replace"
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const fileInputRef = useRef(null);

  const border = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  // 1. Download Sample Template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const targetGroups = groups.length > 0 ? groups : [{ id: "g-1", name: "Group A" }, { id: "g-2", name: "Group B" }];

    targetGroups.forEach(g => {
      const sheetData = [
        ["Name", "Category", "Role"],
        ["Aisha Rahman", "Sub-Junior", "Member"],
        ["Zayan Ahmed", "Junior", "Leader"],
        ["Rohan Varma", "Senior", "Member"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }];
      const safeSheetName = (g.name || "Group").replace(/[:\\/?*\[\]]/g, "").slice(0, 31).trim() || "Group";
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });

    XLSX.writeFile(wb, "FestFlow_Students_Template.xlsx");
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

          // Find header row or default to row 0
          let headerIdx = -1;
          let nameCol = 0;
          let catCol = 1;
          let roleCol = 2;

          for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
            const row = rawRows[i];
            if (!Array.isArray(row)) continue;
            const rowStr = row.map(c => String(c).toLowerCase().trim());
            const nIdx = rowStr.findIndex(c => c.includes("name") || c.includes("student"));
            if (nIdx !== -1) {
              headerIdx = i;
              nameCol = nIdx;
              const cIdx = rowStr.findIndex(c => c.includes("cat") || c.includes("section"));
              if (cIdx !== -1) catCol = cIdx;
              const rIdx = rowStr.findIndex(c => c.includes("role") || c.includes("designation"));
              if (rIdx !== -1) roleCol = rIdx;
              break;
            }
          }

          const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;
          const rows = [];

          for (let r = startRow; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!Array.isArray(row) || row.length === 0) continue;

            const rawName = row[nameCol] !== undefined ? String(row[nameCol]).trim() : "";
            const rawCat = row[catCol] !== undefined ? String(row[catCol]).trim() : "";
            const rawRole = row[roleCol] !== undefined ? String(row[roleCol]).trim() : "";

            // Ignore totally empty rows
            if (!rawName && !rawCat && !rawRole) continue;

            const category = normalizeCategory(rawCat);
            const role = normalizeRole(rawRole);
            let error = null;

            if (!rawName) {
              error = "Missing student name";
            } else if (!category) {
              error = `Invalid category "${rawCat || "blank"}" (must be Sub-Junior, Junior, or Senior)`;
            }

            rows.push({
              rowNum: r + 1,
              name: rawName,
              rawCategory: rawCat,
              category,
              role,
              isValid: !error,
              error,
            });
          }

          parsedSheets[sheetName] = rows;

          // Automatic sheet to group match
          const cleanSheetName = sheetName.trim().toLowerCase();
          const matchedGroup = groups.find(g => {
            const gName = g.name.trim().toLowerCase();
            return gName === cleanSheetName || cleanSheetName.includes(gName) || gName.includes(cleanSheetName);
          });

          initialMappings[sheetName] = matchedGroup ? matchedGroup.id : "";
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

  // 3. Calculate prospective chest numbers and final student objects
  const { previewStudents, stats } = useMemo(() => {
    if (!fileData) return { previewStudents: [], stats: { total: 0, valid: 0, invalid: 0, groupsCount: 0 } };

    // Determine baseline chest numbers based on mode
    const base = { "Sub-Junior": 100, "Junior": 200, "Senior": 300 };
    const currentCounters = { ...base };

    // Get current students to calculate existing max chest numbers
    const activeTargetGroupIds = new Set(Object.values(sheetMappings).filter(Boolean));
    const allExistingStudents = Object.entries(students).flatMap(([gId, stList]) => {
      // If replace mode, ignore existing students in groups that are being replaced!
      if (importMode === "replace" && activeTargetGroupIds.has(gId)) {
        return [];
      }
      return stList || [];
    });

    STUDENT_CATS.forEach(cat => {
      const inCat = allExistingStudents.filter(s => s.category === cat);
      const maxUsed = inCat.reduce((max, s) => Math.max(max, parseInt(s.chestNo) || 0), base[cat]);
      currentCounters[cat] = maxUsed;
    });

    const list = [];
    let validCount = 0;
    let invalidCount = 0;
    const mappedGroupsUsed = new Set();

    // Track leaders per sheet to ensure only 1 leader per group import
    const leadersAssigned = new Set();
    const asstLeadersAssigned = new Set();

    Object.entries(fileData).forEach(([sheetName, rows]) => {
      const targetGroupId = sheetMappings[sheetName];
      if (!targetGroupId) return; // Skipped sheet

      mappedGroupsUsed.add(targetGroupId);
      const groupObj = groups.find(g => g.id === targetGroupId);

      rows.forEach(r => {
        if (!r.isValid) {
          invalidCount++;
          list.push({
            ...r,
            sheetName,
            groupId: targetGroupId,
            groupName: groupObj?.name || "Unknown",
            chestNo: "—",
          });
          return;
        }

        validCount++;
        currentCounters[r.category] += 1;
        const assignedChestNo = currentCounters[r.category].toString();

        // Prevent multiple leaders in same import
        let finalRole = r.role;
        const leaderKey = `${targetGroupId}_leader`;
        const asstKey = `${targetGroupId}_asst`;

        if (finalRole === "Leader") {
          if (leadersAssigned.has(leaderKey)) {
            finalRole = "Member";
          } else {
            leadersAssigned.add(leaderKey);
          }
        } else if (finalRole === "Asst. Leader") {
          if (asstLeadersAssigned.has(asstKey)) {
            finalRole = "Member";
          } else {
            asstLeadersAssigned.add(asstKey);
          }
        }

        list.push({
          id: "s-" + Math.random().toString(36).substr(2, 6) + "-" + Date.now().toString(36),
          name: r.name,
          category: r.category,
          groupRole: finalRole,
          groupId: targetGroupId,
          groupName: groupObj?.name || targetGroupId,
          chestNo: assignedChestNo,
          sheetName,
          isValid: true,
          error: null,
        });
      });
    });

    return {
      previewStudents: list,
      stats: {
        total: validCount + invalidCount,
        valid: validCount,
        invalid: invalidCount,
        groupsCount: mappedGroupsUsed.size,
      },
    };
  }, [fileData, sheetMappings, importMode, students, groups]);

  // 4. Filtered preview
  const filteredList = useMemo(() => {
    if (!searchFilter.trim()) return previewStudents;
    const q = searchFilter.toLowerCase();
    return previewStudents.filter(
      s => s.name?.toLowerCase().includes(q) || s.groupName?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || s.chestNo?.includes(q)
    );
  }, [previewStudents, searchFilter]);

  // 5. Submit import
  const handleConfirmImport = () => {
    if (stats.valid === 0) return;

    // Group valid students by groupId
    const grouped = {};
    previewStudents.forEach(s => {
      if (!s.isValid) return;
      if (!grouped[s.groupId]) grouped[s.groupId] = [];
      grouped[s.groupId].push({
        id: s.id,
        name: s.name,
        category: s.category,
        chestNo: s.chestNo,
        groupId: s.groupId,
        groupRole: s.groupRole,
      });
    });

    onImport(grouped, importMode, stats.valid);
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
    <Modal title="Import Students from Excel" onClose={() => { handleReset(); onClose(); }} wide>
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
            <span style={{ fontWeight: 700, color: ACCENT }}>Automated Setup: </span>
            Each sheet in your Excel file represents one Group. Chest numbers are <strong>automatically generated</strong> per category (Sub-Junior: 101+, Junior: 201+, Senior: 301+). No chest number column is required in the file!
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
              Click or drag your Excel file here
            </div>
            <div style={{ fontSize: 12, color: mutedTx }}>
              Supports .xlsx, .xls containing sheets matching your group names
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
            {/* Sheet to Group Mapping Bar */}
            <div style={{ borderRadius: 12, padding: 14, background: cardBg, border: `1px solid ${border}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Sheet to Group Mapping:</span>
                <span style={{ fontSize: 11, color: mutedTx, fontWeight: 500 }}>Confirm which group each sheet belongs to</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {Object.keys(fileData).map(sheetName => {
                  const currentMappedGroupId = sheetMappings[sheetName] || "";
                  const count = fileData[sheetName]?.length || 0;
                  return (
                    <div key={sheetName} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", border: `1px solid ${border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          📄 {sheetName}
                        </span>
                        <span style={{ fontSize: 11, color: mutedTx }}>{count} rows</span>
                      </div>
                      <select
                        className="input select"
                        style={{ height: 32, fontSize: 12, padding: "2px 8px" }}
                        value={currentMappedGroupId}
                        onChange={(e) => setSheetMappings(prev => ({ ...prev, [sheetName]: e.target.value }))}
                      >
                        <option value="">(Skip this sheet)</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
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
                  Append to Existing Students
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
                  Replace Students in Selected Groups
                </button>
              </div>

              {/* Stats Summary */}
              <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                <span style={{ color: ACCENT, fontWeight: 700 }}>✓ {stats.valid} ready to import</span>
                {stats.invalid > 0 && <span style={{ color: "#f59e0b", fontWeight: 700 }}>⚠️ {stats.invalid} invalid rows</span>}
                <span style={{ color: mutedTx }}>across {stats.groupsCount} group(s)</span>
              </div>
            </div>

            {/* Search Filter for Preview Table */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  className="input"
                  style={{ fontSize: 12, height: 36, paddingLeft: 30 }}
                  placeholder="Filter preview by student, category, or group…"
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
                gridTemplateColumns: "85px 120px 1fr 110px 100px",
                padding: "8px 14px",
                background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                borderBottom: `1px solid ${border}`,
                fontSize: 11,
                fontWeight: 700,
                color: mutedTx,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                <div>Auto Chest #</div>
                <div>Target Group</div>
                <div>Student Name</div>
                <div>Category</div>
                <div>Role</div>
              </div>

              {/* Rows */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {filteredList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 0", color: mutedTx, fontSize: 13 }}>
                    No students found in mapped sheets.
                  </div>
                ) : (
                  filteredList.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "85px 120px 1fr 110px 100px",
                        alignItems: "center",
                        padding: "8px 14px",
                        borderTop: idx > 0 ? `1px solid ${border}` : "none",
                        fontSize: 13,
                        background: !s.isValid ? (dark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)") : idx % 2 === 0 ? "transparent" : (dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"),
                      }}
                    >
                      {/* Auto Chest No */}
                      <div>
                        {s.isValid ? (
                          <span style={{
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                            fontWeight: 800,
                            color: ACCENT,
                            fontSize: 13,
                            background: dark ? "rgba(241,77,77,0.12)" : "rgba(241,77,77,0.08)",
                            padding: "2px 6px",
                            borderRadius: 6,
                          }}>
                            {s.chestNo}
                          </span>
                        ) : (
                          <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>Error</span>
                        )}
                      </div>

                      {/* Group */}
                      <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.groupName}
                      </div>

                      {/* Name */}
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name || <span style={{ color: "#ef4444" }}>[Empty Name]</span>}
                        {s.error && <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 400 }}>{s.error}</div>}
                      </div>

                      {/* Category */}
                      <div>
                        {s.category ? (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: catColor[s.category] || mutedTx,
                            background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                            padding: "2px 7px",
                            borderRadius: 6,
                          }}>
                            {s.category}
                          </span>
                        ) : (
                          <span style={{ color: "#ef4444", fontSize: 11 }}>{s.rawCategory || "Invalid"}</span>
                        )}
                      </div>

                      {/* Role */}
                      <div style={{ fontSize: 12, color: s.groupRole === "Leader" ? ACCENT : mutedTx, fontWeight: s.groupRole === "Leader" ? 700 : 500 }}>
                        {s.groupRole || "Member"}
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
            disabled={!fileData || stats.valid === 0}
            onClick={handleConfirmImport}
          >
            <Ic name="upload" size={14} />
            {stats.valid > 0 ? `Import ${stats.valid} Student${stats.valid > 1 ? "s" : ""}` : "Import Students"}
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default ImportStudentsModal;
