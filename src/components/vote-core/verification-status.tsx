"use client"

import { ShieldCheck, Loader2 } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { getWebAuthnRegistrationOptions, verifyWebAuthnRegistration, getCurrentUser, requestLoginOtp, verifyLoginOtp } from "@/services/authService"
import { useToast } from "@/hooks/use-toast"

type BiometricState = "idle" | "scanning" | "success" | "error";

export function VerificationStatus({
  compact = false,
  allowReRegister = false,
}: {
  compact?: boolean;
  allowReRegister?: boolean;
}) {
  const [isVerified, setIsVerified] = useState(false);
  const [biometricState, setBiometricState] = useState<BiometricState>("idle");
  const [biometricError, setBiometricError] = useState("");
  const { toast } = useToast();
  const [otpStage, setOtpStage] = useState<"idle" | "sent" | "verified">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [userIdentifier, setUserIdentifier] = useState<string>("");
  const [showOtpModal, setShowOtpModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsVerified(user.biometricStatus === 'VERIFIED' || user.registration_completed === true);
        setUserIdentifier(user.email || user.matricNumber || user.matric_no || "");
      } catch (e) { }
    }
    const loadUser = async () => {
      try {
        const resp = await getCurrentUser();
        if (resp.success && resp.data) {
          setUserIdentifier(resp.data.email || resp.data.matricNumber || resp.data.matric_no || "");
        }
      } catch (e) { }
    };
    loadUser();
  }, []);

  const requiresOtp = useMemo(() => {
    return allowReRegister || !isVerified;
  }, [allowReRegister, isVerified]);

  const isReRegisterFlow = allowReRegister && isVerified;
  const resetOtpState = () => {
    setOtpStage("idle");
    setOtpCode("");
    setOtpError("");
    setOtpSending(false);
    setOtpVerifying(false);
  };

  const handleRequestOtp = async () => {
    if (!userIdentifier) {
      setOtpError("Missing email or matric number for OTP.");
      return;
    }
    setOtpSending(true);
    setOtpError("");
    try {
      const resp = await requestLoginOtp(userIdentifier);
      if (resp.success) {
        setOtpStage("sent");
        toast({ title: "OTP sent", description: "Check your email for the verification code." });
      } else {
        setOtpError(resp.error || "Failed to send OTP");
        toast({ title: "OTP failed", description: resp.error || "Failed to send OTP" });
      }
    } catch (e: any) {
      setOtpError(e.message || "Failed to send OTP");
      toast({ title: "OTP failed", description: e.message || "Failed to send OTP" });
    }
    setOtpSending(false);
  };

  const handleVerifyOtp = async () => {
    if (!userIdentifier) {
      setOtpError("Missing email or matric number for OTP.");
      return;
    }
    if (!otpCode || otpCode.length < 6) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }
    setOtpVerifying(true);
    setOtpError("");
    try {
      const resp = await verifyLoginOtp(userIdentifier, otpCode);
      if (resp.success) {
        setOtpStage("verified");
        setOtpCode("");
        toast({ title: "OTP verified", description: "Proceeding to biometric registration..." });
        if (isReRegisterFlow && showOtpModal) {
          setShowOtpModal(false);
          handleStartVerification();
          resetOtpState();
          setOtpVerifying(false);
          return;
        }
      } else {
        setOtpError(resp.error || "OTP verification failed");
        toast({ title: "OTP failed", description: resp.error || "OTP verification failed" });
      }
    } catch (e: any) {
      setOtpError(e.message || "OTP verification failed");
      toast({ title: "OTP failed", description: e.message || "OTP verification failed" });
    }
    setOtpVerifying(false);
  };

  const handleStartVerification = async () => {
    setBiometricState("scanning");
    setBiometricError("");

    try {
      const optionsResponse = await getWebAuthnRegistrationOptions();
      if (!optionsResponse.success || !optionsResponse.data) {
        setBiometricState("error");
        setBiometricError("Failed to initialize registration");
        return;
      }

      const { startRegistration } = await import('@simplewebauthn/browser');

      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: optionsResponse.data as any });
      } catch (error: any) {
        setBiometricState("error");
        setBiometricError(error.message || "Capture cancelled or failed");
        return;
      }

      const verifyResponse = await verifyWebAuthnRegistration(attResp);

      if (verifyResponse.success) {
        // Fetch fresh user data from server to ensure status is synced
        const freshUserResp = await getCurrentUser();
        if (freshUserResp.success && freshUserResp.data) {
          localStorage.setItem("user", JSON.stringify(freshUserResp.data));
          setIsVerified(freshUserResp.data.biometricStatus === 'VERIFIED');
          setBiometricState("success");
          toast({
            title: "Biometric updated",
            description: "Your biometric registration is complete.",
          });
        } else {
          // Fallback if profile fetch fails
          setBiometricState("success");
          setIsVerified(true);
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              user.registration_completed = true;
              user.biometricStatus = 'VERIFIED';
              localStorage.setItem("user", JSON.stringify(user));
            } catch (e) { }
          }
          toast({
            title: "Biometric updated",
            description: "Your biometric registration is complete.",
          });
        }
      } else {
        setBiometricState("error");
        setBiometricError(verifyResponse.error || "Biometric registration failed on server");
        toast({
          title: "Biometric failed",
          description: verifyResponse.error || "Biometric registration failed on server",
        });
      }
    } catch (error: any) {
      setBiometricState("error");
      setBiometricError(error.message || "Biometric capture failed globally");
      toast({
        title: "Biometric failed",
        description: error.message || "Biometric capture failed globally",
      });
    }
  };

  return (
    <div className={`animate-fade-in-up flex flex-col items-center justify-center ${compact ? "py-4" : "py-12"}`}>
      <div className={`glass flex w-full flex-col items-center rounded-2xl text-center ${compact ? "max-w-none px-6 py-6" : "max-w-md px-10 py-14"}`}>
        {/* Fingerprint hologram with scan ring */}
        {!compact && (
          <div className="relative mb-8 flex h-36 w-36 items-center justify-center">
          {/* Outer rotating scan ring */}
          <div
            className={`scan-ring absolute inset-0 rounded-full border-2 border-transparent ${isVerified
              ? "border-t-emerald-500 border-r-emerald-500/40"
              : "border-t-amber-500 border-r-amber-500/40"
              }`}
          />
          {/* Inner glow ring */}
          <div
            className={`absolute inset-2 rounded-full ${isVerified
              ? "bg-emerald-500/5 shadow-[inset_0_0_30px_rgba(16,185,129,0.1)]"
              : "bg-amber-500/5 shadow-[inset_0_0_30px_rgba(245,158,11,0.1)]"
              }`}
          />
          {/* Fingerprint SVG */}
          <svg
            className={`relative z-10 h-16 w-16 ${isVerified ? "text-emerald-500" : "text-amber-500"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
            <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M2 16h.01" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
          </svg>
        </div>
        )}

        {/* Status icon */}
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isVerified
            ? "bg-emerald-500/15 text-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
            : "bg-amber-500/15 text-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
            }`}
        >
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h2 className={`mb-2 font-bold text-foreground ${compact ? "text-base" : "text-xl"}`}>
          {isVerified ? "Biometric Identity: Verified" : "Biometric Identity: Pending"}
        </h2>
        <p className={`leading-relaxed text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
          {biometricState === "error"
            ? <span className="text-destructive font-medium">{biometricError}</span>
            : isVerified
              ? (allowReRegister
                ? "Re-register your biometrics to use a new device or refresh your secure credential."
                : "Your identity has been successfully verified. You now have full access to participate in all active elections securely.")
              : "Your identity verification is pending. Please complete the biometric scan to authorize your account for voting."}
        </p>

        {requiresOtp && otpStage !== "verified" && !isReRegisterFlow && (
          <div className={`mt-4 w-full ${compact ? "" : "max-w-sm"}`}>
            <div className="flex flex-col gap-2">
              <input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                className="h-11 rounded-lg border border-border/60 bg-background/70 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              {otpError && <p className="text-xs text-destructive">{otpError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpSending}
                  className="flex-1 h-11 rounded-lg border border-border/60 bg-muted/30 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors disabled:opacity-60"
                >
                  {otpSending ? "Sending..." : "Send OTP"}
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying}
                  className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {otpVerifying ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </div>
          </div>
        )}

        {(!isVerified || allowReRegister) && (
          <button
            onClick={() => {
              if (isReRegisterFlow) {
                resetOtpState();
                setShowOtpModal(true);
                handleRequestOtp();
                return;
              }
              handleStartVerification();
            }}
            disabled={biometricState === "scanning" || (requiresOtp && otpStage !== "verified" && !isReRegisterFlow)}
            className={`mt-4 rounded-xl flex items-center gap-2 justify-center bg-gradient-to-r from-primary to-primary/80 px-6 py-2.5 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed ${compact ? "w-full" : ""}`}
          >
            {biometricState === "scanning" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (isVerified ? "Re-register Biometrics" : "Start Verification")}
          </button>
        )}

        {showOtpModal && isReRegisterFlow && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">Verify OTP</h4>
                <button
                  onClick={() => {
                    setShowOtpModal(false);
                    resetOtpState();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                We sent a verification code to your email. Enter it to continue.
              </p>
              <div className="flex flex-col gap-2">
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="h-11 rounded-lg border border-border/60 bg-background/70 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                {otpError && <p className="text-xs text-destructive">{otpError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                  disabled={otpVerifying}
                  className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {otpVerifying ? "Verifying..." : "Verify OTP"}
                </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
