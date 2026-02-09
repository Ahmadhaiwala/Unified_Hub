import React, { useState, useEffect } from 'react';
import { reminderAPI } from '../../lib/api';
import './ReminderSuggestionModal.css';

const ReminderSuggestionModal = ({
    suggestion,
    groupId,
    onConfirm,
    onCancel
}) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Pre-fill form with AI suggestions
        if (suggestion) {
            setFormData({
                title: suggestion.title || '',
                description: suggestion.description || '',
                due_date: suggestion.due_date ? formatDateTimeLocal(suggestion.due_date) : '',
                priority: suggestion.priority || 'medium'
            });
        }
    }, [suggestion]);

    const formatDateTimeLocal = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        // Format to YYYY-MM-DDTHH:MM for datetime-local input
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Prepare data for API
            const reminderData = {
                title: formData.title,
                description: formData.description,
                due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
                priority: formData.priority
            };

            // Call API to create reminder
            await reminderAPI.create(groupId, reminderData);

            // Notify parent and close modal
            if (onConfirm) {
                onConfirm(reminderData);
            }
        } catch (err) {
            console.error('Failed to create reminder:', err);
            setError('Failed to create reminder. Please try again.');
            setLoading(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#ff4444';
            case 'medium': return '#ff9800';
            case 'low': return '#4caf50';
            default: return '#999';
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content reminder-suggestion-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>🤖 AI Detected: Create Reminder?</h3>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>

                {suggestion && (
                    <div className="ai-confidence-badge">
                        <span>AI Confidence: <strong>{Math.round(suggestion.confidence * 100)}%</strong></span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="reminder-form">
                    <div className="form-group">
                        <label htmlFor="title">
                            📌 Title <span className="required">*</span>
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="What should members remember?"
                            required
                            maxLength={255}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">
                            📝 Description
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add more details (optional)"
                            rows={3}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="due_date">
                                🗓️ Due Date
                            </label>
                            <input
                                id="due_date"
                                type="datetime-local"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="priority">
                                ⚡ Priority
                            </label>
                            <select
                                id="priority"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                style={{ borderLeft: `4px solid ${getPriorityColor(formData.priority)}` }}
                            >
                                <option value="low">🟢 Low Priority</option>
                                <option value="medium">🟡 Medium Priority</option>
                                <option value="high">🔴 High Priority</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            ❌ {error}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !formData.title}
                        >
                            {loading ? '⏳ Creating...' : '✅ Create Reminder'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            ✖ Cancel
                        </button>
                    </div>
                </form>

                <div className="modal-footer">
                    <small>💡 You can edit the AI suggestions before creating</small>
                </div>
            </div>
        </div>
    );
};

export default ReminderSuggestionModal;
