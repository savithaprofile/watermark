
export type EventType =
    | 'WATERMARK_RENDERED'
    | 'WATERMARK_TAMPER_ATTEMPT'
    | 'TAB_SWITCH'
    | 'WINDOW_BLUR'
    | 'WINDOW_FOCUS'
    | 'FULLSCREEN_CHANGE'
    | 'COPY_ATTEMPT'
    | 'PASTE_ATTEMPT'
    | 'ASSESSMENT_START'
    | 'ASSESSMENT_SUBMIT'
    | 'ANSWER_SELECTED'
    | 'NAVIGATION';

export interface AssessmentEvent {
    type: EventType;
    timestamp: number;
    payload?: any;
    candidateId?: string;
    attemptId?: string;
}

class EventLoggerService {
    private logs: AssessmentEvent[] = [];
    private candidateId: string = '';
    private attemptId: string = '';
    private isInitialized = false;

    private isSubmitted = false;
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private readonly BATCH_INTERVAL_MS = 5000;

    constructor() {
        this.loadLogs();
        this.startBatchService();
    }

    init(candidateId: string, attemptId: string) {
        if (this.isInitialized) return;

        this.candidateId = candidateId;
        this.attemptId = attemptId;
        this.isInitialized = true;

        this.setupListeners();
        // this.loadLogs(); // Removed, done in constructor

        this.log('ASSESSMENT_START', { userAgent: navigator.userAgent });
    }

    private startBatchService() {
        this.flushInterval = setInterval(() => {
            this.flush();
        }, this.BATCH_INTERVAL_MS);
    }

    private stopBatchService() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }

    private readonly API_ENDPOINT = '/api/events';

    private async flush() {
        if (this.logs.length === 0) return;

        const unsentLogs = this.logs.filter(l => !l.payload?._sent);

        if (unsentLogs.length > 0) {
            console.log(`[EventLogger] Flushing ${unsentLogs.length} events to backend...`);

            try {
                const response = await fetch(this.API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        candidateId: this.candidateId,
                        attemptId: this.attemptId,
                        events: unsentLogs
                    })
                });

                if (response.ok) {
                    // Mark as sent
                    this.logs.forEach(l => {
                        if (unsentLogs.includes(l)) {
                            if (!l.payload) l.payload = {};
                            l.payload._sent = true;
                        }
                    });
                    this.persistLogs();
                    console.log('[EventLogger] Flush successful.');
                } else {
                    console.warn(`[EventLogger] Flush failed with status: ${response.status}`);
                }
            } catch (error) {
                console.error('[EventLogger] Flush error:', error);
            }
        }
    }

    private setupListeners() {
        // Tab visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.log('TAB_SWITCH', { hidden: true });
            } else {
                this.log('TAB_SWITCH', { hidden: false });
            }
        });

        // Window focus
        window.addEventListener('blur', () => this.log('WINDOW_BLUR'));
        window.addEventListener('focus', () => this.log('WINDOW_FOCUS'));

        // Copy/Paste
        document.addEventListener('copy', () => this.log('COPY_ATTEMPT'));
        document.addEventListener('paste', () => this.log('PASTE_ATTEMPT'));

        // Fullscreen
        document.addEventListener('fullscreenchange', () => {
            this.log('FULLSCREEN_CHANGE', { isFullscreen: !!document.fullscreenElement });
        });
    }

    log(type: EventType, payload?: any) {
        if (this.isSubmitted) return; // Immutable post-submission

        const event: AssessmentEvent = {
            type,
            timestamp: Date.now(),
            payload,
            candidateId: this.candidateId,
            attemptId: this.attemptId
        };

        this.logs.push(event);
        this.persistLogs();

        // Immediate console log for debugging, but "flush" handles the "sending"
        // console.log('[EventLogger]', event); 
    }

    submit() {
        this.log('ASSESSMENT_SUBMIT');
        this.isSubmitted = true;
        this.flush();
        this.stopBatchService();
        this.persistLogs();
    }

    private persistLogs() {
        try {
            localStorage.setItem('assessment_logs', JSON.stringify(this.logs));
            localStorage.setItem('assessment_submitted', String(this.isSubmitted));
        } catch (e) {
            console.error('Failed to persist logs', e);
        }
    }

    private loadLogs() {
        try {
            const savedLogs = localStorage.getItem('assessment_logs');
            const savedSubmitted = localStorage.getItem('assessment_submitted');

            if (savedLogs) {
                this.logs = JSON.parse(savedLogs);
            }
            if (savedSubmitted === 'true') {
                this.isSubmitted = true;
            }
        } catch (e) {
            console.error('Failed to load logs', e);
        }
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
        this.isSubmitted = false;
        localStorage.removeItem('assessment_logs');
        localStorage.removeItem('assessment_submitted');
    }
}

export const EventLogger = new EventLoggerService();
