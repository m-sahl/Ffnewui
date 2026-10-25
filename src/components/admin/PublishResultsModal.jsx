import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const PLACES = ["1st", "2nd", "3rd"];
const GRADES = ["A", "B", "C", "—"];

const emptyEntry = { studentId: "", points: "", grade: "" };

export default function PublishResultsModal({
  open: openProp,
  onClose,
  event = { code: 1, name: "Event", category: "Junior" },
  students = [],
  onPublish,
  dark = false,
}) {
  const [previewOpen, setPreviewOpen] = useState(true);
  const open = openProp ?? previewOpen;
  const close = onClose ?? (() => setPreviewOpen(false));

  const [step, setStep] = useState(0);
  const [entries, setEntries] = useState([emptyEntry, emptyEntry, emptyEntry]);
  const [others, setOthers] = useState([]);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);

  // Palette matching FestFlow admin theme (light & dark)
  const theme = useMemo(() => {
    return dark
      ? {
          "--ff-bg": "#080912",
          "--ff-surface": "#131524",
          "--ff-surface-2": "rgba(255,255,255,0.06)",
          "--ff-border": "rgba(255,255,255,0.1)",
          "--ff-text": "#e8e8f5",
          "--ff-muted": "#9ca3af",
          "--ff-primary": "#f14d4d",
          "--ff-primary-2": "#ff5c5c",
          "--ff-primary-text": "#ff6b6b",
          "--ff-on-primary": "#ffffff",
          "--ff-danger": "#f87171",
        }
      : {
          "--ff-bg": "#fdfaf9",
          "--ff-surface": "#ffffff",
          "--ff-surface-2": "#f4f4f5",
          "--ff-border": "rgba(0,0,0,0.09)",
          "--ff-text": "#18181b",
          "--ff-muted": "#71717a",
          "--ff-primary": "#f14d4d",
          "--ff-primary-2": "#ff5c5c",
          "--ff-primary-text": "#b91c1c",
          "--ff-on-primary": "#ffffff",
          "--ff-danger": "#dc2626",
        };
  }, [dark]);

  // Load existing results if already published or draft
  useEffect(() => {
    if (open) {
      setStep(0);
      setTouched(false);
      setDone(false);

      if (event?.results?.entries && Array.isArray(event.results.entries) && event.results.entries.length >= 3) {
        setEntries(
          event.results.entries.map((e) => ({
            studentId: e.studentId ? String(e.studentId) : "",
            points: e.points !== undefined && e.points !== null ? String(e.points) : "",
            grade: e.grade || "",
          }))
        );
        setOthers(
          Array.isArray(event.results.otherGrades)
            ? event.results.otherGrades.map((o) => ({
                studentId: o.studentId ? String(o.studentId) : "",
                grade: o.grade || "",
              }))
            : []
        );
      } else {
        setEntries([emptyEntry, emptyEntry, emptyEntry]);
        setOthers([]);
      }
    }
  }, [open, event]);

  const preview = step === PLACES.length;
  const current = entries[Math.min(step, PLACES.length - 1)];
  const isLast = step === PLACES.length - 1;

  // Students already placed in other positions can't be picked twice
  const takenIds = useMemo(
    () => [
      ...entries.filter((_, i) => i !== step).map((e) => String(e.studentId)),
      ...others.map((o) => String(o.studentId)),
    ].filter(Boolean),
    [entries, others, step]
  );

  const placedIds = entries.map((e) => String(e.studentId)).filter(Boolean);
  const updateOther = (i, patch) =>
    setOthers((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const removeOther = (i) => setOthers((prev) => prev.filter((_, idx) => idx !== i));
  const addOther = () => setOthers((prev) => [...prev, { studentId: "", grade: "" }]);
  const othersValid = others.every((o) => o.studentId && o.grade);

  const update = (patch) =>
    setEntries((prev) => prev.map((e, i) => (i === step ? { ...e, ...patch } : e)));

  const valid = current.studentId && current.points !== "" && current.grade;
  const stepComplete = (i) => entries[i].studentId && entries[i].points !== "" && entries[i].grade;

  const next = () => {
    if (preview) {
      onPublish?.({
        event,
        results: entries.map((e, i) => ({ place: i + 1, ...e, studentId: String(e.studentId) })),
        otherGrades: others.map((o) => ({ ...o, studentId: String(o.studentId) })),
      });
      close();
      return;
    }
    setTouched(true);
    if (!valid || (isLast && !othersValid)) return;
    setTouched(false);
    setStep(step + 1);
  };

  const back = () => {
    setTouched(false);
    setStep(Math.max(0, step - 1));
  };

  // Close on Escape or Enter on Preview/Success
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "Enter") {
        if (done) {
          e.preventDefault();
          close();
        } else if (preview) {
          e.preventDefault();
          next();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, done, preview, next, close]);

  if (!open) {
    if (openProp !== undefined) return null;
    return (
      <div style={theme} className="grid min-h-screen place-items-center">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="h-12 rounded-xl px-6 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg,var(--ff-primary-2),var(--ff-primary))",
            color: "var(--ff-on-primary)",
          }}
        >
          Open publish modal
        </button>
      </div>
    );
  }

  const modalContent = (
    <div
      style={theme}
      className="ff-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-title"
    >
      <style>{`
        .ff-modal-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: flex-end; justify-content: center;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }
        @media (min-width: 640px) {
          .ff-modal-overlay { align-items: center; padding: 16px; }
        }
        .ff-modal-box {
          position: relative; width: 100%; max-width: 440px;
          overflow: hidden; border-top-left-radius: 24px; border-top-right-radius: 24px;
          border: 1px solid var(--ff-border);
          background: var(--ff-surface);
          color: var(--ff-text);
          box-shadow: 0 30px 80px -20px rgba(0,0,0,.35), 0 0 0 1px rgba(241,77,77,.08);
          box-sizing: border-box;
        }
        @media (min-width: 640px) {
          .ff-modal-box { border-radius: 24px; }
        }
        @keyframes ff-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ff-pop { from { opacity: 0; transform: translateY(24px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes ff-step { from { opacity: 0; transform: translateX(14px) } to { opacity: 1; transform: none } }
        .ff-anim { animation-fill-mode: both; }
        .ff-input {
          height: 48px; border-radius: 14px; padding: 0 16px;
          font-size: 14.5px; background: var(--ff-surface-2);
          border: 1px solid var(--ff-border); color: var(--ff-text);
          outline: none; box-sizing: border-box; font-family: inherit;
          transition: border-color 0.15s;
        }
        .ff-input:focus { border-color: var(--ff-primary); }
      `}</style>

      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="ff-anim"
        style={{
          position: "absolute",
          inset: 0,
          cursor: "default",
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: "none",
          animation: "ff-fade .25s ease both",
        }}
      />

      {/* Modal Card */}
      <div
        className="ff-anim ff-modal-box"
        style={{ animation: "ff-pop .35s cubic-bezier(.2,.8,.2,1) both" }}
      >
        {/* Glow */}
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: -96,
            left: "50%",
            height: 192,
            width: 320,
            transform: "translateX(-50%)",
            borderRadius: "9999px",
            opacity: 0.12,
            filter: "blur(48px)",
            background: "var(--ff-primary)",
          }}
        />

        {/* Header: item no · event · category */}
        <header
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            borderBottom: "1px solid var(--ff-border)",
            padding: "16px 20px",
          }}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              height: 38,
              minWidth: 38,
              borderRadius: 10,
              padding: "0 8px",
              fontSize: 13,
              fontWeight: 800,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: "var(--ff-surface-2)",
              color: "var(--ff-primary-text)",
            }}
            title="Item number"
          >
            #{event.code ?? event.order ?? ""}
          </span>
          <h2
            id="publish-title"
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
              fontSize: 17,
              fontWeight: 700,
              margin: 0,
            }}
          >
            {event.name}
          </h2>
          <span
            style={{
              borderRadius: 9999,
              border: "1px solid rgba(241,77,77,.35)",
              padding: "4px 12px",
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--ff-primary-text)",
              background: "rgba(241,77,77,.06)",
            }}
          >
            {event.category}
          </span>
        </header>

        {done ? (
          <Success event={event} onClose={close} entries={entries} others={others} students={students} />
        ) : (
          <div style={{ position: "relative", padding: "20px" }}>
            {/* Stepper */}
            <ol
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 24,
                padding: 0,
                listStyle: "none",
              }}
              aria-label="Result positions"
            >
              {PLACES.map((p, i) => {
                const active = i === step;
                const complete = i < step && stepComplete(i);
                return (
                  <li
                    key={p}
                    style={{
                      display: "flex",
                      flex: i === PLACES.length - 1 ? "none" : 1,
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => i < step && setStep(i)}
                      aria-current={active ? "step" : undefined}
                      aria-label={`${p} place`}
                      style={{
                        display: "grid",
                        placeItems: "center",
                        height: 36,
                        width: 36,
                        borderRadius: "50%",
                        border: complete || active ? "none" : "1px solid var(--ff-border)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: i < step ? "pointer" : "default",
                        transition: "all 0.25s",
                        background:
                          complete || active
                            ? "linear-gradient(135deg,var(--ff-primary-2),var(--ff-primary))"
                            : "transparent",
                        color: complete || active ? "var(--ff-on-primary)" : "var(--ff-muted)",
                        boxShadow: active ? "0 0 0 4px rgba(241,77,77,.2)" : "none",
                      }}
                    >
                      {complete ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </button>
                    {i < PLACES.length - 1 && (
                      <span
                        style={{
                          margin: "0 8px",
                          height: 2,
                          flex: 1,
                          overflow: "hidden",
                          borderRadius: 9999,
                          background: "var(--ff-border)",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            height: "100%",
                            transition: "all 0.4s ease",
                            width: i < step ? "100%" : "0%",
                            background: "var(--ff-primary)",
                          }}
                        />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>

            {preview ? (
              <div key="preview" className="ff-anim" style={{ animation: "ff-step .3s ease both" }}>
                <Summary entries={entries} others={others} students={students} />
                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    type="button"
                    onClick={back}
                    style={{
                      height: 44,
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid var(--ff-border)",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ff-muted)",
                      background: "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    Edit results
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    style={{
                      height: 48,
                      width: "100%",
                      borderRadius: 12,
                      border: "none",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      background: "linear-gradient(135deg,var(--ff-primary-2),var(--ff-primary))",
                      color: "var(--ff-on-primary)",
                      boxShadow: "0 8px 24px -8px rgba(241,77,77,.6)",
                    }}
                  >
                    Publish results
                  </button>
                </div>
              </div>
            ) : (
              <form
                key={step}
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
                className="ff-anim"
                style={{ animation: "ff-step .3s ease both" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field label={`${PLACES[step]} place`} error={touched && !current.studentId && "Select a student"}>
                    <SearchableStudentSelect
                      value={current.studentId}
                      onChange={(val) => update({ studentId: val })}
                      students={students}
                      disabledIds={takenIds}
                      error={touched && !current.studentId}
                      placeholder="Select student"
                      theme={theme}
                      ariaLabel={`${PLACES[step]} place student`}
                    />
                  </Field>

                  <Field label="Points" error={touched && current.points === "" && "Enter points"}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      value={current.points}
                      onChange={(e) => update({ points: e.target.value })}
                      className="ff-input"
                      style={{ width: "100%" }}
                    />
                  </Field>

                  <Field label="Grade" error={touched && !current.grade && "Pick a grade"}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }} role="radiogroup" aria-label="Grade">
                      {GRADES.map((g) => {
                        const on = current.grade === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => update({ grade: g })}
                            style={{
                              height: 44,
                              borderRadius: 12,
                              border: `1px solid ${on ? "var(--ff-primary)" : "var(--ff-border)"}`,
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              background: on ? "rgba(241,77,77,.15)" : "var(--ff-surface-2)",
                              color: on ? "var(--ff-primary-text)" : "var(--ff-muted)",
                            }}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  {/* Other grades — last step only */}
                  {isLast && others.length > 0 && (
                    <section style={{ borderTop: "1px solid var(--ff-border)", paddingTop: 16 }}>
                      <h3 style={{ margin: "0 0 12px 0", fontSize: 13, fontWeight: 600, color: "var(--ff-muted)" }}>
                        Other grades
                      </h3>

                      <div style={{ maxHeight: 176, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 8 }}>
                        {others.map((o, i) => {
                          const incomplete = touched && (!o.studentId || !o.grade);
                          return (
                            <div
                              key={i}
                              className="ff-anim"
                              style={{ animation: "ff-step .25s ease both", display: "flex", alignItems: "center", gap: 8 }}
                            >
                              <SearchableStudentSelect
                                ariaLabel="Student"
                                value={o.studentId}
                                onChange={(val) => updateOther(i, { studentId: val })}
                                students={students}
                                disabledIds={[
                                  ...placedIds,
                                  ...others
                                    .filter((_, xi) => xi !== i)
                                    .map((x) => String(x.studentId))
                                    .filter(Boolean),
                                ]}
                                error={incomplete && !o.studentId}
                                placeholder="Select student"
                                height={44}
                                style={{ flex: 1, minWidth: 0 }}
                                theme={theme}
                              />
                              <select
                                aria-label="Grade"
                                value={o.grade}
                                onChange={(e) => updateOther(i, { grade: e.target.value })}
                                className="ff-input"
                                style={{
                                  width: 80,
                                  height: 44,
                                  padding: "0 8px",
                                  appearance: "none",
                                  textAlign: "center",
                                  borderColor: incomplete && !o.grade ? "var(--ff-danger)" : "var(--ff-border)",
                                }}
                              >
                                <option value="">Grade</option>
                                {GRADES.filter((g) => g !== "—").map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => removeOther(i)}
                                aria-label="Remove"
                                style={{
                                  display: "grid",
                                  placeItems: "center",
                                  height: 44,
                                  width: 44,
                                  flexShrink: 0,
                                  borderRadius: 12,
                                  border: "none",
                                  background: "transparent",
                                  color: "var(--ff-muted)",
                                  cursor: "pointer",
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                  <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {touched && !othersValid && (
                        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "var(--ff-danger)" }}>
                          Complete or remove the empty rows
                        </p>
                      )}
                    </section>
                  )}
                </div>

                {/* Step Actions inside form */}
                {isLast ? (
                  <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        type="button"
                        onClick={back}
                        style={{
                          height: 44,
                          borderRadius: 12,
                          padding: "0 16px",
                          fontSize: 14,
                          fontWeight: 600,
                          border: "none",
                          background: "transparent",
                          color: "var(--ff-muted)",
                          cursor: "pointer",
                        }}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={addOther}
                        style={{
                          height: 44,
                          flex: 1,
                          borderRadius: 12,
                          border: "1px solid var(--ff-primary)",
                          fontSize: 13.5,
                          fontWeight: 700,
                          background: "rgba(241,77,77,0.06)",
                          color: "var(--ff-primary-text)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        + Other grade
                      </button>
                    </div>
                    <button
                      type="submit"
                      style={{
                        height: 48,
                        width: "100%",
                        borderRadius: 12,
                        border: "none",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background: "linear-gradient(135deg,var(--ff-primary-2),var(--ff-primary))",
                        color: "var(--ff-on-primary)",
                        boxShadow: "0 8px 24px -8px rgba(241,77,77,.6)",
                      }}
                    >
                      Preview results
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    {step > 0 ? (
                      <button
                        type="button"
                        onClick={back}
                        style={{
                          height: 44,
                          borderRadius: 12,
                          padding: "0 16px",
                          fontSize: 14,
                          fontWeight: 600,
                          border: "none",
                          background: "transparent",
                          color: "var(--ff-muted)",
                          cursor: "pointer",
                        }}
                      >
                        Back
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="submit"
                      style={{
                        height: 44,
                        borderRadius: 12,
                        padding: "0 24px",
                        border: "none",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background: "linear-gradient(135deg,var(--ff-primary-2),var(--ff-primary))",
                        color: "var(--ff-on-primary)",
                        boxShadow: "0 8px 24px -8px rgba(241,77,77,.6)",
                      }}
                    >
                      {`${PLACES[step + 1]} place`}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

/* ---------- helpers ---------- */

function SearchableStudentSelect({
  value,
  onChange,
  students = [],
  disabledIds = [],
  placeholder = "Select student",
  height = 48,
  error = false,
  style = {},
  theme = {},
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const [menuCoords, setMenuCoords] = useState(null);

  const selectedStudent = useMemo(
    () => students.find((s) => String(s.id) === String(value)),
    [students, value]
  );

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase().trim();
    const cleanQ = q.replace(/^#/, "").trim();
    return students.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const raw = (s.rawName || "").toLowerCase();
      const chest = s.chestNo !== undefined && s.chestNo !== null ? String(s.chestNo).toLowerCase() : "";
      const id = String(s.id || "").toLowerCase();
      return (
        name.includes(q) ||
        raw.includes(q) ||
        (chest && (chest.includes(q) || (cleanQ && chest.includes(cleanQ)))) ||
        (cleanQ && id.includes(cleanQ))
      );
    });
  }, [students, searchTerm]);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const estimatedMenuHeight = 260;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openAbove = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
    const targetWidth = Math.min(Math.max(rect.width, 280), viewportWidth - 24);

    let left = rect.left;
    if (left + targetWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - targetWidth - 12);
    }

    setMenuCoords({
      top: openAbove ? undefined : rect.bottom + 6,
      bottom: openAbove ? viewportHeight - rect.top + 6 : undefined,
      left,
      width: targetWidth,
      maxHeight: openAbove ? Math.min(280, rect.top - 16) : Math.min(280, spaceBelow - 16),
      openAbove,
    });
  }, []);

  const openMenu = () => {
    updateCoords();
    setIsOpen(true);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const closeMenu = () => {
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  useEffect(() => {
    if (!isOpen) return;

    updateCoords();
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);

    const handleScroll = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      updateCoords();
    };

    const handleMouseDown = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      closeMenu();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updateCoords);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updateCoords);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, updateCoords]);

  // Scroll active item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const optionNode = listRef.current.children[highlightedIndex];
      if (optionNode && optionNode.scrollIntoView) {
        optionNode.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      closeMenu();
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredStudents.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredStudents.length - 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      let targetStudent = null;
      if (highlightedIndex >= 0 && highlightedIndex < filteredStudents.length) {
        targetStudent = filteredStudents[highlightedIndex];
      } else {
        targetStudent = filteredStudents.find((s) => !disabledIds.includes(String(s.id)));
      }

      if (targetStudent && !disabledIds.includes(String(targetStudent.id))) {
        onChange(String(targetStudent.id));
        closeMenu();
        triggerRef.current?.focus();
      }
      return;
    }

    if (e.key === "Tab") {
      closeMenu();
    }
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openMenu();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      openMenu();
      setSearchTerm(e.key);
      setHighlightedIndex(0);
    }
  };

  const handleSelect = (studentId, isDisabled) => {
    if (isDisabled) return;
    onChange(String(studentId));
    closeMenu();
    triggerRef.current?.focus();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    closeMenu();
  };

  return (
    <div style={{ position: "relative", ...style }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className="ff-input"
        style={{
          width: "100%",
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: "pointer",
          textAlign: "left",
          padding: "0 12px 0 16px",
          borderColor: error ? "var(--ff-danger)" : isOpen ? "var(--ff-primary)" : "var(--ff-border)",
          boxShadow: isOpen ? "0 0 0 3px rgba(241,77,77,0.15)" : "none",
          outline: "none",
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: selectedStudent ? "var(--ff-text)" : "var(--ff-muted)",
            fontWeight: selectedStudent ? 600 : 400,
            fontSize: 14,
          }}
        >
          {selectedStudent ? selectedStudent.name : placeholder}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {selectedStudent && (
            <span
              role="button"
              tabIndex={0}
              title="Clear selection"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClear(e);
              }}
              style={{
                display: "grid",
                placeItems: "center",
                height: 20,
                width: 20,
                borderRadius: "50%",
                color: "var(--ff-muted)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--ff-danger)";
                e.currentTarget.style.background = "rgba(241,77,77,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--ff-muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </span>
          )}

          <svg
            style={{
              transition: "transform 0.2s ease",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              color: "var(--ff-muted)",
            }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Floating Dropdown Portal */}
      {isOpen &&
        menuCoords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              ...theme,
              position: "fixed",
              top: menuCoords.top,
              bottom: menuCoords.bottom,
              left: menuCoords.left,
              width: menuCoords.width,
              zIndex: 100000,
              background: "var(--ff-surface)",
              color: "var(--ff-text)",
              border: "1px solid var(--ff-border)",
              borderRadius: 16,
              boxShadow: "0 18px 45px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "ff-pop .18s cubic-bezier(.2,.8,.2,1) both",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                e.preventDefault();
                closeMenu();
                triggerRef.current?.focus();
              }
            }}
          >
            {/* Search Input Bar */}
            <div
              style={{
                padding: "8px 10px",
                borderBottom: "1px solid var(--ff-border)",
                background: "var(--ff-surface)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 10,
                  background: "var(--ff-surface-2)",
                  border: "1px solid var(--ff-border)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ff-muted)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>

                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search student or chest no..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "var(--ff-text)",
                    fontSize: 13,
                    width: "100%",
                    fontFamily: "inherit",
                  }}
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setHighlightedIndex(-1);
                      searchInputRef.current?.focus();
                    }}
                    title="Clear search"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--ff-muted)",
                      cursor: "pointer",
                      padding: 0,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Students List */}
            <div
              ref={listRef}
              role="listbox"
              style={{
                flex: 1,
                overflowY: "auto",
                maxHeight: menuCoords.maxHeight ? Math.min(220, menuCoords.maxHeight - 55) : 220,
                padding: "6px",
              }}
            >
              {filteredStudents.length === 0 ? (
                <div
                  style={{
                    padding: "16px 12px",
                    textAlign: "center",
                    color: "var(--ff-muted)",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>No students found</div>
                  {searchTerm && (
                    <div style={{ fontSize: 11.5, opacity: 0.8 }}>
                      No matches for &ldquo;{searchTerm}&rdquo;
                    </div>
                  )}
                </div>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isSelected = String(s.id) === String(value);
                  const isDisabled = disabledIds.includes(String(s.id)) && !isSelected;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={s.id}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isDisabled}
                      onClick={() => handleSelect(s.id, isDisabled)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 10,
                        fontSize: 13,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.45 : 1,
                        background: isSelected
                          ? "rgba(241,77,77,0.12)"
                          : isHighlighted
                          ? "var(--ff-surface-2)"
                          : "transparent",
                        color: isSelected ? "var(--ff-primary-text)" : "var(--ff-text)",
                        fontWeight: isSelected ? 700 : 500,
                        transition: "background 0.12s",
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {s.name}
                      </span>

                      {isSelected && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--ff-primary)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      )}

                      {isDisabled && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: "var(--ff-muted)",
                            background: "var(--ff-surface-2)",
                            padding: "2px 6px",
                            borderRadius: 6,
                            flexShrink: 0,
                          }}
                        >
                          Selected
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--ff-muted)" }}>
        {label}
      </span>
      {children}
      {error && (
        <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "var(--ff-danger)", fontWeight: 500 }}>
          {error}
        </span>
      )}
    </label>
  );
}

function Success({ event, onClose, entries, others, students }) {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 24px 24px", textAlign: "center" }}>
      <div
        style={{
          marginBottom: 16,
          display: "grid",
          placeItems: "center",
          height: 64,
          width: 64,
          borderRadius: "50%",
          background: "linear-gradient(135deg,var(--ff-primary-2),var(--ff-primary))",
          color: "var(--ff-on-primary)",
          boxShadow: "0 10px 24px -6px rgba(241,77,77,.5)",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Results published</h3>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ff-muted)" }}>
        {event.name} · {event.category} is now live.
      </p>
      <div style={{ marginTop: 20, width: "100%", textAlign: "left" }}>
        <Summary entries={entries} others={others} students={students} />
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: 24,
          height: 44,
          borderRadius: 12,
          border: "1px solid var(--ff-border)",
          padding: "0 24px",
          fontSize: 14,
          fontWeight: 600,
          background: "transparent",
          color: "var(--ff-text)",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        Done
      </button>
    </div>
  );
}

/* Read-only results list: 1st/2nd/3rd + other grades */
function Summary({ entries, others, students }) {
  const nameOf = (id) => students.find((s) => String(s.id) === String(id))?.name ?? "—";
  const chip = {
    background: "rgba(241,77,77,.1)",
    color: "var(--ff-primary-text)",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          overflow: "hidden",
          borderRadius: 16,
          border: "1px solid var(--ff-border)",
        }}
      >
        {PLACES.map((p, i) => (
          <li
            key={p}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "var(--ff-surface-2)",
              borderTop: i > 0 ? "1px solid var(--ff-border)" : "none",
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                height: 32,
                width: 40,
                flexShrink: 0,
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 800,
                background: "linear-gradient(135deg,var(--ff-primary-2),var(--ff-primary))",
                color: "var(--ff-on-primary)",
              }}
            >
              {p}
            </span>
            <span style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 600 }}>
              {nameOf(entries[i].studentId)}
            </span>
            <span style={{ fontSize: 12, color: "var(--ff-muted)", fontVariantNumeric: "tabular-nums" }}>
              {entries[i].points} pts
            </span>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                height: 28,
                width: 28,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                ...chip,
              }}
            >
              {entries[i].grade}
            </span>
          </li>
        ))}
      </ul>

      {others.length > 0 && (
        <div>
          <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--ff-muted)" }}>
            Other grades
          </h4>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              maxHeight: 144,
              overflowY: "auto",
              borderRadius: 16,
              border: "1px solid var(--ff-border)",
            }}
          >
            {others.map((o, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  borderTop: i > 0 ? "1px solid var(--ff-border)" : "none",
                }}
              >
                <span style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                  {nameOf(o.studentId)}
                </span>
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: 28,
                    width: 28,
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    ...chip,
                  }}
                >
                  {o.grade}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
