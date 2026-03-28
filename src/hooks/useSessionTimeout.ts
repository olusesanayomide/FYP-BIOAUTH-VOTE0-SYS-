import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

export function useSessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run on the client side
    if (typeof window === "undefined") return;

    // Do not force logout checks if the user is actively on a login route
    if (pathname === "/login" || pathname === "/h3xG9Lz_admin") {
      return;
    }

    const resetTimer = () => {
      localStorage.setItem("last_activity", Date.now().toString());
    };

    const checkTimeout = () => {
      const lastActivityStr = localStorage.getItem("last_activity");
      const hasToken = localStorage.getItem("access_token");
      const userStr = localStorage.getItem("user");

      // If user isn't logged in anyway, ignore
      if (!hasToken || !userStr) {
        return;
      }

      if (!lastActivityStr) {
        resetTimer();
        return;
      }

      const lastActivity = parseInt(lastActivityStr, 10);
      const isExpired = Date.now() - lastActivity > TIMEOUT_MS;

      if (isExpired) {
        let isVoter = true;
        try {
          const userObj = JSON.parse(userStr);
          isVoter = userObj.role === "VOTER";
        } catch (e) {}

        // Clear session completely
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        localStorage.removeItem("last_activity");

        toast.error("Session expired due to inactivity. Please log in again.");

        // Direct user to correct respective login portal
        if (!isVoter) {
          router.push("/h3xG9Lz_admin");
        } else {
          router.push("/login");
        }
      }
    };

    // Attach listeners for common user interactions
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    const handleInteraction = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    // Run initial setting and set an interval checker
    resetTimer();
    const intervalId = setInterval(checkTimeout, 10000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
      clearInterval(intervalId);
    };
  }, [router, pathname]);
}
