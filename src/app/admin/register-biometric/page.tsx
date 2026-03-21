import AdminBiometricRegistration from "@/pages/AdminBiometricRegistration";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function AdminBiometricRegistrationPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
    }>
      <AdminBiometricRegistration />
    </Suspense>
  );
}
