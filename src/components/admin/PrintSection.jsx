import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { ACCENT, CATS, catColor } from "../../styles/DesignTokens";
import Ic from "../common/Ic";

const SHEET_PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .sheet {
    background: #ffffff !important;
    color: #111827 !important;
    width: 100%;
    max-width: 210mm;
    min-height: 270mm;
    padding: 16mm 18mm;
    margin: 0 auto;
    border: 1px solid #d1d5db;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: always;
    break-after: page;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .sheet:last-child {
    page-break-after: avoid;
    break-after: avoid;
    margin-bottom: 0;
  }
  .sheet-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    margin-bottom: 16px;
    border-bottom: 2px solid #111827;
  }
  .sheet-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #111827;
  }
  .sheet-sub {
    font-size: 13px;
    color: #374151;
    margin-top: 4px;
    font-weight: 600;
  }
  .sheet-meta-badges {
    display: flex;
    gap: 6px;
    margin-top: 6px;
    align-items: center;
  }
  .meta-tag {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 4px;
    border: 1px solid #111827;
    letter-spacing: 0.5px;
    color: #111827;
  }
  .sheet-fest-box {
    text-align: right;
  }
  .sheet-fest-name {
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 3px 9px;
    border: 1.5px solid #111827;
    border-radius: 4px;
    display: inline-block;
    color: #111827;
  }
  .sheet-copy-tag {
    font-size: 11px;
    font-weight: 800;
    margin-top: 4px;
    color: #b91c1c;
    letter-spacing: 0.5px;
  }
  .sheet-content {
    flex: 1;
  }
  .sheet table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 16px;
  }
  .sheet thead tr {
    background: #111827;
    color: #ffffff;
  }
  .sheet th {
    padding: 8px 10px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    font-weight: 700;
    text-align: left;
    border: 1px solid #111827;
    color: #ffffff;
  }
  .sheet th.c, .sheet td.c {
    text-align: center;
  }
  .sheet th.r, .sheet td.r {
    text-align: right;
  }
  .sheet td {
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    vertical-align: middle;
    color: #111827;
  }
  .sheet tr.even td {
    background: #f8fafc;
  }
  .sheet td.chest {
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 0.5px;
  }
  .sheet td.name {
    font-weight: 600;
  }
  .sheet td.team {
    font-weight: 600;
    color: #1f2937;
  }
  .sheet td.blank-box {
    background: #ffffff !important;
    border: 1px solid #94a3b8;
    height: 32px;
  }
  .sheet td.check-col {
    width: 44px;
    text-align: center;
  }
  .check-box-square {
    width: 14px;
    height: 14px;
    border: 1.5px solid #475569;
    display: inline-block;
    border-radius: 2px;
  }
  .judge-box {
    margin-top: 14px;
    border: 1.5px solid #111827;
    border-radius: 4px;
    overflow: hidden;
  }
  .judge-box-head {
    background: #111827;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 6px 14px;
  }
  .judge-box-body {
    padding: 12px 14px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    background: #ffffff;
  }
  .judge-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .judge-field.full {
    grid-column: 1 / -1;
  }
  .judge-label {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #4b5563;
  }
  .judge-line {
    border-bottom: 1px solid #111827;
    height: 20px;
    display: block;
  }
  .sheet-foot {
    margin-top: 14px;
    padding-top: 8px;
    border-top: 1px solid #94a3b8;
    font-size: 10px;
    color: #4b5563;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  @media print {
    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .sheet {
      margin: 0 0 16mm 0 !important;
      padding: 12mm 14mm !important;
      border: none !important;
      box-shadow: none !important;
      width: 100% !important;
      min-height: 260mm !important;
      page-break-after: always !important;
      break-after: page !important;
    }
    .sheet:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
      margin-bottom: 0 !important;
    }
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
  }
