
import React, { useEffect } from 'react';
import Watermark from './Watermark';
import { EventLogger } from '../services/EventLogger';
import { Box } from '@mui/material';

interface AssessmentLayoutProps {
    children: React.ReactNode;
    candidateName: string;
    candidateId: string;
    attemptId: string;
}

const AssessmentLayout: React.FC<AssessmentLayoutProps> = ({
    children,
    candidateName,
    candidateId,
    attemptId
}) => {
    useEffect(() => {
        EventLogger.init(candidateId, attemptId);

        // Disable right click context menu
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            EventLogger.log('COPY_ATTEMPT', { method: 'CONTEXT_MENU' });
        };

        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [candidateId, attemptId]);

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            position: 'relative',
            // Prevent selection to discourage copy-paste
            userSelect: 'none',
            WebkitUserSelect: 'none',
        }}>
            <Watermark
                name={candidateName}
                email={candidateId}
                attemptId={attemptId}
            />
            <Box sx={{ position: 'relative', zIndex: 1, padding: 3 }}>
                {children}
            </Box>
        </Box>
    );
};

export default AssessmentLayout;
