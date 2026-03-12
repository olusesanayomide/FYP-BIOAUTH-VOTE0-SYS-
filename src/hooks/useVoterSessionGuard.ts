"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/services/authService";

export function useVoterSessionGuard() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        if (isMounted) setAuthChecking(false);
        router.replace("/login");
        return;
      }

      const me = await getCurrentUser();
      if (!me.success) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        if (isMounted) setAuthChecking(false);
        router.replace("/login");
        return;
      }

      if (isMounted) {
        setIsAuthorized(true);
        setAuthChecking(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return { authChecking, isAuthorized };
}
