import type { Metadata } from "next";
import { AppProviders } from "@/components/app-providers";

export const metadata: Metadata = {
    title: "(Admin) Online Biometric Voting System",
    description: "An Online voting system secured by Biometrics",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AppProviders>{children}</AppProviders>;
}
