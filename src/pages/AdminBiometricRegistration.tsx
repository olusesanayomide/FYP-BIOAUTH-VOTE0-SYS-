"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Fingerprint,
  Check,
  ScanFace,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  verifyAdminSetupToken,
  getAdminWebauthnRegistrationOptions,
  verifyAdminWebauthnRegistration,
} from "@/services/authService";

type BiometricState = "idle" | "verifying-token" | "permission" | "scanning" | "success" | "error";

const AdminBiometricRegistration = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const [biometricState, setBiometricState] = useState<BiometricState>("verifying-token");
  const [biometricProgress, setBiometricProgress] = useState(0);
  const [error, setError] = useState("");
  const [adminId, setAdminId] = useState<string>("");
  const [adminInfo, setAdminInfo] = useState<{ username: string; email: string } | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (!token) {
      setBiometricState("error");
      setError("Missing setup token. Please check your email for the correct link.");
      return;
    }

    const verifyToken = async () => {
      const response = await verifyAdminSetupToken(token);
      if (response.success && response.data) {
        setAdminId(response.data.id);
        setAdminInfo({ username: response.data.username, email: response.data.email });
        setBiometricState("permission");
      } else {
        setBiometricState("error");
        setError(response.error || "Invalid or expired setup token.");
      }
    };

    verifyToken();
  }, [token]);

  const startBiometricCapture = () => {
    setBiometricState("permission");
  };

  const grantPermission = async () => {
    if (isLoadingOptions || biometricState === "scanning") return;

    setIsLoadingOptions(true);
    setBiometricState("scanning");
    setBiometricProgress(0);

    try {
      const optionsResponse = await getAdminWebauthnRegistrationOptions(adminId);
      if (!optionsResponse.success || !optionsResponse.data) {
        setBiometricState("error");
        setError(optionsResponse.error || "Failed to get registration options");
        return;
      }

      // Start WebAuthn registration
      const { startRegistration } = await import('@simplewebauthn/browser');

      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: optionsResponse.data as any });
      } catch (err: any) {
        setBiometricState("error");
        if (err.name === 'InvalidStateError') {
          setError("This device or authenticator has already been registered.");
        } else {
          setError(err.message || "Biometric registration was cancelled or failed");
        }
        return;
      }

      // Send the response back to the server for verification
      const verifyResponse = await verifyAdminWebauthnRegistration(adminId, attResp);

      if (verifyResponse.success) {
        setBiometricProgress(100);
        setBiometricState("success");
        setTimeout(() => {
          router.push("/h3xG9Lz_admin?setup=complete");
        }, 3000);
      } else {
        setBiometricState("error");
        setError(verifyResponse.error || "Biometric registration failed");
      }
    } catch (err: any) {
      setBiometricState("error");
      setError(err.message || "Biometric capture failed");
    } finally {
      setIsLoadingOptions(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/25 to-background" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-primary/5 blur-[140px]" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">SecureVote Admin</span>
        </motion.div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Admin Setup</h2>
          <p className="text-muted-foreground">Complete your biometric enrollment to activate your account</p>
        </div>

        <div className="glass-card rounded-2xl p-8 border border-border/30 bg-background/40 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {biometricState === "verifying-token" && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 space-y-4"
              >
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Verifying setup token...</p>
              </motion.div>
            )}

            {biometricState === "permission" && (
              <motion.div
                key="permission"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <ScanFace className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Welcome, {adminInfo?.username}</h3>
                  <p className="text-sm text-muted-foreground italic">{adminInfo?.email}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your administrator account has been created. To secure your access, please enroll your biometric identity (Face ID, Touch ID, or Windows Hello).
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={grantPermission}
                  disabled={isLoadingOptions}
                  className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all duration-300 disabled:opacity-50"
                >
                  <Fingerprint className="w-5 h-5" />
                  Register Biometric
                </motion.button>
              </motion.div>
            )}

            {biometricState === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="relative w-24 h-24 mx-auto">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Fingerprint className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Creating Biometric Link</h3>
                  <p className="text-sm text-muted-foreground">Follow your browser's security prompt</p>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: `${biometricProgress}%` }}
                  />
                </div>
              </motion.div>
            )}

            {biometricState === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-2">
                  <Check className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Setup Complete!</h3>
                  <p className="text-muted-foreground text-sm">Your administrator account is now fully active</p>
                </div>
                <p className="text-xs text-muted-foreground animate-pulse">
                  Redirecting to login dashboard...
                </p>
              </motion.div>
            )}

            {biometricState === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Setup Failed</h3>
                  <p className="text-sm text-destructive mt-2">{error}</p>
                </div>
                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => {
                        if (adminId) setBiometricState("permission");
                        else window.location.reload();
                    }}
                    className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-all"
                  >
                    Try Again
                  </button>
                  <p className="text-xs text-muted-foreground">
                    If this persists, please contact your System Administrator.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminBiometricRegistration;
