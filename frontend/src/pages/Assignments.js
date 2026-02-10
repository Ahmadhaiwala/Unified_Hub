import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import AssignmentUpload from '../components/assignments/AssignmentUpload';
import AssignmentList from '../components/assignments/AssignmentList';

export default function AssignmentsPage() {
    const { groupId } = useParams();
    const { themeStyles } = useTheme();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showUpload, setShowUpload] = useState(false);

    const handleUploadSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        setShowUpload(false);
    };

    if (!groupId) {
        return (
            <div className={`p-8 ${themeStyles.cardBg} rounded-lg`}>
                <p className={themeStyles.text}>Please select a group to view question poles</p>
            </div>
        );
    }

    return (
        <div className={`${themeStyles.cardBg} rounded-lg shadow-lg p-6`}>
            <div className="flex justify-between items-center mb-6">
                <h1 className={`text-3xl font-bold ${themeStyles.text}`}>Question Poles</h1>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className={`px-6 py-2 ${themeStyles.button} rounded-lg font-medium`}
                >
                    {showUpload ? '← Back to List' : '+ Upload Question Pole'}
                </button>
            </div>

            {showUpload ? (
                <AssignmentUpload
                    groupId={groupId}
                    onUploadSuccess={handleUploadSuccess}
                />
            ) : (
                <AssignmentList
                    groupId={groupId}
                    key={refreshTrigger}
                />
            )}
        </div>
    );
}
