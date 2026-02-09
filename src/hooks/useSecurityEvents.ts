
import { useEffect } from "react";
import { logEvent } from "../services/logger";

export function useSecurityEvents(attemptId: string) {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        logEvent("TAB_SWITCH", attemptId);
      }
    };

    const handleBlur = () =>
      logEvent("WINDOW_FOCUS_LOST", attemptId, null, {
        reason: "Possible screenshot tool opened",
      });

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent("COPY_ATTEMPT", attemptId);
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent("PASTE_ATTEMPT", attemptId);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        logEvent("SCREENSHOT_KEY_ATTEMPT", attemptId);
        alert("Screenshot attempt detected!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [attemptId]);
}
