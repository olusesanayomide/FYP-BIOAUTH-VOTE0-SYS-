import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "(Admin) Online Biometric Voting System",
    description: "An Online voting system secured by Biometrics",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
