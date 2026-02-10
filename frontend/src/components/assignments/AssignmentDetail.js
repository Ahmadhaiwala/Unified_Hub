import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import ConfidenceBadge from './ConfidenceBadge';
import DeadlineCountdown from './DeadlineCountdown';

const AssignmentDetail = ({ assignmentId }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { themeStyles } = useTheme();

    const [assignmentData, setAssignmentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [selectedQuestionId, setSelectedQuestionId] = useState('auto');
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('time');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user?.access_token) fetchAssignmentDetail();
    }, [assignmentId, user]);

    const fetchAssignmentDetail = async () => {
        try {
            const response = await axios.get(
                `http://localhost:8000/api/v1/assignments/detail/${assignmentId}`,
                { headers: { Authorization: `Bearer ${user.access_token}` } }
            );
            setAssignmentData(response.data);
        } catch {
            setError('Failed to load assignment');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('reply_text', replyText);
            if (selectedQuestionId !== 'auto') {
                formData.append('question_id', selectedQuestionId);
            }

            await axios.post(
                `http://localhost:8000/api/v1/assignments/${assignmentId}/reply-with-question`,
                formData,
                { headers: { Authorization: `Bearer ${user.access_token}` } }
            );
            setReplyText('');
            setSelectedQuestionId('auto');
            setSubmitSuccess(true);
            fetchAssignmentDetail();
            setTimeout(() => setSubmitSuccess(false), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAssignment = async () => {
        if (!window.confirm('Delete permanently?')) return;
        setDeleting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await axios.delete(
                `http://localhost:8000/api/v1/assignments/${assignmentId}`,
                { headers: { Authorization: `Bearer ${session.access_token}` } }
            );
            navigate(`/assignments/${assignmentData.assignment.group_id}`);
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleString() : 'No deadline';

    if (loading) return <div className={themeStyles.text}>Loading...</div>;
    if (error) return <div className={themeStyles.danger}>{error}</div>;

    const assignment = assignmentData?.assignment || {};
    const questions = assignmentData?.questions || [];

    return (
        <div className={`${themeStyles.bg} p-6 space-y-8`}>

            {/* HEADER */}
            <div className={`${themeStyles.cardBg} ${themeStyles.card} p-6 rounded-xl shadow-lg`}>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <h1 className={`${themeStyles.heading} text-3xl font-bold mb-2`}>{assignment.title}</h1>
                        {assignment.subject && (
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                                📚 {assignment.subject}
                            </span>
                        )}
                        <div className="mt-4 space-y-2">
                            <p className="text-sm opacity-75">Created: {formatDate(assignment.created_at)}</p>
                            <DeadlineCountdown dueDate={assignment.due_date} />
                        </div>
                    </div>

                    <button
                        onClick={handleDeleteAssignment}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                        {deleting ? 'Deleting...' : '🗑️ Delete'}
                    </button>
                </div>
            </div>

            {/* DESCRIPTION */}
            {assignment.description && (
                <div className={`${themeStyles.cardBg} ${themeStyles.card} p-6 rounded-xl`}>
                    <h3 className={`${themeStyles.heading} text-lg font-semibold mb-3`}>📝 Description</h3>
                    <p className="whitespace-pre-wrap">{assignment.description}</p>
                </div>
            )}

            {/* SUBMIT REPLY */}
            <div className={`${themeStyles.cardBg} ${themeStyles.card} p-6 rounded-xl`}>
                <h3 className={`${themeStyles.heading} text-lg font-semibold mb-4`}>✍️ Submit Your Answer</h3>
                <form onSubmit={handleSubmitReply} className="space-y-4">
                    {questions.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Select Question (Optional)</label>
                            <select
                                value={selectedQuestionId}
                                onChange={e => setSelectedQuestionId(e.target.value)}
                                className={`${themeStyles.input} w-full px-4 py-2 rounded-lg border`}
                            >
                                <option value="auto">🤖 Let AI Detect</option>
                                {questions.map(q => (
                                    <option key={q.id} value={q.id}>
                                        Q{q.question_order}: {q.question_text.substring(0, 50)}...
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        rows="5"
                        placeholder="Type your answer here..."
                        className={`${themeStyles.input} w-full px-4 py-3 rounded-lg border`}
                    />
                    <button
                        type="submit"
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                    >
                        {submitting ? '⏳ Submitting...' : '📤 Submit Answer'}
                    </button>
                    {submitSuccess && <p className="text-green-600 font-semibold">✅ Answer submitted successfully!</p>}
                </form>
            </div>

            {/* QUESTIONS AND ANSWERS */}
            {questions.length > 0 ? (
                <div className="space-y-6">
                    <h2 className={`${themeStyles.heading} text-2xl font-bold`}>📋 Questions & Answers</h2>
                    {questions.map(question => (
                        <div key={question.id} className={`${themeStyles.cardBg} ${themeStyles.card} p-6 rounded-xl shadow-md`}>
                            {/* Question Header */}
                            <div className="border-b pb-4 mb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-sm font-bold rounded-full mb-2">
                                            Question {question.question_order}
                                        </span>
                                        <h3 className="text-lg font-semibold mt-2">{question.question_text}</h3>
                                    </div>
                                    {question.points > 0 && (
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                                            {question.points} pts
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Answers */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm opacity-75 mb-3">
                                    {question.answers.length} Answer{question.answers.length !== 1 ? 's' : ''}
                                </h4>
                                {question.answers.length === 0 ? (
                                    <p className="text-sm opacity-50 italic">No answers yet</p>
                                ) : (
                                    question.answers.map(answer => (
                                        <div key={answer.id} className="bg-white bg-opacity-50 p-4 rounded-lg border border-gray-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold">{answer.student_full_name || answer.student_username}</p>
                                                    <ConfidenceBadge score={answer.confidence_score} />
                                                    {answer.is_ai_detected && (
                                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                                            🤖 Auto-detected
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs opacity-60">{formatDate(answer.submitted_at)}</p>
                                            </div>
                                            <p className="mt-2 whitespace-pre-wrap">{answer.answer_text}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`${themeStyles.cardBg} ${themeStyles.card} p-6 rounded-xl text-center`}>
                    <p className="opacity-50">No questions available for this assignment</p>
                </div>
            )}

        </div>
    );
};

export default AssignmentDetail;
