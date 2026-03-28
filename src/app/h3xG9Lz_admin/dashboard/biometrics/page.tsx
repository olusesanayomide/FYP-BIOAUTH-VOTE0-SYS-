import { redirect } from 'next/navigation';

export default function BiometricLogsPage() {
    // Biometric logs were redundant with Audit Logs as requested by the user, so this route is disabled.
    redirect('/h3xG9Lz_admin/dashboard/audit');
}
