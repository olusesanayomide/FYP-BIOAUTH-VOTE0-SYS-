"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Fingerprint, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Use Cases", href: "#benefits" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [systemName, setSystemName] = useState("SecureVote");
  const [systemLogo, setSystemLogo] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "nav-blur shadow-lg shadow-background/50" : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-2.5 group">
          {systemLogo ? (
            <img src={systemLogo} alt="System Logo" className="h-8 w-auto rounded-md object-contain" />
          ) : (
            <div className="relative">
              <Shield className="w-7 h-7 text-primary transition-colors" />
              <Fingerprint className="w-3.5 h-3.5 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          )}
          <span className="text-lg font-bold tracking-tight text-foreground">
            {systemName}
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[2px] after:bg-primary after:scale-x-0 after:origin-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-left"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => router.push("/login")} className="text-sm text-muted-foreground hover:text-foreground border border-border px-5 py-2 rounded-lg transition-all duration-300 hover:border-muted-foreground/50">
            Login
          </button>
          <button className="text-sm font-medium text-primary-foreground gradient-cta px-5 py-2 rounded-lg transition-all duration-300 hover:scale-[1.03] glow-blue">
            Verify Identity
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden nav-blur border-t border-border/50"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                <button onClick={() => { setMobileOpen(false); router.push("/login"); }} className="text-sm text-muted-foreground border border-border px-5 py-2.5 rounded-lg">
                  Login
                </button>
                <button className="text-sm font-medium text-primary-foreground gradient-cta px-5 py-2.5 rounded-lg">
                  Verify Identity
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;

