"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Fingerprint, Lock, Mail, ArrowLeft, Loader2, Check, ScanFace } from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ThemeToggle } from "@/components/ThemeToggle";

// Import our new services
import {
  checkAdminStatus,
  getAdminAuthenticationOptions,
  verifyAdminAuthentication,
  requestAdminOtp,
  verifyAdminOtp,
} from "@/services/authService";

type Stage = "credentials" | "biometric" | "otp" | "success";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("credentials");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shakeField, setShakeField] = useState<string | null>(null);

  const [adminId, setAdminId] = useState("");
  const [isAdminRegistered, setIsAdminRegistered] = useState(true);

  // OTP states
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);

  // Biometric states
  const [biometricProgress, setBiometricProgress] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    setTilt({ x: y * -4, y: x * 4 });
  }, []);

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const triggerShake = (field: string) => {
    setShakeField(field);
    setTimeout(() => setShakeField(null), 500);
  };

  const getFriendlyWebAuthnError = (err: any) => {
    const name = err?.name || "";
    const message = String(err?.message || "");
    const combined = `${name} ${message}`.toLowerCase();

    if (
      name === "NotAllowedError" ||
      combined.includes("timed out") ||
      combined.includes("not allowed") ||
      combined.includes("privacy-considerations-client")
    ) {
      return "Biometric verification was canceled or timed out. Please try again or use OTP fallback.";
    }

    if (name === "AbortError") {
      return "Biometric verification was interrupted. Please try again.";
    }

    if (name === "SecurityError" || name === "NotSupportedError") {
      return "Biometric verification is not supported in this browser/device setup.";
    }

    if (name === "InvalidStateError") {
      return "Your biometric credential is not available on this device. Try another device or use OTP fallback.";
    }

    return "Biometric verification failed. Please try again or use OTP fallback.";
  };

  const storeTokenAndRedirect = (accessToken: string, user?: any) => {
    const cookieOptions = rememberDevice
      ? { expires: 7, path: "/" as const }
      : { path: "/" as const };
    Cookies.set("admin_token", accessToken, cookieOptions);

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    const targetPath = isAdminRegistered ? "/h3xG9Lz_admin/dashboard" : "/h3xG9Lz_admin/dashboard/security/enroll";
    setTimeout(() => router.push(targetPath), 1500);
  };

  const startBiometricScan = (accessToken: string, user: any) => {
    setBiometricProgress(0);
    const interval = setInterval(() => {
      setBiometricProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setStage("success");
            setStatus("success");
            storeTokenAndRedirect(accessToken, user);
          }, 400);
          return 100;
        }
        return prev + 2;
      });
    }, 40);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage("Email is required");
      triggerShake("email");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // 1. Check admin status
      const statusResp = await checkAdminStatus(email);
      if (!statusResp.success || !statusResp.data) {
        setStatus("error");
        setErrorMessage(statusResp.error || "Admin not found");
        setTimeout(() => setStatus("idle"), 3000);
        return;
      }

      const { adminId: fetchedAdminId, isRegistered } = statusResp.data;
      setAdminId(fetchedAdminId);
      setIsAdminRegistered(isRegistered);

      if (!isRegistered) {
        setStatus("idle");
        setErrorMessage("Biometrics not registered. Please log in with OTP to set up secure access.");
        // We don't return here, we let them use the OTP button which is already visible
        return;
      }

      // 2. Get auth options
      const optionsResp = await getAdminAuthenticationOptions(fetchedAdminId);
      if (!optionsResp.success || !optionsResp.data) {
        setStatus("error");
        setErrorMessage(optionsResp.error || "Failed to start biometric auth");
        setTimeout(() => setStatus("idle"), 3000);
        return;
      }

      const opts = optionsResp.data as any;
      const { startAuthentication } = await import('@simplewebauthn/browser');

      setStatus("idle");
      setStage("biometric");

      let asseResp;
      try {
        asseResp = await startAuthentication({ optionsJSON: opts });
      } catch (err: any) {
        setStage("credentials");
        setStatus("error");
        setErrorMessage(getFriendlyWebAuthnError(err));
        setTimeout(() => setStatus("idle"), 3000);
        return;
      }

      // 3. Verify auth
      const verifyResp = await verifyAdminAuthentication(fetchedAdminId, asseResp);
      if (verifyResp.success && verifyResp.data?.accessToken) {
        startBiometricScan(verifyResp.data.accessToken, verifyResp.data.user);
      } else {
        setStage("credentials");
        setStatus("error");
        setErrorMessage(verifyResp.error || "Biometric verification failed");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err: any) {
      setStage("credentials");
      setStatus("error");
      setErrorMessage(err.message || "An unexpected error occurred");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const handleRequestOtpFallback = async () => {
    if (!email) {
      setErrorMessage("Email is required for OTP");
      triggerShake("email");
      return;
    }

    setOtpLoading(true);
    setErrorMessage("");

    let currentAdminId = adminId;
    if (!currentAdminId) {
      const statusResp = await checkAdminStatus(email);
      if (!statusResp.success || !statusResp.data) {
        setErrorMessage(statusResp.error || "Admin not found");
        setOtpLoading(false);
        return;
      }
      currentAdminId = statusResp.data.adminId;
      setAdminId(currentAdminId);
      setIsAdminRegistered(statusResp.data.isRegistered);
    }

    const resp = await requestAdminOtp(currentAdminId);
    setOtpLoading(false);

    if (resp.success) {
      setStage("otp");
    } else {
      setErrorMessage(resp.error || "Failed to request OTP");
    }
  };

  const handleVerifyOtpFallback = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setErrorMessage("Please enter all 6 digits");
      triggerShake("otp");
      return;
    }

    setOtpLoading(true);
    setErrorMessage("");

    const resp = await verifyAdminOtp(adminId, otpCode);
    setOtpLoading(false);

    if (resp.success && resp.data?.accessToken) {
      setStage("success");
      setStatus("success");
      storeTokenAndRedirect(resp.data.accessToken, resp.data.user);
    } else {
      setErrorMessage(resp.error || "Invalid OTP");
      triggerShake("otp");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const borderColor =
    status === "error" || errorMessage
      ? "border-destructive/65 dark:border-destructive/50"
      : status === "success"
        ? "border-success/65 dark:border-success/50"
        : "border-primary/30 dark:border-primary/15";

  const glowClass =
    status === "error" || errorMessage
      ? "glow-crimson"
      : status === "success"
        ? "glow-emerald"
        : "glow-cyan";

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-background">
      <div className="absolute top-6 left-6 z-50">
        <ThemeToggle />
      </div>
      {/* Grid overlay */}
      <div className="absolute inset-0 grid-overlay pointer-events-none" />

      {/* Ambient corner lights */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsla(var(--primary), 0.03) 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsla(var(--secondary), 0.03) 0%, transparent 70%)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, hsla(var(--primary), 0.02) 0%, transparent 60%)" }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full animate-float-particle pointer-events-none"
          style={{
            background: "hsl(var(--primary))",
            opacity: 0.2,
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${i * 1.2}s`,
            animationDuration: `${5 + i}s`,
          }}
        />
      ))}
      <div className="w-full flex items-center justify-center px-4 relative">
        <motion.div
          className="absolute top-6 right-6 flex items-center gap-2 text-xs rounded-full px-3 py-1.5 bg-background/90 dark:bg-background/30 border border-border/80 dark:border-border/40 text-foreground/80 dark:text-secondary/70 shadow-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Shield className="w-3.5 h-3.5" />
          <span className="tracking-wider">Encrypted Session</span>
        </motion.div>

        <motion.div
          ref={cardRef}
          className={`w-full max-w-[420px] bg-card/95 dark:bg-card/30 backdrop-blur-lg ${glowClass} rounded-2xl p-8 relative overflow-hidden transition-colors duration-500 shadow-[0_18px_45px_-24px_hsl(var(--foreground)/0.35)] dark:shadow-none ${borderColor} ${(status === "error" || errorMessage) && shakeField === "email" ? "animate-shake" : ""}`}
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 0.15s ease-out",
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Light sweep */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div
              className="absolute -inset-full h-full w-1/3 animate-light-sweep"
              style={{ background: "linear-gradient(90deg, transparent, hsla(var(--primary), 0.03), transparent)" }}
            />
          </div>

          <div className="absolute top-0 left-4 right-4 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(var(--primary), 0.25), transparent)" }} />

          <div className="relative z-10 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-3.5 h-3.5 text-primary/80 dark:text-primary/60" />
                <span className="text-[11px] tracking-[0.25em] text-primary/80 dark:text-primary/60 uppercase font-medium">Admin Portal</span>
              </div>
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">Secure Access</h2>
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {stage === "credentials" && (
              <motion.div key="credentials" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
                <form onSubmit={handleCredentialsSubmit} className="relative z-10 space-y-5">
                  <div className="space-y-2 mb-2">
                    <label className="text-xs text-foreground/80 dark:text-muted-foreground tracking-wide uppercase">Email Address</label>
                    <motion.div animate={shakeField === "email" ? { x: [0, -4, 4, -4, 4, 0] } : {}} transition={{ duration: 0.4 }} className="relative group">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrorMessage(""); }}
                        placeholder="admin@votecore-secure.com"
                        className="w-full h-12 px-4 rounded-lg bg-background/95 dark:bg-muted/40 border border-border/80 dark:border-border/50 text-foreground text-sm placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/70 dark:focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                        required
                        disabled={status === "loading" || status === "success"}
                      />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-primary group-focus-within:w-full transition-all duration-500" />
                    </motion.div>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div className={`w-4 h-4 rounded border transition-all duration-300 flex items-center justify-center ${rememberDevice ? "bg-primary/20 border-primary/50" : "border-border/80 dark:border-border/50"}`} onClick={() => setRememberDevice(r => !r)}>
                      {rememberDevice && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-sm bg-primary" />}
                    </div>
                    <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} className="sr-only" />
                    <span className="text-xs text-foreground/75 dark:text-muted-foreground">Remember this secure device</span>
                  </label>

                  <motion.button type="submit" disabled={status === "loading" || status === "success"} className="w-full h-12 rounded-lg text-sm font-medium relative overflow-hidden transition-all duration-300 disabled:opacity-70 text-primary-foreground"
                    style={{
                      background: `linear-gradient(135deg, hsl(var(--primary)), color-mix(in srgb, hsl(var(--primary)) 80%, #000 20%))`,
                      boxShadow: "0 0 25px hsla(var(--primary), 0.15)",
                    }}
                    whileHover={status === "idle" ? { scale: 1.02, boxShadow: "0 0 35px hsla(var(--primary), 0.3)" } : {}}
                    whileTap={status === "idle" ? { scale: 0.98 } : {}}
                  >
                    <AnimatePresence mode="wait">
                      {status === "idle" && <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-semibold tracking-wide">Continue to Biometric Verification</motion.span>}
                      {status === "loading" && (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="font-medium">Authenticating…</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <button type="button" onClick={handleRequestOtpFallback} disabled={status === "loading" || otpLoading} className="w-full h-12 rounded-lg text-sm font-medium transition-all duration-300 bg-muted/40 hover:bg-muted/60 disabled:opacity-70 text-foreground flex items-center justify-center gap-2">
                    {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Login with OTP
                  </button>
                </form>
              </motion.div>
            )}

            {stage === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <Mail className="w-10 h-10 text-primary/80 mx-auto" />
                  <p className="text-sm text-foreground/80 dark:text-muted-foreground">We sent a 6-digit code to your email.</p>
                </div>
                <motion.div animate={shakeField === "otp" ? { x: [0, -4, 4, -4, 4, 0] } : {}} transition={{ duration: 0.4 }}>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <input key={index} ref={(el) => { otpRefs.current[index] = el; }} type="text" maxLength={1} value={digit} onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)} className={`w-11 h-12 text-center text-lg font-bold border-2 rounded-lg focus:outline-none transition-all bg-background/95 dark:bg-muted/40 text-foreground ${digit ? "border-primary/70 dark:border-primary/50" : "border-border/80 dark:border-border/50"}`} />
                    ))}
                  </div>
                </motion.div>
                <button onClick={handleVerifyOtpFallback} disabled={otpLoading || otp.join("").length !== 6} className="w-full h-12 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-70 text-primary-foreground" style={{ background: `linear-gradient(135deg, hsl(var(--primary)), color-mix(in srgb, hsl(var(--primary)) 80%, #000 20%))` }}>
                  {otpLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Verify OTP"}
                </button>
                <button onClick={() => setStage("credentials")} className="w-full py-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </motion.div>
            )}

            {stage === "biometric" && (
              <motion.div key="biometric" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center py-6">
                <div className="relative mb-6">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                    <motion.circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - biometricProgress / 100)} transition={{ duration: 0.1 }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                      {biometricProgress < 50 ? <ScanFace className="w-9 h-9 text-primary" /> : <Fingerprint className="w-9 h-9 text-primary/80" />}
                    </motion.div>
                  </div>
                </div>
                <h2 className="text-md font-semibold text-foreground mb-1">{biometricProgress < 50 ? "Verifying biometric signature…" : "Completing handshake…"}</h2>
                <p className="text-xs text-muted-foreground">{biometricProgress}% complete</p>
              </motion.div>
            )}

            {stage === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="flex flex-col items-center text-center py-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="w-16 h-16 rounded-full bg-success/15 border-2 border-success/40 flex items-center justify-center mb-4" style={{ boxShadow: "0 0 40px -8px hsl(var(--success) / 0.3)" }}>
                  <Check className="w-8 h-8 text-success" />
                </motion.div>
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg font-bold text-foreground mb-1">Access Granted</motion.h2>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-xs text-muted-foreground">Entering Control Center…</motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {errorMessage && stage !== "success" && (
              <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }} className="mt-4 text-center rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2">
                <p className="text-xs text-destructive">{errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-muted-foreground/65 dark:text-muted-foreground/40 text-center mt-6 tracking-wide">
            All administrative actions are logged and monitored.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
