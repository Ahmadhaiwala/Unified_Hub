import { supabase } from './supabase';

const API_URL = 'http://localhost:8000/api';

// Helper function to get auth headers
const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
    };
};

// ============================================================================
// REMINDER APIs
// ============================================================================

export const reminderAPI = {
    // Create a new reminder (admin only)
    create: async (groupId, reminderData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/reminders/${groupId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(reminderData)
        });
        if (!response.ok) throw new Error('Failed to create reminder');
        return response.json();
    },

    // Get all reminders for a group
    getForGroup: async (groupId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/reminders/${groupId}`, {
            method: 'GET',
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch reminders');
        return response.json();
    },

    // Get pending reminders for current user
    getPending: async () => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/reminders/me/pending`, {
            method: 'GET',
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch pending reminders');
        return response.json();
    },

    // Mark reminder as read
    markRead: async (reminderId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/reminders/${reminderId}/read`, {
            method: 'POST',
            headers
        });
        if (!response.ok) throw new Error('Failed to mark reminder as read');
        return response.json();
    },

    // Delete a reminder (admin only)
    delete: async (reminderId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/reminders/${reminderId}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete reminder');
        return response.json();
    }
};

// ============================================================================
// QUESTION SHEET APIs
// ============================================================================

export const questionSheetAPI = {
    // Create a new question sheet with questions (admin only)
    create: async (groupId, sheetData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/question-sheets/${groupId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(sheetData)
        });
        if (!response.ok) throw new Error('Failed to create question sheet');
        return response.json();
    },

    // Get all question sheets for a group
    getForGroup: async (groupId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/question-sheets/${groupId}`, {
            method: 'GET',
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch question sheets');
        return response.json();
    },

    // Get detailed information about a question sheet
    getDetail: async (sheetId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/question-sheets/detail/${sheetId}`, {
            method: 'GET',
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch question sheet details');
        return response.json();
    },

    // Submit an answer to a question
    submitAnswer: async (sheetId, questionId, answerText) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/question-sheets/${sheetId}/questions/${questionId}/answer`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ question_id: questionId, answer_text: answerText })
        });
        if (!response.ok) throw new Error('Failed to submit answer');
        return response.json();
    },

    // Get student progress on a question sheet
    getProgress: async (sheetId, studentId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/question-sheets/${sheetId}/progress/${studentId}`, {
            method: 'GET',
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch progress');
        return response.json();
    },

    // Delete a question sheet (admin only)
    delete: async (sheetId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/question-sheets/${sheetId}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete question sheet');
        return response.json();
    }
};

// ============================================================================
// NOTIFICATION APIs
// ============================================================================

export const notificationAPI = {
    // Get all notifications for current user
    getAll: async (unreadOnly = false, limit = 50) => {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({ limit, unread_only: unreadOnly });
        const response = await fetch(`${API_URL}/notifications?${params}`, {
            method: 'GET',
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        return response.json();
    },

    // Get unread notification count
    getUnreadCount: async () => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
            method: 'GET',
            headers
        });
        if (!response.ok) throw new Error('Failed to fetch unread count');
        return response.json();
    },

    // Mark a notification as read (dismiss)
    markRead: async (notificationId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers
        });
        if (!response.ok) throw new Error('Failed to dismiss notification');
        return response.json();
    },

    // Delete a notification
    delete: async (notificationId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete notification');
        return response.json();
    },

    // Mark all notifications as read
    markAllRead: async () => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
            method: 'POST',
            headers
        });
        if (!response.ok) throw new Error('Failed to mark all as read');
        return response.json();
    }
};

