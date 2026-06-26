import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { ACCENT } from "../../styles/DesignTokens";
import Ic from "../common/Ic";

const PrintSection = ({ dark }) => {
  const { programs, students, registrations, groups } = useApp();
  const [category, setCategory] = useState("Junior");
  const [selProg, setSelProg] = useState("");
  const [selectedPages, setSelectedPages] = useState({ call: true, code: true, valuation: true });

  const catPrograms = programs.filter(p => p.category === category);
  const switchCat = (cat) => { setCategory(cat); setSelProg(""); };
  const prog = programs.find(p => p.id === selProg);

  const getParticipants = () => {
    if (!selProg) return [];
    const regs = registrations.filter(r => r.programId === selProg);
    return regs.flatMap(r => {
      const grp = groups.find(g => g.id === r.groupId);
      const grpStudents = students[r.groupId] || [];
      return r.participantIds.map(id => {
        const s = grpStudents.find(st => st.id === id);
        return s ? { ...s, groupName: grp?.name, groupColor: grp?.color } : null;
      }).filter(Boolean);
    });
  };

  const participants = getParticipants();
  const byChest = [...participants].sort((a, b) => parseInt(a.chestNo) - parseInt(b.chestNo));
  const criteria = prog?.criteria?.filter(Boolean) || ["Criteria 1", "Criteria 2"];

  const pages = [
    { id: "call", label: "Call List", icon: "📋", desc: "Chest No. + Name · Sorted by chest" },
    { id: "code", label: "Code Sheet", icon: "🔏", desc: "Chest No. + Name + Code + Sign" },
    { id: "valuation", label: "Valuation Sheet", icon: "📝", desc: "Scoring sheet for judges" },
  ];

  const togglePage = (id) => setSelectedPages(p => ({ ...p, [id]: !p[id] }));
  const anySelected = Object.values(selectedPages).some(Boolean);

  const renderSheetHtml = (sheetId) => {
    const name = prog?.name || "Program";
    const cat = prog?.category || "";

    const heading = (title) => `
      <div class="sheet-header">
        <div class="sheet-title">${title}</div>
        <div class="sheet-meta"><span>${cat}</span><span class="sep">•</span><span>${name}</span></div>
      </div>`;

    if (sheetId === "call") {
      const rows = byChest.map((p, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
        <td style="font-weight:800;font-size:15px;color:#6c63ff;width:110px">${p.chestNo}</td>
        <td style="font-weight:600">${p.name}</td>
      </tr>`).join("");
      return `<div class="sheet">${heading("Call List")}
        <table>
          <thead><tr><th>Chest No.</th><th>Name</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="2" style="text-align:center;color:#999;padding:20px">No participants</td></tr>'}</tbody>
        </table>
        <div class="footer">Total: ${byChest.length} participants · FF Fest</div>
      </div>`;
    }

    if (sheetId === "code") {
      const rows = byChest.map((p, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
        <td style="font-weight:800;font-size:15px;color:#6c63ff;width:110px">${p.chestNo}</td>
        <td style="font-weight:600">${p.name}</td>
        <td class="blank" style="min-width:90px"></td>
        <td class="blank" style="min-width:90px"></td>
      </tr>`).join("");
      return `<div class="sheet">${heading("Code Sheet")}
        <table>
          <thead><tr><th>Chest No.</th><th>Name</th><th style="text-align:center">Code</th><th style="text-align:center">Sign</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px">No participants</td></tr>'}</tbody>
        </table>
        <div class="footer">Total: ${byChest.length} participants · FF Fest</div>
      </div>`;
    }

    if (sheetId === "valuation") {
      const crits = criteria.map(c => `<th style="text-align:center;min-width:80px">${c}</th>`).join("");
      const rows = byChest.map((p, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
        <td style="font-weight:800;font-size:15px;color:#6c63ff;width:110px">${p.chestNo}</td>
        <td style="font-weight:600">${p.name}</td>
        ${criteria.map(() => '<td class="blank"></td>').join("")}
        <td class="blank" style="min-width:70px"></td>
        <td class="blank" style="min-width:70px"></td>
      </tr>`).join("");
      return `<div class="sheet">${heading("Valuation Sheet")}
        <table>
          <thead><tr><th>Chest No.</th><th>Name</th>${crits}<th style="text-align:center">Total</th><th style="text-align:center">Prize</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">No participants</td></tr>'}</tbody>
        </table>
        <div class="footer">Total: ${byChest.length} participants · FF Fest</div>
      </div>`;
    }
    return "";
  };

  const handlePrint = () => {
    const selected = pages.filter(p => selectedPages[p.id]);
    if (!selProg || selected.length === 0) return;

    const win = window.open("", "_blank");
    const docContent = selected.map(p => renderSheetHtml(p.id)).join("");

    win.document.write(`
      <html>
        <head>
          <title>FF Fest - Print</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1a1a2e; margin: 0; padding: 0; background: #f4f4f9; }
            .sheet { background: white; width: 210mm; min-height: 297mm; padding: 20mm; margin: 10mm auto; box-shadow: 0 0 20px rgba(0,0,0,0.05); box-sizing: border-box; position: relative; page-break-after: always; }
            .sheet-header { border-bottom: 2px solid #edeff5; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sheet-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; font-weight: 800; color: #1a1a2e; text-transform: uppercase; letter-spacing: -0.5px; }
            .sheet-meta { ... color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px; }
            .sep { margin: 0 10px; color: #d1d5db; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; padding: 12px 15px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; border-bottom: 1px solid #edeff5; }
            td { padding: 14px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
            .blank { border: 1px solid #e5e7eb; background: #fafafa; }
            .footer { position: absolute; bottom: 20mm; left: 20mm; right: 20mm; border-top: 1px solid #edeff5; padding-top: 10px; font-size: 10px; color: #9ca3af; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            @media print {
              body { background: white; }
              .sheet { margin: 0; box-shadow: none; }
              @page { size: A4; margin: 0; }
            }
          </style>
        </head>
        <body>${docContent}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="anim-fadeUp">
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 className="ff-display fw-800" style={{ fontSize: 18, marginBottom: 16 }}>Print Documentation</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {["Sub-Junior", "Junior", "Senior"].map(c => (
            <button key={c} className="btn" onClick={() => switchCat(c)}
              style={{
                flex: 1, height: 42,
                background: category === c ? ACCENT : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
                color: category === c ? "white" : (dark ? "#9ca3af" : "#6b7280"),
                fontWeight: 700, fontSize: 11
              }}>{c}</button>
          ))}
        </div>

        <label className="label">Select Program</label>
        <select className="input select" style={{ marginBottom: 24, height: 48 }} value={selProg} onChange={e => setSelProg(e.target.value)}>
          <option value="">Choose an event...</option>
          {catPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {selProg && (
          <div className="anim-fadeIn">
            <label className="label">Select Sheets to Print</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 30 }}>
              {pages.map(p => (
                <div key={p.id} onClick={() => togglePage(p.id)} className="card" style={{ padding: "14px 18px", cursor: "pointer", border: selectedPages[p.id] ? `1.5px solid ${ACCENT}` : undefined, background: selectedPages[p.id] ? `${ACCENT}08` : undefined, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 22 }}>{p.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{p.desc}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${selectedPages[p.id] ? ACCENT : (dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)")}`, background: selectedPages[p.id] ? ACCENT : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selectedPages[p.id] && <Ic name="check" size={14} color="white" />}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", height: 52 }} onClick={handlePrint} disabled={!anySelected}>
              <Ic name="printer" size={18} /> Print Selected Sheets
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintSection;
