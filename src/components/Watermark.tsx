
import { useEffect, useRef } from "react";
import { logEvent } from "../services/logger";
import { EventLogger } from "../services/EventLogger";

interface Props {
  name: string;
  email: string;
  attemptId: string;
}

const REQUIRED_Z_INDEX = "999999";

export default function Watermark({ name, email, attemptId }: Props) {
  const intervalRef = useRef<number | null>(null);

  const buildWatermark = () => {
    const existing = document.getElementById("watermark-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "watermark-overlay";

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: REQUIRED_Z_INDEX,
      overflow: "hidden",
      background: "transparent",
    });

    const container = document.createElement("div");

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const xGap = 320;
    const yGap = 180;
    const cols = Math.ceil(vw / xGap) + 2;
    const rows = Math.ceil(vh / yGap) + 2;

    Object.assign(container.style, {
      position: "absolute",
      top: "-20%",
      left: "-20%",
      width: `${vw * 1.4}px`,
      height: `${vh * 1.4}px`,
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, ${xGap}px)`,
      gridAutoRows: `${yGap}px`,
      transform: "rotate(-20deg)",
    });

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    const textNodes: HTMLDivElement[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const text = document.createElement("div");

        Object.assign(text.style, {
          fontSize: "20px",
          color: "rgba(0, 0, 0, 0.1)",
          textAlign: "center",
          userSelect: "none",
          whiteSpace: "nowrap",
        });

        container.appendChild(text);
        textNodes.push(text);
      }
    }

    const updateTimestamp = () => {
      const time = new Date().toLocaleString();
      const watermarkText = `${name} | ${email} |<br/> ${time}`;

      textNodes.forEach((node) => {
        node.innerHTML = watermarkText;
      });
    };

    updateTimestamp();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(updateTimestamp, 1000);

  logEvent("WATERMARK_RENDERED", attemptId);
  // Also record via the central EventLogger service
  EventLogger.log('WATERMARK_RENDERED', { name, email });
  };

  useEffect(() => {
    buildWatermark();

    const handleResize = () => {
      buildWatermark();
    };
    window.addEventListener("resize", handleResize);

    const domObserver = new MutationObserver(() => {
      if (!document.getElementById("watermark-overlay")) {
        buildWatermark();
        logEvent("WATERMARK_TAMPER_ATTEMPT", attemptId, null, {
          reason: "REMOVED_FROM_DOM",
        });
        EventLogger.log('WATERMARK_TAMPER_ATTEMPT', { reason: 'REMOVED_FROM_DOM' });
      }
    });

    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const styleObserver = new MutationObserver(() => {
      const wm = document.getElementById("watermark-overlay");
      if (!wm) return;

      const computed = window.getComputedStyle(wm);

      const tampered =
        computed.display === "none" ||
        computed.visibility === "hidden" ||
        Number(computed.opacity) === 0 ||
        wm.style.zIndex !== REQUIRED_Z_INDEX;

      if (tampered) {
        buildWatermark(); // rebuild instead of patch
        logEvent("WATERMARK_TAMPER_ATTEMPT", attemptId, null, {
          reason: "STYLE_MANIPULATION",
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          zIndex: computed.zIndex,
        });
        EventLogger.log('WATERMARK_TAMPER_ATTEMPT', {
          reason: 'STYLE_MANIPULATION',
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          zIndex: computed.zIndex,
        });
      }
    });

    styleObserver.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["style", "class"],
    });

    return () => {
      domObserver.disconnect();
      styleObserver.disconnect();
      window.removeEventListener("resize", handleResize);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [name, email, attemptId]);

  return null;
}
