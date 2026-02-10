import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './AssignmentUpload.css';

const AssignmentUpload = ({ groupId, onUploadSuccess }) => {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf') {
                setFile(droppedFile);
                setError(null);
            } else {
                setError('Please upload a PDF file');
            }
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type === 'application/pdf') {
                setFile(selectedFile);
                setError(null);
            } else {
                setError('Please upload a PDF file');
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file');
            return;
        }

        if (!user?.access_token) {
            setError('Please log in to upload question poles');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(
                `http://localhost:8000/api/v1/assignments/${groupId}/upload-pdf`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${user.access_token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            console.log('✅ Assignment created:', response.data);
            setFile(null);
            if (onUploadSuccess) {
                onUploadSuccess(response.data);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.detail || 'Failed to upload PDF');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="assignment-upload">
            <h3>Upload Question Pole PDF</h3>

            <div
                className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id="file-input"
                    accept=".pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                {!file ? (
                    <label htmlFor="file-input" className="upload-label">
                        <div className="upload-icon">📄</div>
                        <p>Drag and drop PDF here or click to browse</p>
                        <span className="upload-hint">Maximum file size: 10MB</span>
                    </label>
                ) : (
                    <div className="file-selected">
                        <div className="file-icon">📎</div>
                        <div className="file-info">
                            <p className="file-name">{file.name}</p>
                            <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                            className="remove-file-btn"
                            onClick={() => setFile(null)}
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {error && <div className="upload-error">{error}</div>}

            <button
                className="upload-btn"
                onClick={handleUpload}
                disabled={!file || uploading}
            >
                {uploading ? 'Uploading...' : 'Create Question Pole'}
            </button>
        </div>
    );
};

export default AssignmentUpload;
