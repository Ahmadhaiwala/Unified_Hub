import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DeadlineCountdown from './DeadlineCountdown';
import './AssignmentList.css';

const AssignmentList = ({ groupId }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterSubject, setFilterSubject] = useState('all');
    const [sortBy, setSortBy] = useState('created_at');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        fetchAssignments();
    }, [groupId]);

    const fetchAssignments = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setError('Not authenticated');
                setLoading(false);
                return;
            }

            const response = await axios.get(
                `http://localhost:8000/api/v1/assignments/${groupId}`,
                { headers: { 'Authorization': `Bearer ${session.access_token}` } }
            );
            setAssignments(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching assignments:', err);
            setError(err.response?.data?.detail || 'Failed to load assignments');
            setLoading(false);
        }
    };

    const handleDeleteAssignment = async (assignmentId, e) => {
        e.stopPropagation();

        if (!window.confirm('Are you sure you want to delete this assignment?')) {
            return;
        }

        setDeletingId(assignmentId);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            await axios.delete(
                `http://localhost:8000/api/v1/assignments/${assignmentId}`,
                { headers: { 'Authorization': `Bearer ${session.access_token}` } }
            );

            fetchAssignments();
        } catch (err) {
            console.error('Error deleting assignment:', err);
            alert(err.response?.data?.detail || 'Failed to delete assignment');
        } finally {
            setDeletingId(null);
        }
    };

    // Get unique subjects for filter
    const subjects = ['all', ...new Set(assignments.map(a => a.subject).filter(Boolean))];

    // Filter and sort assignments
    const filteredAssignments = assignments
        .filter(a => filterSubject === 'all' || a.subject === filterSubject)
        .sort((a, b) => {
            if (sortBy === 'created_at') {
                return new Date(b.created_at) - new Date(a.created_at);
            } else if (sortBy === 'due_date') {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            }
            return 0;
        });

    const getSourceIcon = (sourceType) => {
        switch (sourceType) {
            case 'pdf': return '📄';
            case 'message': return '💬';
            case 'manual': return '✏️';
            default: return '📝';
        }
    };

    const getDeadlineStatus = (dueDate) => {
        if (!dueDate) return 'none';
        const now = new Date();
        const deadline = new Date(dueDate);
        const diff = deadline - now;

        if (diff < 0) return 'overdue';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'due-today';
        if (days <= 3) return 'due-soon';
        return 'upcoming';
    };

    if (loading) return <div className="loading">Loading assignments...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="assignment-list">
            <div className="list-header">
                <h2 className="text-3xl font-bold">📚 Assignments</h2>
                <div className="list-controls">
                    <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="filter-select"
                    >
                        {subjects.map(subject => (
                            <option key={subject} value={subject}>
                                {subject === 'all' ? 'All Subjects' : subject}
                            </option>
                        ))}
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                    >
                        <option value="created_at">Latest First</option>
                        <option value="due_date">By Deadline</option>
                    </select>
                </div>
            </div>

            {filteredAssignments.length === 0 ? (
                <div className="no-assignments">
                    <p className="text-lg opacity-50">No assignments found</p>
                </div>
            ) : (
                <div className="assignments-grid">
                    {filteredAssignments.map(assignment => {
                        const deadlineStatus = getDeadlineStatus(assignment.due_date);

                        return (
                            <div
                                key={assignment.id}
                                className={`assignment-card ${deadlineStatus}`}
                                onClick={() => navigate(`/assignment-detail/${assignment.id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="card-header">
                                    <span className="source-icon">{getSourceIcon(assignment.source_type)}</span>
                                    {assignment.subject && (
                                        <span className="subject-badge">{assignment.subject}</span>
                                    )}
                                </div>

                                <h3 className="assignment-title">{assignment.title}</h3>

                                {assignment.description && (
                                    <p className="assignment-description">
                                        {assignment.description.substring(0, 120)}
                                        {assignment.description.length > 120 ? '...' : ''}
                                    </p>
                                )}

                                <div className="card-footer">
                                    <DeadlineCountdown dueDate={assignment.due_date} className="deadline-compact" />

                                    <div className="card-actions">
                                        <button
                                            className="view-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/assignment-detail/${assignment.id}`);
                                            }}
                                        >
                                            View Details
                                        </button>
                                        <button
                                            className="delete-btn-small"
                                            onClick={(e) => handleDeleteAssignment(assignment.id, e)}
                                            disabled={deletingId === assignment.id}
                                            title="Delete assignment"
                                        >
                                            {deletingId === assignment.id ? '⏳' : '🗑️'}
                                        </button>
                                    </div>
                                </div>

                                {/* Deadline status indicator bar */}
                                {deadlineStatus !== 'none' && (
                                    <div className={`status-bar status-${deadlineStatus}`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AssignmentList;
