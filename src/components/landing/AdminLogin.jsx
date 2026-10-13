import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TextPinModal } from "../common/AuthModals";
import { navigate } from "../../utils/router";

// Dedicated /admin sign-in page (no link to it anywhere in the public UI)
const AdminLogin = ({ dark, onLogin }) => {
  const login = useMutation(api.auth.login);
  // Verified on the server; returns {ok, token, user} or null
  const verifyAdmin = async (pass) => {
    const r = await login({ role: "admin", secret: pass });
    return r.ok ? r : null;
  };
  return (
    <div style={{ minHeight: "100vh", background: dark ? "#07080f" : "#fdfaf9" }}>
      <TextPinModal
        title="Admin Sign In" subtitle="Enter your admin password to continue"
        verify={verifyAdmin} dark={dark}
        onSuccess={onLogin}
        onClose={() => navigate("/")}
      />
    </div>
  );
};

export default AdminLogin;
