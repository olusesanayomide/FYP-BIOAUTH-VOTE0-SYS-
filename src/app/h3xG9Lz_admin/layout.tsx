import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Lovable App",
    description: "Lovable Generated Project",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
