import React from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import AssignmentDetail from '../components/assignments/AssignmentDetail';

export default function AssignmentDetailPage() {
    const { assignmentId } = useParams();
    const { themeStyles } = useTheme();

    return (
        <div className={`min-h-screen ${themeStyles.bg}`}>
            <AssignmentDetail assignmentId={assignmentId} />
        </div>
    );
}
