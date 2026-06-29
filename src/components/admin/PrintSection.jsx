import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { ACCENT } from "../../styles/DesignTokens";
import Ic from "../common/Ic";

const PrintSection = ({ dark }) => {
  const { programs, students, registrations, groups } = useApp();
  const [session,  setSession]  = useState("Stage");
  const [category, setCategory] = useState("All");
  const [selProg,  setSelProg]  = useState("");
  const [selectedPages, setSelectedPages] = useState({ call: true, code: true, valuation: true });

  const mutedTx = dark ? "#6b7280" : "#9ca3af";
  const border  = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  const sessions   = ["Stage", "Off-Stage", "General"];
  const categories = ["All", "Sub-Junior", "Junior", "Senior"];

  const filteredPrograms = programs.filter(p =>
    p.session === session && (category === "All" || p.category === category)
  );

  const prog = programs.find(p => p.id === selProg);

  const getParticipants = () => {
    if (!selProg) return [];
    return registrations
      .filter(r => r.programId === selProg)
      .flatMap(r => {
        const grp = groups.find(g => g.id === r.groupId);
        return (r.participantIds || []).map(id => {
          const s = (students[r.groupId] || []).find(st => st.id === id);
          return s ? { ...s, groupName: grp?.name } : null;
        }).filter(Boolean);
      })
      .sort((a, b) => parseInt(a.chestNo) - parseInt(b.chestNo));
  };

  const participants = getParticipants();
  const criteria     = prog?.criteria?.filter(Boolean) || [];
  const togglePage   = (id) => setSelectedPages(p => ({ ...p, [id]: !p[id] }));
  const anySelected  = Object.values(selectedPages).some(Boolean);

  const sheets = [
    { id: "call",      label: "Call List",       desc: "Chest No. · Name · Group" },
    { id: "code",      label: "Code Sheet",      desc: "Chest No. · Name · Code · Signature" },
    { id: "valuation", label: "Valuation Sheet", desc: "Scoring sheet for judges" },
  ];

  // ── Print HTML generator ───────────────────────────────────────────────────
  const buildSheet = (id) => {
    const festName = "FestFlow";
    const progName = prog?.name || "";
    const progCat  = prog?.category || "";
    const progSess = prog?.session  || "";
    const total    = participants.length;

    const header = `
      <div class="sheet-head">
        <div>
          <div class="sheet-title">${id === "call" ? "Call List" : id === "code" ? "Code Sheet" : "Valuation Sheet"}</div>
          <div class="sheet-sub">${progName} &nbsp;·&nbsp; ${progCat} &nbsp;·&nbsp; ${progSess}</div>
        </div>
        <div class="sheet-fest">${festName}</div>
      </div>`;

    const footer = `<div class="sheet-foot">Total participants: ${total} &nbsp;|&nbsp; Prepared by ${festName}</div>`;

    if (id === "call") {
      const rows = participants.map((p, i) => `
        <tr class="${i % 2 === 0 ? "even" : ""}">
          <td class="chest">${p.chestNo}</td>
          <td class="name">${p.name}</td>
          <td>${p.groupName || ""}</td>
        </tr>`).join("") || `<tr><td colspan="3" class="empty">No participants registered</td></tr>`;
      return `
        <div class="sheet">
          ${header}
          <table>
            <thead><tr><th>Chest No.</th><th>Name</th><th>Group</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${footer}
        </div>`;
    }

    if (id === "code") {
      const rows = participants.map((p, i) => `
        <tr class="${i % 2 === 0 ? "even" : ""}">
          <td class="chest">${p.chestNo}</td>
          <td class="name">${p.name}</td>
          <td class="blank"></td>
          <td class="blank sign"></td>
        </tr>`).join("") || `<tr><td colspan="4" class="empty">No participants registered</td></tr>`;
      return `
        <div class="sheet">
          ${header}
          <table>
            <thead><tr><th>Chest No.</th><th>Name</th><th class="c">Code</th><th class="c">Signature</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${footer}
        </div>`;
    }

    if (id === "valuation") {
      const critHeaders = criteria.map(c => `<th class="c">${c}</th>`).join("") +
        `<th class="c">Total</th><th class="c">Rank</th>`;
      const critCells   = criteria.map(() => `<td class="blank c"></td>`).join("") +
        `<td class="blank c"></td><td class="blank c"></td>`;
      const rows = participants.map((p, i) => `
        <tr class="${i % 2 === 0 ? "even" : ""}">
          <td class="chest">${p.chestNo}</td>
          <td class="name">${p.name}</td>
          ${critCells}
        </tr>`).join("") || `<tr><td colspan="${4 + criteria.length}" class="empty">No participants registered</td></tr>`;

      const judgeBox = `
        <div class="judge-box">
          <div class="judge-row"><span>Judge Name:</span><span class="judge-line"></span></div>
          <div class="judge-row"><span>Signature:</span><span class="judge-line"></span></div>
          <div class="judge-row"><span>Date:</span><span class="judge-line short"></span></div>
        </div>`;

      return `
        <div class="sheet">
          ${header}
          <table>
            <thead><tr><th>Chest No.</th><th>Name</th>${critHeaders}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${judgeBox}
          ${footer}
        </div>`;
    }
    return "";
  };

  const handlePrint = () => {
    const selected = sheets.filter(s => selectedPages[s.id]);
    if (!selProg || selected.length === 0) return;

    const html = selected.map(s => buildSheet(s.id)).join("");
    const win  = window.open("", "_blank");

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${prog?.name || "Print"} — FestFlow</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', serif; background: #f0f0f0; color: #000; }

    .sheet {
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 20mm 22mm;
      margin: 12mm auto;
      position: relative;
      page-break-after: always;
      border: 1px solid #ccc;
    }

    /* Header */
    .sheet-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      margin-bottom: 18px;
      border-bottom: 2px solid #000;
    }
    .sheet-title {
      font-size: 22px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .sheet-sub {
      font-size: 12px;
      color: #444;
      margin-top: 4px;
      font-style: italic;
    }
    .sheet-fest {
      font-size: 13px;
      font-weight: bold;
      text-align: right;
      letter-spacing: 1px;
      text-transform: uppercase;
      border: 1.5px solid #000;
      padding: 4px 10px;
      border-radius: 3px;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead tr {
      background: #000;
      color: #fff;
    }
    th {
      padding: 9px 12px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: bold;
      font-family: Arial, sans-serif;
    }
    th.c { text-align: center; }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #ddd;
      vertical-align: middle;
    }
    tr.even td { background: #f8f8f8; }
    td.chest {
      font-weight: bold;
      font-size: 15px;
      width: 90px;
      font-family: Arial, sans-serif;
    }
    td.name  { font-weight: 600; width: 35%; }
    td.blank { background: #fff !important; border: 1px solid #bbb; min-width: 70px; height: 34px; }
    td.blank.c { text-align: center; }
    td.sign  { min-width: 110px; }
    td.empty {
      text-align: center;
      color: #999;
      padding: 24px;
      font-style: italic;
    }

    /* Judge box */
    .judge-box {
      margin-top: 28px;
      border: 1px solid #000;
      padding: 14px 18px;
      max-width: 320px;
    }
    .judge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      font-size: 13px;
      font-weight: 600;
    }
    .judge-row:last-child { margin-bottom: 0; }
    .judge-line {
      flex: 1;
      border-bottom: 1px solid #000;
      height: 18px;
      display: block;
    }
    .judge-line.short { max-width: 120px; }

    /* Footer */
    .sheet-foot {
      position: absolute;
      bottom: 12mm;
      left: 20mm;
      right: 20mm;
      border-top: 1px solid #ccc;
      padding-top: 6px;
      font-size: 10px;
      color: #666;
      text-align: center;
      font-family: Arial, sans-serif;
      letter-spacing: 0.5px;
    }

    @media print {
      body { background: #fff; }
      .sheet { margin: 0; border: none; box-shadow: none; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>${html}</body>
</html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  return (
    <div className="anim-fadeUp" style={{ padding: "4px 0 100px" }}>

      {/* Session toggle */}
      <div style={{ marginBottom: 14 }}>
        <div className="label" style={{ marginBottom: 8 }}>Session</div>
        <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", padding: 4 }}>
          {sessions.map(s => (
            <button key={s} onClick={() => { setSession(s); setSelProg(""); }} style={{
              flex: 1, padding: "8px 4px", border: "none", cursor: "pointer", borderRadius: 7,
              fontFamily: "inherit", fontSize: 12, fontWeight: 700,
              background: session === s ? (dark ? "rgba(255,255,255,0.08)" : "white") : "transparent",
              color: session === s ? (dark ? "#e8e8f5" : "#12121e") : mutedTx,
              boxShadow: session === s ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s",
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div style={{ marginBottom: 16 }}>
        <div className="label" style={{ marginBottom: 8 }}>Category</div>
        <div style={{ display: "flex", gap: 6 }}>
          {categories.map(c => (
            <button key={c} onClick={() => { setCategory(c); setSelProg(""); }} className="btn btn-sm"
              style={{ flex: 1, fontWeight: 700, background: category === c ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), color: category === c ? "#0a0b12" : mutedTx }}>
              {c === "Sub-Junior" ? "Sub" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Program select */}
      <div style={{ marginBottom: 20 }}>
        <div className="label" style={{ marginBottom: 8 }}>Program</div>
        <select className="input select" value={selProg} onChange={e => setSelProg(e.target.value)}>
          <option value="">Choose a program…</option>
          {filteredPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Program info + participants count */}
      {selProg && (
        <div className="anim-fadeIn">
          <div style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${border}`, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{prog?.name}</div>
              <div style={{ fontSize: 12, color: mutedTx, marginTop: 2 }}>{prog?.category} · {prog?.type} · {prog?.session}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, color: ACCENT }}>{participants.length}</div>
              <div style={{ fontSize: 11, color: mutedTx }}>participants</div>
            </div>
          </div>

          {/* Sheet selector */}
          <div className="label" style={{ marginBottom: 10 }}>Select Sheets</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
            {sheets.map(s => (
              <button key={s.id} onClick={() => togglePage(s.id)} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                borderRadius: 12, border: `1px solid ${selectedPages[s.id] ? ACCENT : border}`,
                background: selectedPages[s.id] ? `rgba(245,158,11,0.06)` : "transparent",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                transition: "all 0.15s",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${selectedPages[s.id] ? ACCENT : (dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)")}`,
                  background: selectedPages[s.id] ? ACCENT : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {selectedPages[s.id] && <Ic name="check" size={12} color="#0a0b12" />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: mutedTx, marginTop: 2 }}>{s.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <button className="btn btn-primary" style={{ width: "100%", height: 48, fontSize: 14 }}
            onClick={handlePrint} disabled={!anySelected}>
            <Ic name="printer" size={16} /> Print Selected
          </button>
        </div>
      )}

      {!selProg && filteredPrograms.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: mutedTx }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🖨️</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>No programs</div>
          <div style={{ fontSize: 12 }}>No {category === "All" ? "" : category} programs in {session}</div>
        </div>
      )}
    </div>
  );
};

export default PrintSection;
