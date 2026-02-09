import React, { useState } from 'react';
import '../chat/ChatInterface.css';

const AdminPanel = ({ groupId, isAdmin }) => {
    const [activeTab, setActiveTab] = useState('reminders');

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="admin-panel">
            <div className="admin-panel-header">
                <h3>⚙️ Admin Panel</h3>
                <div className="admin-tabs">
                    <button
                        className={`tab-button ${activeTab === 'reminders' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reminders')}
                    >
                        🔔 Reminders
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'question-sheets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('question-sheets')}
                    >
                        📝 Question Sheets
                    </button>
                </div>
            </div>

            <div className="admin-panel-content">
                {activeTab === 'reminders' && (
                    <RemindersTab groupId={groupId} />
                )}
                {activeTab === 'question-sheets' && (
                    <QuestionSheetsTab groupId={groupId} />
                )}
            </div>
        </div >
    );
};

const RemindersTab = ({ groupId }) => {
    const [reminders, setReminders] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

    React.useEffect(() => {
        loadReminders();
    }, [groupId]);

    const loadReminders = async () => {
        // TODO: Implement API call
        console.log('Loading reminders for group:', groupId);
    };

    return (
        <div className="reminders-tab">
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                + Create Reminder
            </button>
            <div className="reminders-list">
                {reminders.length === 0 ? (
                    <p>No reminders yet. Create one to get started!</p>
                ) : (
                    reminders.map(reminder => (
                        <div key={reminder.id} className="reminder-card">
                            <h4>{reminder.title}</h4>
                            <p>{reminder.description}</p>
                            <small>Due: {reminder.due_date}</small>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const QuestionSheetsTab = ({ groupId }) => {
    const [sheets, setSheets] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

    React.useEffect(() => {
        loadQuestionSheets();
    }, [groupId]);

    const loadQuestionSheets = async () => {
        // TODO: Implement API call
        console.log('Loading question sheets for group:', groupId);
    };

    return (
        <div className="question-sheets-tab">
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                + Create Question Sheet
            </button>
            <div className="sheets-list">
                {sheets.length === 0 ? (
                    <p>No question sheets yet. Create one to get started!</p>
                ) : (
                    sheets.map(sheet => (
                        <div key={sheet.id} className="sheet-card">
                            <h4>{sheet.title}</h4>
                            <p>{sheet.description}</p>
                            <small>{sheet.total_questions} questions</small>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
