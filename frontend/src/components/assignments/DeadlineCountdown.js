import React, { useState, useEffect } from 'react';

/**
 * DeadlineCountdown Component
 * Displays deadline with countdown timer and status indicator
 * 
 * @param {string} dueDate - ISO date string
 * @param {string} className - Additional CSS classes
 */
const DeadlineCountdown = ({ dueDate, className = '' }) => {
    const [timeRemaining, setTimeRemaining] = useState('');
    const [status, setStatus] = useState('upcoming');

    useEffect(() => {
        if (!dueDate) {
            setTimeRemaining('No deadline');
            setStatus('none');
            return;
        }

        const calculateTimeRemaining = () => {
            const now = new Date();
            const deadline = new Date(dueDate);
            const diff = deadline - now;

            if (diff < 0) {
                setStatus('overdue');
                const overdueDays = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
                setTimeRemaining(`Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            // Determine status
            if (days === 0 && hours < 24) {
                setStatus('due-today');
            } else if (days <= 1) {
                setStatus('due-soon');
            } else if (days <= 3) {
                setStatus('due-soon');
            } else {
                setStatus('upcoming');
            }

            // Format time remaining
            if (days > 0) {
                setTimeRemaining(`${days} day${days !== 1 ? 's' : ''} ${hours}h`);
            } else if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m`);
            } else {
                setTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
            }
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [dueDate]);

    // Status-based styling
    const getStatusStyles = () => {
        switch (status) {
            case 'overdue':
                return {
                    bg: 'bg-red-100',
                    text: 'text-red-800',
                    border: 'border-red-300',
                    icon: '🔴'
                };
            case 'due-today':
                return {
                    bg: 'bg-orange-100',
                    text: 'text-orange-800',
                    border: 'border-orange-300',
                    icon: '⚠️'
                };
            case 'due-soon':
                return {
                    bg: 'bg-yellow-100',
                    text: 'text-yellow-800',
                    border: 'border-yellow-300',
                    icon: '⏰'
                };
            case 'upcoming':
                return {
                    bg: 'bg-green-100',
                    text: 'text-green-800',
                    border: 'border-green-300',
                    icon: '📅'
                };
            default:
                return {
                    bg: 'bg-gray-100',
                    text: 'text-gray-800',
                    border: 'border-gray-300',
                    icon: '📅'
                };
        }
    };

    const styles = getStatusStyles();

    return (
        <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border ${styles.bg} ${styles.text} ${styles.border} ${className}`}>
            <span className="mr-2">{styles.icon}</span>
            <div className="flex flex-col">
                <span className="text-xs font-semibold">{timeRemaining}</span>
                {dueDate && (
                    <span className="text-xs opacity-75">
                        {new Date(dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                )}
            </div>
        </div>
    );
};

export default DeadlineCountdown;
