import { Lock } from "lucide-react";

const footerColumns = [
  {
    title: "Company",
    links: ["About", "Careers", "Press"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Compliance"],
  },
  {
    title: "Support",
    links: ["Contact", "Help Center", "Security Documentation"],
  },
];

const Footer = () => {
  return (
    <footer id="contact" className="border-t border-border/40 bg-secondary/50 section-padding py-16 md:py-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div>
            <span className="text-base font-bold text-foreground">SecureVote</span>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Next-generation biometric voting infrastructure for secure, transparent elections.
            </p>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 SecureVote. All Rights Reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>256-bit Encrypted Infrastructure</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