`;

const PrintSection = ({ dark }) => {
  const { programs, students, registrations, groups } = useApp();
  
  const [sessionFilter, setSessionFilter] = useState("All"); // "All" | "Stage" | "Off-Stage"
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [progSearch, setProgSearch] = useState("");
  const [selProg, setSelProg] = useState("");
  const [selectedPages, setSelectedPages] = useState({ call: true, code: true, valuation: true });
  const [judgeCopies, setJudgeCopies] = useState(2); // 1-5 copies for valuation sheet
  const [previewTab, setPreviewTab] = useState("call"); // "call" | "code" | "valuation"

  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const border = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const cardBg = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const sessionTypes = ["All", "Stage", "Off-Stage"];
  const categories = ["All", ...CATS];

  // 1. Filtered Programs list
  const filteredPrograms = useMemo(() => {
    return programs
      .filter(p => {
        const pSession = (p.session || p.type || "Stage").toLowerCase().replace(/[^a-z]/g, "");
        const matchesSession =
          sessionFilter === "All" ||
          (sessionFilter === "Stage" ? pSession === "stage" : pSession.includes("off"));
        const matchesCat = categoryFilter === "All" || p.category === categoryFilter;
        const matchesSearch =
          !progSearch.trim() ||
          (p.name?.toLowerCase().includes(progSearch.toLowerCase().trim()) ||
            (p.order && String(p.order).includes(progSearch.trim())));
        return matchesSession && matchesCat && matchesSearch;
      })
      .sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));
  }, [programs, sessionFilter, categoryFilter, progSearch]);

  const prog = useMemo(() => programs.find(p => p.id === selProg), [programs, selProg]);

  // 2. Participants enrolled for selected program
  const { participants, participatingGroups } = useMemo(() => {
    if (!selProg) return { participants: [], participatingGroups: [] };

    const progRegs = registrations.filter(r => r.programId === selProg);
    const groupsSet = new Map();
    const list = [];

    for (const r of progRegs) {
      const grp = groups.find(g => g.id === r.groupId) || { id: r.groupId, name: "Team", color: ACCENT };
      const grpStudents = students[r.groupId] || [];
      const parts = (r.participantIds || []).map(id => grpStudents.find(s => s.id === id)).filter(Boolean);

      if (!groupsSet.has(grp.id)) {
        groupsSet.set(grp.id, { ...grp, count: parts.length });
      } else {
        const existing = groupsSet.get(grp.id);
        existing.count += parts.length;
      }

      for (const s of parts) {
        list.push({
          ...s,
          groupId: r.groupId,
          groupName: grp.name,
          groupColor: grp.color,
        });
      }
    }

    list.sort((a, b) => {
      const numA = parseInt(a.chestNo, 10);
      const numB = parseInt(b.chestNo, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.chestNo || "").localeCompare(String(b.chestNo || ""));
    });

    return {
      participants: list,
      participatingGroups: Array.from(groupsSet.values()),
    };
  }, [selProg, registrations, groups, students]);

  const togglePage = (id) => setSelectedPages(p => ({ ...p, [id]: !p[id] }));
  const anySelected = Object.values(selectedPages).some(Boolean);

  const sheets = [
    { id: "call", label: "Call List", desc: "Stage Attendance · Sl · Chest No · Name · Team · Calls" },
    { id: "code", label: "Code Sheet", desc: "Secret Lot Drawing · Sl · Chest No · Name · Code · Sign" },
    { id: "valuation", label: "Valuation Sheet", desc: "Judge Scoring Sheet · Score · Total · Rank · Certification" },
  ];

  // ── Sheet HTML Generators ──────────────────────────────────────────────────
  const buildCallList = () => {
    const festName = "FestFlow";
    const progName = prog ? `${prog.order ? `#${prog.order} ` : ""}${prog.name}` : "Event Call List";
    const progCat = prog?.category || "General";
    const progSess = prog?.session || prog?.type || "Stage";
    const total = participants.length;

    const rows = participants.length > 0
      ? participants.map((p, i) => `
        <tr class="${i % 2 === 0 ? "even" : ""}">
          <td class="c" style="width: 36px; font-weight: bold;">${i + 1}</td>
          <td class="chest" style="width: 75px;">${p.chestNo || "—"}</td>
          <td class="name">${p.name}</td>
          <td class="team" style="width: 130px;">${p.groupName || "—"}</td>
          <td class="check-col"><span class="check-box-square"></span></td>
          <td class="check-col"><span class="check-box-square"></span></td>
          <td class="check-col"><span class="check-box-square"></span></td>
          <td class="blank-box" style="width: 110px;"></td>
        </tr>`).join("")
      : Array.from({ length: 10 }).map((_, i) => `
        <tr class="${i % 2 === 0 ? "even" : ""}">
          <td class="c" style="width: 36px; font-weight: bold;">${i + 1}</td>
          <td class="chest blank-box" style="width: 75px;"></td>
          <td class="name blank-box"></td>
          <td class="team blank-box" style="width: 130px;"></td>
          <td class="check-col"><span class="check-box-square"></span></td>
          <td class="check-col"><span class="check-box-square"></span></td>
          <td class="check-col"><span class="check-box-square"></span></td>
          <td class="blank-box" style="width: 110px;"></td>
        </tr>`).join("");

    return `
      <div class="sheet">
        <div>
          <div class="sheet-head">
            <div>
              <div class="sheet-title">CALL LIST & ATTENDANCE</div>
              <div class="sheet-sub">${progName}</div>
              <div class="sheet-meta-badges">
                <span class="meta-tag">${progCat}</span>
                <span class="meta-tag">${progSess}</span>
                <span class="meta-tag" style="border-color: #6b7280; color: #4b5563;">${total} Registered</span>
              </div>
            </div>
            <div class="sheet-fest-box">
              <div class="sheet-fest-name">${festName}</div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Stage Management</div>
            </div>
          </div>

          <div class="sheet-content">
            <table>
              <thead>
                <tr>
                  <th class="c" style="width: 36px;">Sl.</th>
                  <th style="width: 75px;">Chest #</th>
                  <th>Student Name</th>
                  <th style="width: 130px;">Team / Group</th>
                  <th class="c" style="width: 44px;">Call 1</th>
                  <th class="c" style="width: 44px;">Call 2</th>
                  <th class="c" style="width: 44px;">Call 3</th>
                  <th style="width: 110px;">Status / Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div class="sheet-foot">
            <div>Total Enrolled: <strong>${total}</strong> &nbsp;|&nbsp; FestFlow Event Management</div>
            <div>Stage Coordinator Sign: _____________________ &nbsp;|&nbsp; Time: _________</div>
          </div>
        </div>
      </div>`;
  };

  const buildCodeSheet = () => {
    const festName = "FestFlow";
    const progName = prog ? `${prog.order ? `#${prog.order} ` : ""}${prog.name}` : "Event Code Sheet";
    const progCat = prog?.category || "General";
    const progSess = prog?.session || prog?.type || "Stage";
    const total = participants.length;

    const rows = participants.length > 0
      ? participants.map((p, i) => `
        <tr class="${i % 2 === 0 ? "even" : ""}">
          <td class="c" style="width: 36px; font-weight: bold;">${i + 1}</td>
          <td class="chest" style="width: 80px;">${p.chestNo || "—"}</td>
          <td class="name">${p.name}</td>
          <td class="team" style="width: 130px;">${p.groupName || "—"}</td>
          <td class="blank-box c" style="width: 85px; font-weight: bold; font-size: 14px;"></td>
          <td class="blank-box" style="width: 120px;"></td>
        </tr>`).join("")
      : Array.from({ length: 10 }).map((_, i) => `
        <tr class="${i % 2 === 0 ? "even" : ""}">
          <td class="c" style="width: 36px; font-weight: bold;">${i + 1}</td>
          <td class="chest blank-box" style="width: 80px;"></td>
          <td class="name blank-box"></td>
          <td class="team blank-box" style="width: 130px;"></td>
          <td class="blank-box c" style="width: 85px;"></td>
          <td class="blank-box" style="width: 120px;"></td>
        </tr>`).join("");

    return `
      <div class="sheet">
        <div>
          <div class="sheet-head">
            <div>
              <div class="sheet-title">CODE DRAWING SHEET</div>
              <div class="sheet-sub">${progName}</div>
              <div class="sheet-meta-badges">
                <span class="meta-tag">${progCat}</span>
                <span class="meta-tag">${progSess}</span>
                <span class="meta-tag" style="border-color: #6b7280; color: #4b5563;">Confidential</span>
              </div>
            </div>
            <div class="sheet-fest-box">
              <div class="sheet-fest-name">${festName}</div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Lot / Code Drawing</div>
            </div>
          </div>

          <div class="sheet-content">
            <table>
              <thead>
                <tr>
                  <th class="c" style="width: 36px;">Sl.</th>
                  <th style="width: 80px;">Chest #</th>
                  <th>Student Name</th>
                  <th style="width: 130px;">Team / Group</th>
                  <th class="c" style="width: 85px;">Drawn Code</th>
                  <th class="c" style="width: 120px;">Candidate Signature</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div class="sheet-foot">
            <div>Verified By Stage Manager: _____________________</div>
            <div>Stage Official Sign: _____________________ &nbsp;|&nbsp; Date: _________</div>
          </div>
        </div>
      </div>`;
  };

  const buildValuationSheet = (copyIndex = 0) => {
    const festName = "FestFlow";
    const progName = prog ? `${prog.order ? `#${prog.order} ` : ""}${prog.name}` : "Valuation Sheet";
    const progCat = prog?.category || "General";
    const progSess = prog?.session || prog?.type || "Stage";
    const rowCount = participants.length > 0 ? Math.max(participants.length + 2, 8) : 10;

    const rows = Array.from({ length: rowCount }).map((_, i) => `
      <tr class="${i % 2 === 0 ? "even" : ""}">
        <td class="c" style="width: 36px; font-weight: bold;">${i + 1}</td>
        <td class="blank-box c" style="width: 80px; font-weight: bold; font-size: 13px;"></td>
        <td class="blank-box c" style="width: 90px;"></td>
        <td class="blank-box" style="min-width: 150px;"></td>
        <td class="blank-box c" style="width: 80px; font-weight: bold;"></td>
        <td class="blank-box c" style="width: 75px; font-weight: bold;"></td>
      </tr>`).join("");

    return `
      <div class="sheet">
        <div>
          <div class="sheet-head">
            <div>
              <div class="sheet-title">JUDGE VALUATION SHEET</div>
              <div class="sheet-sub">${progName}</div>
              <div class="sheet-meta-badges">
                <span class="meta-tag">${progCat}</span>
                <span class="meta-tag">${progSess}</span>
                <span class="meta-tag" style="border-color: #b91c1c; color: #b91c1c; font-weight: 800;">Official Scoring</span>
              </div>
            </div>
            <div class="sheet-fest-box">
              <div class="sheet-fest-name">${festName}</div>
              <div class="sheet-copy-tag">JUDGE COPY #${copyIndex + 1}</div>
            </div>
          </div>

          <div class="sheet-content">
            <table>
              <thead>
                <tr>
                  <th class="c" style="width: 36px;">Sl.</th>
                  <th class="c" style="width: 80px;">Code #</th>
                  <th class="c" style="width: 90px;">Marks / 100</th>
                  <th>Judge Remarks / Comments</th>
                  <th class="c" style="width: 80px;">Total</th>
                  <th class="c" style="width: 75px;">Rank</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <div class="judge-box">
              <div class="judge-box-head">Judge Certification & Declaration</div>
              <div class="judge-box-body">
                <div class="judge-field">
                  <span class="judge-label">Judge Name</span>
                  <span class="judge-line"></span>
                </div>
                <div class="judge-field">
                  <span class="judge-label">Designation / Institution</span>
                  <span class="judge-line"></span>
                </div>
                <div class="judge-field">
                  <span class="judge-label">Phone / Contact</span>
                  <span class="judge-line"></span>
                </div>
                <div class="judge-field">
                  <span class="judge-label">Date</span>
                  <span class="judge-line"></span>
                </div>
                <div class="judge-field" style="grid-column: span 2;">
                  <span class="judge-label">Judge Signature</span>
                  <span class="judge-line" style="height: 26px;"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="sheet-foot">
            <div>Confidential Valuation Document &nbsp;|&nbsp; Prepared by ${festName}</div>
            <div>Chief Controller Sign: _____________________</div>
          </div>
        </div>
      </div>`;
  };

  // ── Complete HTML & Print CSS ──────────────────────────────────────────────
  const generateFullHtml = (sheetContents) => {
    const title = prog ? `${prog.name} - FestFlow Event Sheets` : "FestFlow Sheets";
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    ${SHEET_PRINT_CSS}
  </style>
</head>
<body>
  ${sheetContents}
</body>
</html>`;
  };

  // ── Print Execution (Iframe + Window fallback) ────────────────────────────
  const executePrint = (htmlContent, mode = "auto") => {
    if (mode === "window") {
      const win = window.open("", "_blank");
      if (!win) {
        alert("Popup blocked! Please allow popups or use the direct print button.");
        return;
      }
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch (e) {
          console.error("Print window error:", e);
        }
      }, 500);
      return;
    }

    // Direct invisible iframe print
    try {
      let iframe = document.getElementById("ff-print-frame");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "ff-print-frame";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        document.body.appendChild(iframe);
      }
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        }, 350);
      }
    } catch (err) {
      console.warn("Iframe print fallback to window:", err);
      const win = window.open("", "_blank");
      if (win) {
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
      }
    }
  };

  // Print all selected sheets
  const handlePrintAll = (mode = "auto") => {
    if (!selProg || !anySelected) return;

    const sheetBlocks = [];
    if (selectedPages.call) {
      sheetBlocks.push(buildCallList());
    }
    if (selectedPages.code) {
      sheetBlocks.push(buildCodeSheet());
    }
    if (selectedPages.valuation) {
      for (let i = 0; i < judgeCopies; i++) {
        sheetBlocks.push(buildValuationSheet(i));
      }
    }

    const fullHtml = generateFullHtml(sheetBlocks.join("\n"));
    executePrint(fullHtml, mode);
  };

  // Print single sheet from preview
  const handlePrintSingle = (sheetId) => {
    if (!selProg) return;
    let block = "";
    if (sheetId === "call") block = buildCallList();
    else if (sheetId === "code") block = buildCodeSheet();
    else if (sheetId === "valuation") {
      const copies = [];
      for (let i = 0; i < judgeCopies; i++) {
        copies.push(buildValuationSheet(i));
      }
      block = copies.join("\n");
    }
    const fullHtml = generateFullHtml(block);
    executePrint(fullHtml, "auto");
  };

  return (
    <div className="anim-fadeUp" style={{ padding: "4px 0 100px" }}>
      {/* ── Top Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.4px", color: dark ? "#e8e8f5" : "#0f172a" }}>
          Print Event Sheets
        </div>
        <div style={{ fontSize: 13, color: mutedTx, marginTop: 4 }}>
          Generate, preview, and print official Call Lists, Code Sheets, and Valuation Sheets for judges & stage managers
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div style={{
        padding: "16px",
        borderRadius: 14,
        background: cardBg,
        border: `1px solid ${border}`,
        marginBottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>
        {/* Session Filter & Category Filter Row */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Session toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Session:
            </span>
            <div style={{ display: "flex", gap: 3, borderRadius: 9, padding: 3, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
              {sessionTypes.map(t => (
                <button
                  key={t}
                  onClick={() => { setSessionFilter(t); setSelProg(""); }}
                  style={{
                    padding: "5px 12px",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 12,
                    fontWeight: 700,
                    background: sessionFilter === t ? ACCENT : "transparent",
                    color: sessionFilter === t ? "#ffffff" : mutedTx,
                    transition: "all 0.15s ease",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Category Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mutedTx, textTransform: "uppercase", letterSpacing: "0.5px", marginRight: 2 }}>
              Category:
            </span>
            {categories.map(c => {
              const active = categoryFilter === c;
              const count = c === "All"
                ? programs.length
                : programs.filter(p => p.category === c).length;
              const pillColor = c === "All" ? ACCENT : (catColor[c] || ACCENT);
              return (
                <button
                  key={c}
                  onClick={() => { setCategoryFilter(c); setSelProg(""); }}
                  className="btn btn-sm"
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 8,
                    background: active
                      ? (dark ? `${pillColor}24` : `${pillColor}15`)
                      : (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"),
                    color: active ? pillColor : mutedTx,
                    border: `1px solid ${active ? pillColor : border}`,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{c}</span>
                  <span style={{
                    fontSize: 10.5,
                    padding: "1px 5px",
                    borderRadius: 8,
                    fontWeight: 800,
                    background: active
                      ? (dark ? `${pillColor}38` : `${pillColor}22`)
                      : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                    color: active ? pillColor : mutedTx,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Event Dropdown Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, alignItems: "center" }}>
          <div>
            <input
              type="text"
              className="input"
              placeholder="Search event name or #…"
              value={progSearch}
              onChange={e => setProgSearch(e.target.value)}
              style={{ fontSize: 13, height: 40 }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <select
              className="input select"
              value={selProg}
              onChange={e => setSelProg(e.target.value)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                height: 40,
                width: "100%",
                paddingRight: 36,
                borderColor: selProg ? ACCENT : border,
              }}
            >
              <option value="">
                {filteredPrograms.length === 0
                  ? "No matching events found"
                  : `Select an Event (${filteredPrograms.length} available)…`}
              </option>
              {filteredPrograms.map(p => {
                const regCount = registrations.filter(r => r.programId === p.id).length;
                return (
                  <option key={p.id} value={p.id}>
                    {p.order ? `#${p.order} ` : ""}{p.name} — {p.category} · {p.session || p.type || "Stage"} ({regCount} teams entered)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* ── When Program is Selected ── */}
      {selProg && prog && (
        <div className="anim-fadeIn">
          {/* Program Overview Banner */}
          <div style={{
            padding: "16px 20px",
            borderRadius: 14,
            background: cardBg,
            border: `1px solid ${border}`,
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 14, color: mutedTx }}>
                  {prog.order ? `#${prog.order}` : ""}
                </span>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 18, color: dark ? "#e8e8f5" : "#0f172a" }}>
                  {prog.name}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: catColor[prog.category] || ACCENT,
                  background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}>
                  {prog.category}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: mutedTx,
                  background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}>
                  {prog.session || prog.type || "Stage"}
                </span>

                {/* Participating group chips */}
                {participatingGroups.length > 0 && (
                  <div style={{ display: "flex", gap: 5, alignItems: "center", marginLeft: 6 }}>
                    {participatingGroups.map(grp => (
                      <span
                        key={grp.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                          border: `1px solid ${border}`,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: grp.color || ACCENT }} />
                        {grp.name} ({grp.count})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, color: ACCENT }}>
                  {participants.length}
                </div>
                <div style={{ fontSize: 11, color: mutedTx, fontWeight: 600 }}>Participants Enrolled</div>
              </div>
            </div>
          </div>

          {/* Sheet Selector & Configuration Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}>
            {sheets.map(s => {
              const active = selectedPages[s.id];
              return (
                <div
                  key={s.id}
                  onClick={() => togglePage(s.id)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: active
                      ? (dark ? "rgba(241,77,77,0.08)" : "rgba(241,77,77,0.05)")
                      : cardBg,
                    border: `1px solid ${active ? ACCENT : border}`,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: `2px solid ${active ? ACCENT : (dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)")}`,
                      background: active ? ACCENT : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                      flexShrink: 0,
                    }}>
                      {active && <Ic name="check" size={13} color="#ffffff" />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: active ? (dark ? "#e8e8f5" : "#12121e") : mutedTx }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 11.5, color: mutedTx, marginTop: 3, lineHeight: 1.4 }}>
                        {s.desc}
                      </div>
                    </div>
                  </div>

                  {/* Valuation sheet copies configuration */}
                  {s.id === "valuation" && active && (
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{
                        paddingTop: 10,
                        borderTop: `1px solid ${border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: dark ? "#e8e8f5" : "#1f2937" }}>
                        Judges Copies:
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          style={{ width: 26, height: 26, padding: 0, borderRadius: 6, border: `1px solid ${border}` }}
                          onClick={() => setJudgeCopies(c => Math.max(1, c - 1))}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 800, fontSize: 13, minWidth: 20, textAlign: "center", color: ACCENT }}>
                          {judgeCopies}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          style={{ width: 26, height: 26, padding: 0, borderRadius: 6, border: `1px solid ${border}` }}
                          onClick={() => setJudgeCopies(c => Math.min(5, c + 1))}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Print Buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              style={{
                flex: 2,
                height: 46,
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onClick={() => handlePrintAll("auto")}
              disabled={!anySelected}
            >
              <Ic name="printer" size={17} /> Print Selected Sheets
            </button>

            <button
              className="btn btn-ghost"
              style={{
                flex: 1,
                height: 46,
                fontSize: 13,
                fontWeight: 700,
                border: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onClick={() => handlePrintAll("window")}
              disabled={!anySelected}
              title="Open full printable view in a new browser window"
            >
              <Ic name="copy" size={15} /> Open in Print Window
            </button>
          </div>

          {/* ── Live Sheet Preview Section ── */}
          <div style={{
            borderRadius: 14,
            border: `1px solid ${border}`,
            background: cardBg,
            overflow: "hidden",
            marginBottom: 40,
          }}>
            {/* Preview Navigation Tabs & Quick Print Button */}
            <div style={{
              padding: "12px 18px",
              background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              borderBottom: `1px solid ${border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "call", label: "Call List Preview" },
                  { id: "code", label: "Code Sheet Preview" },
                  { id: "valuation", label: `Valuation Sheet (${judgeCopies} Copies)` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setPreviewTab(tab.id)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      background: previewTab === tab.id
                        ? (dark ? "rgba(255,255,255,0.08)" : "#ffffff")
                        : "transparent",
                      color: previewTab === tab.id ? ACCENT : mutedTx,
                      boxShadow: previewTab === tab.id ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handlePrintSingle(previewTab)}
                style={{
                  border: `1px solid ${border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "6px 12px",
                }}
              >
                <Ic name="printer" size={13} /> Print This Sheet
              </button>
            </div>

            {/* Live Paper Canvas */}
            <div style={{
              padding: "24px 20px",
              background: dark ? "#11121d" : "#e5e7eb",
              display: "flex",
              justifyContent: "center",
              overflowX: "auto",
            }}>
              <style>{SHEET_PRINT_CSS}</style>
              <div
                style={{
                  width: "100%",
                  maxWidth: "210mm",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
                dangerouslySetInnerHTML={{
                  __html: previewTab === "call"
                    ? buildCallList()
                    : previewTab === "code"
                      ? buildCodeSheet()
                      : buildValuationSheet(0),
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no program selected */}
      {!selProg && (
        <div style={{ textAlign: "center", padding: "60px 0", color: mutedTx }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🖨️</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: dark ? "#e8e8f5" : "#1f2937", marginBottom: 6 }}>
            {filteredPrograms.length === 0 ? "No events found" : "Select an event to prepare sheets"}
          </div>
          <div style={{ fontSize: 13, maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
            {filteredPrograms.length === 0
              ? `There are no programs matching category "${categoryFilter}" in session "${sessionFilter}". Try selecting "All".`
              : "Choose an event from the dropdown above to configure, preview, and print official Call Lists, Code Sheets, and Valuation Sheets."}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintSection;
