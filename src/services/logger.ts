
type ExamEvent = {
  eventType: string;
  timestamp: string;
  attemptId: string;
  questionId: string | null;
  metadata: Record<string, unknown>;
};

let eventBatch: ExamEvent[] = [];
let finalized = false;

// CHANGE THIS LATER TO YOUR REAL BACKEND
const LOG_API_URL = "http://localhost:5000/logs";

export function initLogger() {
  finalized = false;
  eventBatch = [];
  // Remove any previously persisted exam logs from localStorage (one-time cleanup).
  localStorage.removeItem("examLogs");
  localStorage.removeItem("logsFinalized");
}

export function finalizeLogs() {
  finalized = true;
  localStorage.setItem("logsFinalized", "true");
}

export function logEvent(
  type: string,
  attemptId: string,
  questionId: string | null = null,
  metadata: Record<string, unknown> = {}
) {
  if (finalized || localStorage.getItem("logsFinalized") === "true") {
    console.warn("Logs are finalized — no more writes allowed.");
    return;
  }

  const event: ExamEvent = {
    eventType: type,
    timestamp: new Date().toISOString(),
    attemptId,
    questionId,
    metadata: {
      browser: navigator.userAgent,
      isFocused: document.hasFocus(),
      ...metadata
    }
  };

  eventBatch.push(event);
  // Previously persisted eventBatch to localStorage under "examLogs".
  // We no longer persist in localStorage to avoid client-side storage of logs.

  if (eventBatch.length >= 5) {
    sendLogs();
  }
}

export async function sendLogs() {
  if (eventBatch.length === 0) return;

 try {
  const res = await fetch(LOG_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventBatch)
  });

  if (!res.ok) {
    console.info("[EventLogger] Backend unavailable — keeping logs locally.");
    return;
  }

  eventBatch = [];
  localStorage.removeItem("examLogs");
} catch {
  console.info("[EventLogger] Offline — logs saved locally.");
}
}
