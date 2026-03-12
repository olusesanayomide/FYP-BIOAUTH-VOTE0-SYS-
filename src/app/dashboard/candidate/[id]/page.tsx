"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TopNav } from "@/components/vote-core/top-nav";
import { Sidebar } from "@/components/vote-core/sidebar";
import {
    ArrowLeft, Download, User, Briefcase, Award, CheckCircle2,
    AlertCircle, Loader2, Vote, GraduationCap, Building, Layout,
    Shield, Lock as LockIcon, Fingerprint
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getElections, checkVotingEligibility, submitVote, Candidate, Election } from "@/services/votingService";

// Local extended candidate type to match the data structure used in this page
interface ExtendedCandidate extends Candidate {
    positionTitle: string;
    positionId: string;
}

export default function CandidateProfile() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [candidate, setCandidate] = useState<ExtendedCandidate | null>(null);
    const [election, setElection] = useState<Election | null>(null);
    const [loading, setLoading] = useState(true);
    const [eligibility, setEligibility] = useState<any>(null);
    const [isVoting, setIsVoting] = useState(false);
    const [voteError, setVoteError] = useState("");
    const [voteSuccess, setVoteSuccess] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                // Fetch elections to find the specific candidate and their context
                const resp = await getElections();
                if (resp.success && resp.data) {
                    let foundCandidate: ExtendedCandidate | null = null;
                    let foundElection: Election | null = null;

                    for (const elect of resp.data) {
                        for (const pos of elect.positions) {
                            const cand = pos.candidates.find((c: any) => c.id === id);
                            if (cand) {
                                foundCandidate = {
                                    ...cand,
                                    positionTitle: pos.title,
                                    positionId: pos.id
                                } as ExtendedCandidate;
                                foundElection = elect as Election;
                                break;
                            }
                        }
                        if (foundCandidate) break;
                    }

                    if (foundCandidate && foundElection) {
                        setCandidate(foundCandidate);
                        setElection(foundElection);

                        // Check eligibility for this election
                        const eligResp = await checkVotingEligibility(foundElection.id);
                        if (eligResp.success) {
                            setEligibility(eligResp.data);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch candidate details", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleCastVote = async () => {
        if (!candidate || !election) return;

        setIsVoting(true);
        setVoteError("");

        try {
            const isBiometricRequired = election.require_biometrics ?? false;
            let webauthnVerificationProof = {
                assertionObject: "",
                clientDataJSON: ""
            };

            const storedUser = localStorage.getItem("user");
            let currentUser: any = null;
            if (storedUser) {
                currentUser = JSON.parse(storedUser);
            }

            if (isBiometricRequired) {
                const { getWebAuthnAuthenticationOptions } = await import('@/services/authService');
                const authOptions = await getWebAuthnAuthenticationOptions(currentUser?.email || currentUser?.matricNumber);

                if (!authOptions.success || !authOptions.data) {
                    setVoteError("Failed to initialize secure verification. Please try again.");
                    setIsVoting(false);
                    return;
                }

                const { startAuthentication } = await import('@simplewebauthn/browser');
                let attResp;
                try {
                    attResp = await startAuthentication({ optionsJSON: authOptions.data as any });
                } catch (error: any) {
                    setVoteError("Biometric verification was cancelled or failed.");
                    setIsVoting(false);
                    return;
                }

                webauthnVerificationProof = {
                    assertionObject: JSON.stringify(attResp),
                    clientDataJSON: ""
                };
            }

            const submission: any = {
                electionId: election.id,
                votes: [{
                    positionId: candidate.positionId,
                    candidateId: candidate.userId || candidate.id
                }],
                webauthnVerificationProof
            };

            const result = await submitVote(submission);
            if (result.success) {
                setVoteSuccess(true);
                // Refresh eligibility
                const eligResp = await checkVotingEligibility(election.id);
                if (eligResp.success) setEligibility(eligResp.data);
            } else {
                setVoteError(result.error || "Failed to submit vote");
            }
        } catch (e: any) {
            setVoteError(e.message || "An unexpected error occurred");
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-background text-foreground">
            <TopNav onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <Sidebar
                activeView="dashboard"
                onChangeView={() => { }}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="relative z-10 pt-[100px] lg:pl-[240px] pb-24">
                <div className="mx-auto max-w-5xl px-6 md:px-10">
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => {
                            if (typeof window !== "undefined" && window.history.length > 1) {
                                router.back();
                            } else {
                                router.push("/dashboard");
                            }
                        }}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group mb-8"
                    >
                        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span className="font-medium">Back to Dashboard</span>
                    </motion.button>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            <p className="text-sm text-muted-foreground animate-pulse">Retrieving Secure Profile...</p>
                        </div>
                    ) : candidate ? (
                        <div className="space-y-10">
                            {/* Profile Header Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card rounded-[2rem] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-10 border border-border/40 shadow-2xl"
                            >
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent z-0" />

                                {/* Profile Image with Status Glow */}
                                <div className="relative z-10 shrink-0">
                                    <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-3xl overflow-hidden border-4 border-border/50 shadow-2xl">
                                        {candidate.imageUrl ? (
                                            <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                <User className="w-20 h-20 text-muted-foreground/30" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg border-4 border-background">
                                        <Shield className="w-6 h-6 text-primary-foreground" />
                                    </div>
                                </div>

                                {/* Main Info */}
                                <div className="relative z-10 flex-1 text-center md:text-left space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                                            <span className="px-4 py-1.5 rounded-xl bg-primary/15 text-primary text-[10px] uppercase tracking-widest font-bold border border-primary/20">
                                                Certified Candidate
                                            </span>
                                            {candidate.party && (
                                                <span className="px-4 py-1.5 rounded-xl bg-muted/30 text-muted-foreground text-[10px] uppercase tracking-widest font-bold border border-border/40">
                                                    {candidate.party}
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-tight">
                                            {candidate.name}
                                        </h1>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-border/40">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                                <Layout className="w-3 h-3 text-primary" />
                                                Running For
                                            </p>
                                            <p className="text-sm font-bold text-foreground">{candidate.positionTitle}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                                <Building className="w-3 h-3 text-primary" />
                                                Department
                                            </p>
                                            <p className="text-sm font-bold text-foreground">{candidate.department || "General Administration"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                                <GraduationCap className="w-3 h-3 text-primary" />
                                                Level
                                            </p>
                                            <p className="text-sm font-bold text-foreground">{candidate.level ? `${candidate.level} Level` : "Final Year"}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Left Content: Bio & Platform */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="lg:col-span-2 space-y-10"
                                >
                                    <div className="glass-card rounded-[2rem] p-8 md:p-12 border border-border/40 space-y-8">
                                        <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            Biography & Vision
                                        </h3>

                                        <div className="prose max-w-none text-muted-foreground leading-relaxed text-lg whitespace-pre-line font-medium">
                                            {candidate.platform || "This candidate is dedicated to fostering a more inclusive and technologically advanced student body. With a focus on transparency, innovation, and direct student representation, they aim to bridge the gap between administration and the student collective."}
                                        </div>
                                    </div>

                                    {candidate.manifestoUrl && (
                                        <div className="glass-card rounded-[2rem] p-8 border border-border/40 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <h4 className="text-lg font-bold text-foreground">Candidate Manifesto</h4>
                                                <p className="text-sm text-muted-foreground">Official policy document and strategic blueprint.</p>
                                            </div>
                                            <a
                                                href={candidate.manifestoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={`manifesto-${candidate.name.replace(/\s+/g, '-').toLowerCase()}.pdf`}
                                                className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all duration-300 hover:scale-[1.02]"
                                            >
                                                <Download className="w-5 h-5" />
                                                Download Manifesto
                                            </a>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Right Content: Voting & Action */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="space-y-8"
                                >
                                    <div className="glass-card rounded-[2rem] p-8 border border-primary/20 bg-primary/5 space-y-8 sticky top-[100px]">
                                        <div className="space-y-3">
                                            <h3 className="text-xl font-bold text-foreground">Official Ballot</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Your vote is encrypted and securely cast using end-to-end biometric verification.
                                            </p>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-border/40">
                                            {eligibility?.hasVoted ? (
                                                <div className="space-y-4">
                                                    <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-4">
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                                                        <div>
                                                            <p className="text-sm font-bold text-emerald-400">Vote Recorded</p>
                                                            <p className="text-[11px] text-emerald-400/70 mt-1">
                                                                You have already casted your vote in this election.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : voteSuccess ? (
                                                <motion.div
                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="p-6 rounded-2xl bg-emerald-500 border border-emerald-400 text-[#0B0E14] text-center space-y-2"
                                                >
                                                    <CheckCircle2 className="w-10 h-10 mx-auto" />
                                                    <p className="font-black text-lg">Ballot Submitted!</p>
                                                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Election 2026</p>
                                                </motion.div>
                                            ) : eligibility?.eligible === false ? (
                                                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
                                                    <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-bold text-amber-500">Ineligible to Vote</p>
                                                        <p className="text-[11px] text-amber-500/70 mt-1">
                                                            {eligibility.message || "You do not meet the criteria for this election."}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={handleCastVote}
                                                        disabled={isVoting || election?.status !== 'active'}
                                                        className="w-full flex items-center justify-center gap-4 py-6 rounded-2xl bg-primary text-primary-foreground font-black text-lg transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group"
                                                    >
                                                        {isVoting ? (
                                                            <Loader2 className="w-6 h-6 animate-spin" />
                                                        ) : (
                                                            <Vote className="w-7 h-7 transition-all group-hover:scale-110" />
                                                        )}
                                                        {isVoting ? "Verifying..." : "Submit Ballot"}
                                                    </button>

                                                    {voteError && (
                                                        <p className="text-xs text-destructive text-center font-bold px-2">{voteError}</p>
                                                    )}

                                                    <div className="pt-4 flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                                                        <Shield className="w-4 h-4" />
                                                        <LockIcon className="w-4 h-4" />
                                                        <Fingerprint className="w-4 h-4" />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    ) : (
                                            <div className="glass-card rounded-[2rem] p-20 text-center border-dashed border-border/40">
                                                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
                                                    <User className="w-10 h-10 text-muted-foreground/50" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-foreground mb-2">Secure Module Error</h3>
                                                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
                                                    The requested candidate credentials could not be decrypted or the record no longer exists.
                                                </p>
                                                <button
                                                    onClick={() => router.push("/dashboard")}
                                                    className="px-8 py-3 rounded-xl bg-muted/30 border border-border/40 text-foreground text-sm font-bold hover:bg-muted/50 transition-all"
                                                >
                                                    Return to Secure Portal
                                                </button>
                                            </div>
                    )}
                </div>
            </main>
        </div>
    );
}
