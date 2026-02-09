import { useState } from "react"
import { useTheme } from "../../context/ThemeContext"


// File type icons mapping
const FILE_ICONS = {

    "application/pdf": "📄",
    "application/msword": "📝",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",

    // Spreadsheets
    "application/vnd.ms-excel": "📊",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",

    // Presentations
    "application/vnd.ms-powerpoint": "📽️",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "📽️",

    // Images
    "image/jpeg": "🖼️",
    "image/png": "🖼️",
    "image/gif": "🖼️",
    "image/webp": "🖼️",

    // Videos
    "video/mp4": "🎥",
    "video/mpeg": "🎥",
    "video/quicktime": "🎥",

    // Audio
    "audio/mpeg": "🎵",
    "audio/wav": "🎵",

    // Archives
    "application/zip": "🗜️",
    "application/x-rar-compressed": "🗜️",

    // Code
    "text/javascript": "💻",
    "text/python": "💻",
    "text/html": "💻",

    // Default
    "default": "📎"
}

function getFileIcon(fileType) {
    return FILE_ICONS[fileType] || FILE_ICONS["default"]
}

function formatFileSize(bytes) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

export default function AttachmentDisplay({ attachment, onDownload, onDelete, canDelete }) {
    const { themeStyles } = useTheme()
    const [downloading, setDownloading] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const isImage = attachment.file_type?.startsWith("image/")
    const fileIcon = getFileIcon(attachment.file_type)

    async function handleDownload() {
        if (downloading) return
        setDownloading(true)

        try {
            // If we have a direct file_url, use it
            if (attachment.file_url) {
                window.open(attachment.file_url, "_blank")
            } else {
                // Otherwise use the download handler
                await onDownload(attachment)
            }
        } catch (error) {
            console.error("Download failed:", error)
            alert("Failed to download file")
        } finally {
            setDownloading(false)
        }
    }

    async function handleDelete() {
        if (!window.confirm("Are you sure you want to delete this file?")) return
        if (deleting) return

        setDeleting(true)
        try {
            await onDelete(attachment.id)
        } catch (error) {
            console.error("Delete failed:", error)
            alert("Failed to delete file")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div
            className={`${themeStyles.secondbar} border ${themeStyles.border} rounded-lg p-3 max-w-sm`}
        >
            <div className="flex items-start gap-3">
                {/* File Icon */}
                <div className="text-4xl flex-shrink-0">
                    {fileIcon}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${themeStyles.text} truncate`}>
                        {attachment.file_name}
                    </div>
                    <div className={`text-sm ${themeStyles.accent} mt-1`}>
                        {formatFileSize(attachment.file_size)}
                    </div>
                    {attachment.uploader_username && (
                        <div className={`text-xs ${themeStyles.accent} mt-1`}>
                            Uploaded by {attachment.uploader_username}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className={`flex-1 ${themeStyles.button} px-3 py-2 rounded text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {downloading ? "Downloading..." : "⬇️ Download"}
                </button>

                {canDelete && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {deleting ? "..." : "🗑️"}
                    </button>
                )}
            </div>
        </div>
    )
}

// Component for uploading files
export function FileUploadButton({ onFileSelect, disabled }) {
    const { themeStyles } = useTheme()
    const [dragActive, setDragActive] = useState(false)

    function handleFileChange(e) {
        const file = e.target.files?.[0]
        if (file) {
            validateAndSelectFile(file)
        }
    }

    function validateAndSelectFile(file) {
        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            alert("File size exceeds 10MB limit")
            return
        }

        onFileSelect(file)
    }

    function handleDrag(e) {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    function handleDrop(e) {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const file = e.dataTransfer.files?.[0]
        if (file) {
            validateAndSelectFile(file)
        }
    }

    return (
        <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className="relative"
        >
            <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled}
            />
            <label
                htmlFor="file-upload"
                className={`cursor-pointer px-3 py-2 rounded-lg transition ${disabled
                    ? "opacity-50 cursor-not-allowed"
                    : dragActive
                        ? "bg-blue-600"
                        : `${themeStyles.secondbar} border ${themeStyles.border} hover:opacity-80`
                    }`}
            >
                📎
            </label>
        </div>
    )
}

// Preview component for selected file before upload
export function FilePreview({ file, onRemove }) {
    const { themeStyles } = useTheme()
    const fileIcon = getFileIcon(file.type)
    const isImage = file.type.startsWith("image/")

    return (
        <div className={`${themeStyles.secondbar} border ${themeStyles.border} rounded-lg p-3 flex items-center gap-3`}>
            {isImage ? (
                <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded"
                />
            ) : (
                <div className="text-3xl">{fileIcon}</div>
            )}

            <div className="flex-1 min-w-0">
                <div className={`font-semibold ${themeStyles.text} truncate text-sm`}>
                    {file.name}
                </div>
                <div className={`text-xs ${themeStyles.accent}`}>
                    {formatFileSize(file.size)}
                </div>
            </div>

            <button
                onClick={onRemove}
                className={`${themeStyles.accent} hover:text-red-500 text-xl`}
            >
                ×
            </button>
        </div>
    )
}
