import React from 'react';

/**
 * ConfidenceBadge Component
 * Displays confidence score with color-coded visual indicator
 * 
 * @param {number} score - Confidence score (0-1) or null
 * @param {string} className - Additional CSS classes
 */
const ConfidenceBadge = ({ score, className = '' }) => {
    if (score === null || score === undefined) {
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
                <span className="mr-1">✍️</span>
                Manual
            </span>
        );
    }

    const percentage = Math.round(score * 100);

    // Determine color based on confidence level
    let bgColor, textColor, label, icon;

    if (score >= 0.8) {
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        label = 'Excellent';
        icon = '✓';
    } else if (score >= 0.6) {
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        label = 'Good';
        icon = '~';
    } else {
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        label = 'Weak';
        icon = '!';
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor} ${className}`}>
            <span className="mr-1">{icon}</span>
            {percentage}% {label}
        </span>
    );
};

export default ConfidenceBadge;
