import { useState, useCallback, useEffect, createContext, useContext } from "react";
import Ic from "./Ic";

const ToastCtx = createContext(null);

export const useToast = () => useContext(ToastCtx);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 280);
    }, duration);
  }, []);

  const icons = { success: "check", error: "x", info: "info" };

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} ${t.exiting ? "toast-exit" : ""}`}>
            <Ic name={icons[t.type] || "info"} size={15} />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
