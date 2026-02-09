
import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import AssessmentLayout from './components/AssessmentLayout';
import Assessment from './components/Assessment';

// Create a modern theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // Modern blue
    },
    secondary: {
      main: '#475569', // Slate
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  // In a real app, these would come from auth/context
  const candidateData = {
    candidateName: "John Doe",
    candidateId: "CAND-12345",
    attemptId: "ATT-98765-XYZ"
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AssessmentLayout
        candidateName={candidateData.candidateName}
        candidateId={candidateData.candidateId}
        attemptId={candidateData.attemptId}
      >
        <Assessment />
      </AssessmentLayout>
    </ThemeProvider>
  );
}

export default App;
