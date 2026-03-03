"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Shield, Fingerprint, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ThemeToggle } from "@/components/ThemeToggle";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
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

  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Authentication failed');
      }

      setStatus("success");
      // Set the token inside a cookie called admin_token so the middleware reads it
      Cookies.set("admin_token", data.data.accessToken, { expires: 1, path: "/" });

      setTimeout(() => router.push("/h3xG9Lz_admin/dashboard"), 1500);
    } catch (err: any) {
      console.error('Login error:', err);
      setStatus("error");
      setErrorMessage(err.message || "Access Denied. Unauthorized attempt recorded.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const borderColor =
    status === "error"
      ? "border-destructive/65 dark:border-destructive/50"
      : status === "success"
        ? "border-success/65 dark:border-success/50"
        : "border-primary/30 dark:border-primary/15";

  const glowClass =
    status === "error"
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
      {/* Login form only */}
      <div className="w-full flex items-center justify-center px-4 relative">
        {/* Encrypted session badge */}
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
          className={`w-full max-w-[420px] bg-card/95 dark:bg-card/30 backdrop-blur-lg ${glowClass} rounded-2xl p-8 relative overflow-hidden transition-colors duration-500 shadow-[0_18px_45px_-24px_hsl(var(--foreground)/0.35)] dark:shadow-none ${borderColor} ${status === "error" ? "animate-shake" : ""}`}
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

          {/* Top edge highlight */}
          <div className="absolute top-0 left-4 right-4 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(var(--primary), 0.25), transparent)" }} />

          {/* Header */}
          <div className="relative z-10 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-3.5 h-3.5 text-primary/80 dark:text-primary/60" />
                <span className="text-[11px] tracking-[0.25em] text-primary/80 dark:text-primary/60 uppercase font-medium">Admin Portal</span>
              </div>
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">Secure Access</h2>
            </motion.div>
            <motion.p
              className="text-sm text-muted-foreground mt-2 leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              Enter administrator credentials to access the election command center.
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs text-foreground/80 dark:text-muted-foreground tracking-wide uppercase">Email</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@votecore-secure.com"
                  className="w-full h-12 px-4 rounded-lg bg-background/95 dark:bg-muted/40 border border-border/80 dark:border-border/50 text-foreground text-sm placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/70 dark:focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  required
                  disabled={status === "loading" || status === "success"}
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-primary group-focus-within:w-full transition-all duration-500" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs text-foreground/80 dark:text-muted-foreground tracking-wide uppercase">Password</label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full h-12 px-4 pr-12 rounded-lg bg-background/95 dark:bg-muted/40 border border-border/80 dark:border-border/50 text-foreground text-sm placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/70 dark:focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  required
                  disabled={status === "loading" || status === "success"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 dark:text-muted-foreground/50 hover:text-primary transition-colors duration-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-primary group-focus-within:w-full transition-all duration-500" />
              </div>
            </div>

            {/* Remember device */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                className={`w-4 h-4 rounded border transition-all duration-300 flex items-center justify-center ${rememberDevice ? "bg-primary/20 border-primary/50" : "border-border/80 dark:border-border/50"}`}
                onClick={() => setRememberDevice(r => !r)}
              >
                {rememberDevice && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-sm bg-primary" />
                )}
              </div>
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="sr-only"
              />
              <span className="text-xs text-foreground/75 dark:text-muted-foreground">Remember this secure device</span>
            </label>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className="w-full h-12 rounded-lg text-sm font-medium relative overflow-hidden transition-all duration-300 disabled:opacity-70 text-primary-foreground"
              style={{
                background: status === "success"
                  ? `linear-gradient(135deg, hsl(var(--success)), color-mix(in srgb, hsl(var(--success)) 80%, #000 20%))`
                  : `linear-gradient(135deg, hsl(var(--primary)), color-mix(in srgb, hsl(var(--primary)) 80%, #000 20%))`,
                boxShadow: status === "success"
                  ? "0 0 25px hsla(var(--success), 0.2)"
                  : "0 0 25px hsla(var(--primary), 0.15)",
              }}
              whileHover={status === "idle" ? { scale: 1.02, boxShadow: "0 0 35px hsla(var(--primary), 0.3)" } : {}}
              whileTap={status === "idle" ? { scale: 0.98 } : {}}
            >
              <AnimatePresence mode="wait">
                {status === "idle" && (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-semibold tracking-wide">
                    Access Control Center
                  </motion.span>
                )}
                {status === "loading" && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-3">
                    <Fingerprint className="w-4 h-4 animate-pulse" />
                    <span className="font-medium">Verifying Credentials…</span>
                    <div className="absolute bottom-0 left-0 h-0.5 bg-primary-foreground/30 animate-scan-line w-full" />
                  </motion.div>
                )}
                {status === "success" && (
                  <motion.span key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="font-semibold tracking-wide">
                    Access Granted
                  </motion.span>
                )}
                {status === "error" && (
                  <motion.span key="error-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-semibold tracking-wide">
                    Access Control Center
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          {/* Error message */}
          <AnimatePresence>
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mt-4 text-center rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2"
              >
                <p className="text-xs text-destructive">{errorMessage || "Access Denied. Unauthorized attempt recorded."}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <p className="text-[10px] text-muted-foreground/65 dark:text-muted-foreground/40 text-center mt-6 tracking-wide">
            All administrative actions are logged and monitored.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;

