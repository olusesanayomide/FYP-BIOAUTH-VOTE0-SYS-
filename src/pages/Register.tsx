/**
 * Register Component - Student Registration with Backend Integration
 * Handles: Registration → OTP Verification → Password Setup → Biometric Enrollment
 * 
 * MANUAL SETUP REQUIRED:
 * - Backend running on NEXT_PUBLIC_API_URL
 * - Supabase with school_students table populated
 * - Email service configured (SMTP or Resend)
 * - WebAuthn RP_ID configured
 */

"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Fingerprint,
  Check,
  ScanFace,
  Mail,
  Loader2,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  registerStudent,
  resendOtp,
  verifyOtpAndCompleteRegistration,
  getWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
} from "@/services/authService";

type Step = 1 | 2 | 3;
type BiometricState = "idle" | "permission" | "scanning" | "success" | "error";

const Register = () => {
  const router = useRouter();

  // Step 1 - Student Registration
  const [fullName, setFullName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeField, setShakeField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step1Error, setStep1Error] = useState("");

  // Step 2 - OTP Verification
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Password step removed

  // Step 4 - Biometric
  const [biometricState, setBiometricState] = useState<BiometricState>("idle");
  const [biometricProgress, setBiometricProgress] = useState(0);
  const [biometricError, setBiometricError] = useState("");
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Flow
  const [step, setStep] = useState<Step>(1);
  const [complete, setComplete] = useState(false);
  const [userId, setUserId] = useState<string>("");

  const triggerShake = (field: string) => {
    setShakeField(field);
    setTimeout(() => setShakeField(null), 500);
  };

  // ============ STEP 1: REGISTRATION ============

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
      triggerShake("fullName");
    }
    if (!matricNumber.trim() || !/^[A-Za-z0-9/]{6,}$/.test(matricNumber)) {
      newErrors.matricNumber = "Enter a valid matric number";
      triggerShake("matricNumber");
    }
    if (!email.trim()) {
      newErrors.email = "Email is required";
      triggerShake("email");
    } else if (!email.endsWith("@student.babcock.edu.ng")) {
      newErrors.email = "Email must end with @student.babcock.edu.ng";
      triggerShake("email");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setStep1Error("");

    // Call backend to register student
    const response = await registerStudent(fullName, matricNumber, email);

    if (response.success && response.data) {
      if (!response.data.userId) {
        setStep1Error('Registration failed: missing user id from server');
      } else {
        console.log(`[FRONTEND] Step 1 Complete. Received userId: "${response.data.userId}"`);
        setUserId(response.data.userId);
        setCanResendOtp(true);
        setResendTimer(60);
        setStep(2);
      }
    } else {
      setStep1Error(
        response.error || "Registration failed. Please try again."
      );
      triggerShake("form");
    }

    setLoading(false);
  };

  // ============ STEP 2: OTP VERIFICATION ============

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (otpError) setOtpError("");
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };
  const handleVerifyOtp = async () => {
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      setOtpError("Please enter all 6 digits");
      triggerShake("otp");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    // Verify OTP at backend (and complete registration)
    try {
      const response = await verifyOtpAndCompleteRegistration(userId, otpCode);

      if (response.success) {
        // OTP is valid and token is stored, proceed to biometric step
        setStep(3);
        setTimeout(() => startBiometricCapture(), 800);
      } else {
        setOtpError(response.error || "OTP verification failed");
        triggerShake("otp");
      }
    } catch (error: any) {
      setOtpError(
        error.message || "OTP verification failed. Try again."
      );
      triggerShake("otp");
    }

    setOtpLoading(false);
  };

  const handleResendOtp = async () => {
    if (!userId) {
      setOtpError('Missing userId');
      return;
    }

    const response = await resendOtp(userId);
    if (response.success) {
      setCanResendOtp(false);
      setResendTimer(60);
      setOtpError("");
    } else {
      setOtpError(response.error || "Failed to resend OTP");
    }
  };

  // ============ STEP 3: BIOMETRIC ENROLLMENT ============

  const startBiometricCapture = () => {
    setBiometricState("permission");
  };

  const grantPermission = async () => {
    if (isLoadingOptions || biometricState === "scanning") return;

    setIsLoadingOptions(true);
    setBiometricState("scanning");
    setBiometricProgress(0);

    try {
      const optionsResponse = await getWebAuthnRegistrationOptions();
      if (!optionsResponse.success || !optionsResponse.data) {
        setBiometricState("error");
        setBiometricError(optionsResponse.error || "Failed to get registration options");
        return;
      }

      // Start WebAuthn registration
      const { startRegistration } = await import('@simplewebauthn/browser');

      let attResp;
      try {
        // Pass the options directly to the browser library
        attResp = await startRegistration({ optionsJSON: optionsResponse.data as any });
      } catch (error: any) {
        setBiometricState("error");
        if (error.name === 'InvalidStateError') {
          setBiometricError("Authenticator was probably already registered");
        } else {
          setBiometricError(error.message || "Biometric registration was cancelled or failed");
        }
        return;
      }

      // Send the response back to the server for verification
      const verifyResponse = await verifyWebAuthnRegistration(attResp);

      if (verifyResponse.success) {
        setBiometricProgress(100);
        setBiometricState("success");
        setTimeout(() => completeRegistration(), 1500);
      } else {
        setBiometricState("error");
        setBiometricError(
          verifyResponse.error || "Biometric registration failed"
        );
      }
    } catch (error: any) {
      setBiometricState("error");
      setBiometricError(error.message || "Biometric capture failed");
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const completeRegistration = () => {
    setComplete(true);
    setTimeout(() => {
      router.push("/login?registered=true");
    }, 2000);
  };

  const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  const inputClass = (field: string, hasError?: boolean) =>
    `w-full bg-muted/40 border rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:scale-[1.01] focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] ${hasError || errors[field]
      ? "border-destructive/50"
      : "border-border/50 focus:border-primary/50"
    }`;

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/25 to-background" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-primary/5 blur-[140px]" />
      <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[120px]" />
      <div className="w-full max-w-md space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex items-center justify-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">SecureVote</span>
          </motion.div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Create Account</h2>
            <p className="text-muted-foreground">Join the secure voting ecosystem</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: "25%" }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">Step {step} of 3</p>
          </div>

          {/* Form Content */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                onSubmit={handleStep1}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {step1Error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{step1Error}</p>
                  </motion.div>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Full Name
                  </label>
                  <motion.input
                    animate={{
                      x: shakeField === "fullName" ? [-10, 10, -10, 0] : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) delete errors.fullName;
                    }}
                    className={inputClass("fullName")}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-destructive mt-2">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Matric Number
                  </label>
                  <motion.input
                    animate={{
                      x:
                        shakeField === "matricNumber"
                          ? [-10, 10, -10, 0]
                          : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    type="text"
                    placeholder="U2023/123456"
                    value={matricNumber}
                    onChange={(e) => {
                      setMatricNumber(e.target.value);
                      if (errors.matricNumber) delete errors.matricNumber;
                    }}
                    className={inputClass("matricNumber")}
                  />
                  {errors.matricNumber && (
                    <p className="text-xs text-destructive mt-2">
                      {errors.matricNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Email
                  </label>
                  <motion.input
                    animate={{
                      x: shakeField === "email" ? [-10, 10, -10, 0] : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    type="email"
                    placeholder="name@student.babcock.edu.ng"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) delete errors.email;
                    }}
                    className={inputClass("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-2">
                      {errors.email}
                    </p>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <a href="/login" className="text-primary hover:underline font-medium">
                    Login
                  </a>
                </p>
              </motion.form>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center space-y-2">
                  <Mail className="w-12 h-12 text-primary/60 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to {email}
                  </p>
                </div>

                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{otpError}</p>
                  </motion.div>
                )}

                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <motion.input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-border/50 rounded-lg focus:border-primary focus:outline-none transition-all"
                      animate={{
                        scale: digit ? 1.05 : 1,
                        borderColor: digit ? "hsl(var(--primary))" : undefined,
                      }}
                    />
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otp.join("").length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Verify OTP
                    </>
                  )}
                </motion.button>

                <div className="text-center">
                  {canResendOtp ? (
                    <button
                      onClick={handleResendOtp}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Resend in {resendTimer}s
                    </p>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(1)}
                  className="w-full py-3 border-2 border-border/50 text-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-muted/50 transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </motion.button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <AnimatePresence mode="wait">
                  {complete ? (
                    <motion.div
                      key="complete"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500"
                      >
                        <Check className="w-10 h-10 text-green-500" />
                      </motion.div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">
                          Registered!
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Your biometric identity has been secured
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Redirecting to login...
                      </p>
                    </motion.div>
                  ) : biometricState === "permission" ? (
                    <motion.div
                      key="permission"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center space-y-4"
                    >
                      <ScanFace className="w-16 h-16 text-primary/60 mx-auto" />
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          Biometric Enrollment
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Please allow access to your biometric sensor
                        </p>
                      </div>
                      <motion.button
                        whileHover={isLoadingOptions ? {} : { scale: 1.02 }}
                        whileTap={isLoadingOptions ? {} : { scale: 0.98 }}
                        onClick={grantPermission}
                        disabled={isLoadingOptions}
                        className={`w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${isLoadingOptions ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Fingerprint className="w-4 h-4" />
                        Grant Permission
                      </motion.button>
                      <button
                        onClick={() => completeRegistration()}
                        className="w-full py-3 border-2 border-border/50 text-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-muted/50 transition-all duration-300"
                      >
                        Skip for Now
                      </button>
                    </motion.div>
                  ) : biometricState === "scanning" ? (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center space-y-4"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full mx-auto"
                      />
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          Scanning Biometric
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Please hold steady...
                        </p>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: `${biometricProgress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(biometricProgress)}% complete
                      </p>
                    </motion.div>
                  ) : biometricState === "success" ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500"
                      >
                        <Check className="w-10 h-10 text-green-500" />
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          Biometric Registered
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Your biometric data is securely stored
                        </p>
                      </div>
                    </motion.div>
                  ) : biometricState === "error" ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-4"
                    >
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          Biometric Error
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {biometricError}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setBiometricState("permission");
                          setBiometricError("");
                        }}
                        className="w-full py-3 bg-primary text-white font-medium rounded-xl transition-all duration-300 hover:bg-primary/90"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => completeRegistration()}
                        className="w-full py-3 border-2 border-border/50 text-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-muted/50 transition-all duration-300"
                      >
                        Continue Without Biometric
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </div>
  );
};

export default Register;
