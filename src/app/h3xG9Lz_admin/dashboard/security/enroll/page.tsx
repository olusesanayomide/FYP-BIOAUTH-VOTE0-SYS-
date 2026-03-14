"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Fingerprint,
    ShieldCheck,
    Lock,
    ArrowRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Smartphone,
    Shield,
    Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/admin/DashboardLayout";
import {
    getAdminWebauthnRegistrationOptions,
    verifyAdminWebauthnRegistration
} from "@/services/authService";

const EnrollBiometricsPage = () => {
    const [status, setStatus] = useState<"idle" | "loading" | "verifying" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [adminId, setAdminId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Get admin ID from storage/cookies
        // In a real app, we'd probably have it in a context or fetch /auth/me
        // Since we just redirected from OTP login, let's try to get it from local storage or ask user to re-login if missing
        const userJson = localStorage.getItem('user');
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                if (user.id) {
                    setAdminId(user.id);
                }
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
            }
        }
    }, []);

    const handleEnroll = async () => {
        if (!adminId) {
            setErrorMessage("Session expired. Please log in again.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setErrorMessage("");

        try {
            // 1. Get options from backend
            const optionsResp = await getAdminWebauthnRegistrationOptions(adminId);
            if (!optionsResp.success || !optionsResp.data) {
                throw new Error(optionsResp.error || "Failed to fetch registration options");
            }

            // 2. Start WebAuthn registration
            const { startRegistration } = await import('@simplewebauthn/browser');
            let attResp;
            try {
                attResp = await startRegistration({ optionsJSON: optionsResp.data as any });
            } catch (err: any) {
                if (err.name === 'NotAllowedError') {
                    throw new Error("Registration canceled by user.");
                }
                throw err;
            }

            // 3. Verify with backend
            setStatus("verifying");
            const verifyResp = await verifyAdminWebauthnRegistration(adminId, attResp);
            if (verifyResp.success) {
                setStatus("success");
                // Update user object in storage to reflect registration
                const userJson = localStorage.getItem('user');
                if (userJson) {
                    const user = JSON.parse(userJson);
                    user.isRegistered = true;
                    localStorage.setItem('user', JSON.stringify(user));
                }
                setTimeout(() => router.push("/h3xG9Lz_admin/dashboard"), 2000);
            } else {
                throw new Error(verifyResp.error || "Verification failed");
            }
        } catch (err: any) {
            console.error("Enrollment error:", err);
            setStatus("error");
            setErrorMessage(err.message || "An unexpected error occurred during enrollment.");
        }
    };

    return (
        <DashboardLayout breadcrumb={["Security", "Enroll Biometrics"]}>
            <div className="max-w-2xl mx-auto py-12">
                <motion.div
                    className="admin-card rounded-2xl p-8 relative overflow-hidden text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full -ml-16 -mb-16 blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <motion.div
                            className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6"
                            animate={status === "loading" || status === "verifying" ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <Fingerprint className="w-10 h-10 text-primary" />
                        </motion.div>

                        <h1 className="text-2xl font-bold text-foreground mb-4">Secure Your Account</h1>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Add a biometric passkey to your administrator account for faster and more secure access to the command center.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
                            {[
                                { icon: Shield, title: "Unbreakable", desc: "Cryptography-based security that can't be phished." },
                                { icon: Zap, title: "Lightning Fast", desc: "Log in with just a touch or a glance." },
                                { icon: Smartphone, title: "Cross-Device", desc: "Use your phone or computer's biometrics." }
                            ].map((item, i) => (
                                <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/40">
                                    <item.icon className="w-5 h-5 text-primary mb-2" />
                                    <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            {status === "idle" || status === "error" ? (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <button
                                        onClick={handleEnroll}
                                        className="group relative w-full flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:shadow-[0_0_30px_-5px_hsla(var(--primary),0.5)] transition-all duration-300"
                                    >
                                        <span>Register Passkey</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    {status === "error" && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive text-sm"
                                        >
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            <p>{errorMessage}</p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ) : status === "success" ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-success" />
                                    </div>
                                    <h2 className="text-xl font-bold text-foreground mb-2">Registration Complete!</h2>
                                    <p className="text-muted-foreground text-sm">Redirecting to high-security zone...</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="processing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center py-4"
                                >
                                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                                    <h2 className="text-lg font-semibold text-foreground mb-1">
                                        {status === "loading" ? "Initializing Handshake..." : "Verifying Biometric Signature..."}
                                    </h2>
                                    <p className="text-muted-foreground text-xs uppercase tracking-widest">Secure Link Active</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground/60">
                    <Lock className="w-3 h-3" />
                    <span className="text-[10px] tracking-widest uppercase">AES-256 Bit Encrypted Setup Zone</span>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default EnrollBiometricsPage;
