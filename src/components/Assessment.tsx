
import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    Typography,
    LinearProgress,
    Stack,
    Paper,
    TextField
} from '@mui/material';
import { EventLogger } from '../services/EventLogger';

const MOCK_QUESTIONS = [
    {
        id: 1,
        type: 'mcq',
        text: "Which hook should be used for side effects in React?",
        options: ["useState", "useEffect", "useReducer", "useContext"]
    },
    {
        id: 2,
        type: 'mcq',
        text: "What prevents a component from re-rendering if props haven't changed?",
        options: ["React.memo", "useMemo", "useCallback", "lazy"]
    },
    {
        id: 3,
        type: 'mcq',
        text: "What is the correct way to update state based on previous state?",
        options: [
            "setState(state + 1)",
            "setState(prevState => prevState + 1)",
            "state = state + 1",
            "forceUpdate()"
        ]
    },
    {
        id: 4,
        type: 'text',
        text: "Explain the difference between Props and State in React.",
        options: []
    }
];

const Assessment: React.FC = () => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [isSubmitted, setIsSubmitted] = useState(false);

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        const handleFullScreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullScreen(isFull);
            // EventLogger.ts handles logging FULLSCREEN_CHANGE, so we don't need to duplicate it here
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);

        // Check initial state
        setIsFullScreen(!!document.fullscreenElement);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
        };
    }, []);

    useEffect(() => {
        if (!hasStarted) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [hasStarted]);

    const handleStart = () => {
        document.documentElement.requestFullscreen().then(() => {
            setHasStarted(true);
            EventLogger.log('ASSESSMENT_START', { method: 'USER_INITIATED' });
        }).catch(e => {
            console.error(`Error attempting to enable fullscreen mode: ${e.message}`);
            // Force start even if fullscreen fails (the security overlay will catch them)
            setHasStarted(true);
        });
    };

    const handleAnswerChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const answer = event.target.value;
        const questionId = MOCK_QUESTIONS[currentQuestionIndex].id;

        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));

        if (MOCK_QUESTIONS[currentQuestionIndex].type === 'mcq') {
            EventLogger.log('ANSWER_SELECTED', {
                questionId,
                answer
            });
        }
    };

    const handleTextBlur = () => {
        if (MOCK_QUESTIONS[currentQuestionIndex].type === 'text') {
            EventLogger.log('ANSWER_SELECTED', {
                questionId: MOCK_QUESTIONS[currentQuestionIndex].id,
                answer: answers[MOCK_QUESTIONS[currentQuestionIndex].id]
            });
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            EventLogger.log('NAVIGATION', { direction: 'NEXT', toIndex: currentQuestionIndex + 1 });
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
            EventLogger.log('NAVIGATION', { direction: 'PREV', toIndex: currentQuestionIndex - 1 });
        }
    };

    const handleSubmit = async () => {
        setIsSubmitted(true);
        EventLogger.submit();

        try {
            console.log('Submitting assessment...');
            console.log('Answers:', answers);
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    candidateId: 'CAND-12345', // In real app, from context
                    attemptId: 'ATT-98765-XYZ',
                    answers,
                    timeLeft
                })
            });

            if (response.ok) {
                console.log('Assessment submitted successfully to backend.');
            } else {
                console.warn(`Backend submission failed: ${response.status}. Answers are saved locally.`);
            }
        } catch (error) {
            console.error('Submission error:', error);
            console.warn('Network error. Answers are saved locally.');
        }

        // UI feedback
        setTimeout(() => {
            alert('Assessment Submitted! Answers sent to backend (check console).');
        }, 500);
    };

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => {
                console.error(`Error attempting to enable fullscreen mode: ${e.message} (${e.name})`);
            });
        }
    };

    if (isSubmitted) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom>Assessment Completed</Typography>
                    <Typography variant="body1">Thank you for completing the assessment.</Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                        Your session has been logged securely.
                    </Typography>
                </Paper>
            </Container>
        );
    }

    if (!hasStarted) {
        return (
            <Container maxWidth="md" sx={{ mt: 8 }}>
                <Paper elevation={4} sx={{ p: 6 }}>
                    <Typography variant="h4" gutterBottom fontWeight="bold" align="center">
                        Assessment Instructions
                    </Typography>

                    <Box sx={{ mt: 4, mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Please read the following rules carefully:
                        </Typography>

                        <Stack spacing={2} sx={{ mt: 2 }}>
                            <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h5">📺</Typography>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">Mandatory Fullscreen</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        You must remain in fullscreen mode throughout the assessment. Exiting will block the screen and continue the timer.
                                    </Typography>
                                </Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h5">🚫</Typography>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">No Tab Switching</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Leaving the tab or window losing focus will be logged as a security violation.
                                    </Typography>
                                </Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h5">🖱️</Typography>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">Restricted Actions</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Right-click, Copy, and Paste are disabled and monitored.
                                    </Typography>
                                </Box>
                            </Paper>
                        </Stack>
                    </Box>

                    <Box display="flex" justifyContent="center">
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleStart}
                            sx={{ minWidth: 200, py: 1.5, fontSize: '1.1rem' }}
                        >
                            Start Assessment
                        </Button>
                    </Box>
                </Paper>
            </Container>
        );
    }

    if (!isFullScreen) {
        return (
            <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center' }}>
                <Paper elevation={6} sx={{ p: 6, bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        ⚠️ Security Violation
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                        Fullscreen mode is required to continue.
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 4 }}>
                        The timer is still running. Please return to fullscreen immediately.
                    </Typography>
                    <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        onClick={handleFullscreen}
                        sx={{ fontWeight: 'bold' }}
                    >
                        Resume Assessment
                    </Button>
                </Paper>
            </Container>
        );
    }

    const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / MOCK_QUESTIONS.length) * 100;
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight="bold">Secure React Assessment</Typography>
                <Typography
                    variant="h6"
                    color={timeLeft < 60 ? 'error.main' : 'primary.main'}
                    fontWeight="bold"
                >
                    Time Left: {formatTime(timeLeft)}
                </Typography>
            </Box>

            <LinearProgress variant="determinate" value={progress} sx={{ mb: 4, height: 10, borderRadius: 5 }} />

            <Card elevation={4} sx={{ mb: 4 }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        Question {currentQuestionIndex + 1} of {MOCK_QUESTIONS.length}
                    </Typography>

                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        {currentQuestion.text}
                    </Typography>

                    <FormControl component="fieldset" fullWidth>
                        {currentQuestion.type === 'mcq' ? (
                            <RadioGroup
                                name={`question-${currentQuestion.id}`}
                                value={answers[currentQuestion.id] || ''}
                                onChange={handleAnswerChange}
                            >
                                {currentQuestion.options.map((option) => (
                                    <FormControlLabel
                                        key={option}
                                        value={option}
                                        control={<Radio />}
                                        label={option}
                                        sx={{ mb: 1 }}
                                    />
                                ))}
                            </RadioGroup>
                        ) : (
                            <TextField
                                multiline
                                rows={4}
                                variant="outlined"
                                placeholder="Type your answer here..."
                                value={answers[currentQuestion.id] || ''}
                                onChange={handleAnswerChange}
                                onBlur={handleTextBlur}
                                fullWidth
                            />
                        )}
                    </FormControl>
                </CardContent>
            </Card>

            <Stack direction="row" justifyContent="space-between">
                <Button
                    variant="outlined"
                    disabled={currentQuestionIndex === 0}
                    onClick={handlePrev}
                >
                    Previous
                </Button>

                <Box>
                    {/* Fullscreen button removed as it's enforced globally now, 
                        but we can keep a dedicated one if needed. 
                        For now, removing the separate button and letting the overlay handle it. 
                    */}

                    {currentQuestionIndex === MOCK_QUESTIONS.length - 1 ? (
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleSubmit}
                        >
                            Submit Assessment
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={handleNext}
                        >
                            Next
                        </Button>
                    )}
                </Box>
            </Stack>
        </Container>
    );
};

export default Assessment;
