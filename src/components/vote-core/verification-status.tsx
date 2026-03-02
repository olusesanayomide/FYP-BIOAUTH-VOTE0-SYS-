"use client"

import { ShieldCheck, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { getWebAuthnRegistrationOptions, verifyWebAuthnRegistration, getCurrentUser } from "@/services/authService"

type BiometricState = "idle" | "scanning" | "success" | "error";

export function VerificationStatus() {
  const [isVerified, setIsVerified] = useState(false);
  const [biometricState, setBiometricState] = useState<BiometricState>("idle");
  const [biometricError, setBiometricError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsVerified(user.biometricStatus === 'VERIFIED' || user.registration_completed === true);
      } catch (e) { }
    }
  }, []);

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
        }
      } else {
        setBiometricState("error");
        setBiometricError(verifyResponse.error || "Biometric registration failed on server");
      }
    } catch (error: any) {
      setBiometricState("error");
      setBiometricError(error.message || "Biometric capture failed globally");
    }
  };

  return (
    <div className="animate-fade-in-up flex flex-col items-center justify-center py-12">
      <div className="glass flex max-w-md flex-col items-center rounded-2xl px-10 py-14 text-center">
        {/* Fingerprint hologram with scan ring */}
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

        {/* Status icon */}
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isVerified
            ? "bg-emerald-500/15 text-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
            : "bg-amber-500/15 text-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
            }`}
        >
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-foreground">
          {isVerified ? "Biometric Identity: Verified" : "Biometric Identity: Pending"}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {biometricState === "error"
            ? <span className="text-destructive font-medium">{biometricError}</span>
            : isVerified
              ? "Your identity has been successfully verified. You now have full access to participate in all active elections securely."
              : "Your identity verification is pending. Please complete the biometric scan to authorize your account for voting."}
        </p>

        {!isVerified && (
          <button
            onClick={handleStartVerification}
            disabled={biometricState === "scanning"}
            className="mt-6 rounded-xl flex items-center gap-2 justify-center bg-gradient-to-r from-primary to-primary/80 px-8 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {biometricState === "scanning" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : "Start Verification"}
          </button>
        )}
      </div>
    </div>
  )
}
