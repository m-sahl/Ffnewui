// Micro-haptic vibration utility for mobile web & PWA
export const triggerHaptic = (type = "light") => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "light") navigator.vibrate(8);
      else if (type === "medium") navigator.vibrate(15);
      else if (type === "success") navigator.vibrate([10, 30, 10]);
      else if (type === "error") navigator.vibrate([15, 40, 15, 40, 15]);
      else if (typeof type === "number") navigator.vibrate(type);
    } catch {}
  }
};
