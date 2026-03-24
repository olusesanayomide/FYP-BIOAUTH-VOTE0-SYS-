import { AppProviders } from "@/components/app-providers";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppProviders>{children}</AppProviders>;
}
