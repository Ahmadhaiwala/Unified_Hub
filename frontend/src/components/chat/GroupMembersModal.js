import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

export default function GroupMembersModal({ groupId, groupName, onClose, onGroupDeleted, onGroupUpdated, onGroupLeft }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [isEditingName, setIsEditingName] = useState(false)
    const [newGroupName, setNewGroupName] = useState(groupName || "")
    const [updating, setUpdating] = useState(false)
    const [groupAvatar, setGroupAvatar] = useState(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)

    useEffect(() => {
        if (groupId) {
            fetchMembers()
            fetchGroupData()
        }
    }, [groupId])

    async function fetchGroupData() {
        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setGroupAvatar(data.avatar_url || '')
                setNewGroupName(data.name || groupName)
            }
        } catch (error) {
            console.error("Failed to fetch group data:", error)
        }
    }

    async function fetchMembers() {
        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/members`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setMembers(data.members || [])

                // Check if current user is admin
                const currentMember = data.members.find(
                    m => m.user_id === user.user.id
                )
                setIsAdmin(currentMember?.role === "admin")
            }
        } catch (error) {
            console.error("Failed to fetch members:", error)
        } finally {
            setLoading(false)
        }
    }

    async function removeMember(userId) {
        if (!window.confirm("Are you sure you want to remove this member?")) return

        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/members/${userId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                // Refresh members list
                fetchMembers()
            } else {
                const error = await response.json()
                alert(error.detail || "Failed to remove member")
            }
        } catch (error) {
            console.error("Failed to remove member:", error)
            alert("Failed to remove member")
        }
    }

    async function leaveGroup() {
        if (!window.confirm(`Are you sure you want to leave "${groupName}"?`)) {
            return
        }

        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/leave`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                onClose()
                if (onGroupLeft) {
                    onGroupLeft(groupId)
                }
            } else {
                const error = await response.json()
                alert(error.detail || "Failed to leave group")
            }
        } catch (error) {
            console.error("Failed to leave group:", error)
            alert("Failed to leave group")
        }
    }

    async function updateMemberRole(memberId, currentRole) {
        const newRole = currentRole === "admin" ? "member" : "admin"
        const action = newRole === "admin" ? "promote to admin" : "remove admin privileges from"

        if (!window.confirm(`Are you sure you want to ${action} this member?`)) {
            return
        }

        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/members/${memberId}/role`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${user.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ role: newRole }),
                }
            )

            if (response.ok) {
                // Refresh the members list
                fetchMembers()
            } else {
                const error = await response.json()
                alert(error.detail || "Failed to update member role")
            }
        } catch (error) {
            console.error("Failed to update member role:", error)
            alert("Failed to update member role")
        }
    }

    if (!groupId) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`fixed inset-0 flex items-center justify-center z-50 p-4`}>
                <div
                    className={`${themeStyles.cardBg} rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`${themeStyles.secondbar} p-4 border-b ${themeStyles.border}`}>
                        <div className="flex justify-between items-center">
                            <h2 className={`text-xl font-bold ${themeStyles.text}`}>
                                Group Members ({members.length})
                            </h2>
                            <button
                                onClick={onClose}
                                className={`${themeStyles.accent} hover:${themeStyles.text} text-2xl`}
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="overflow-y-auto max-h-96 p-4">
                        {loading ? (
                            <div className={`text-center ${themeStyles.accent}`}>
                                Loading members...
                            </div>
                        ) : members.length === 0 ? (
                            <div className={`text-center ${themeStyles.accent}`}>
                                No members found
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {members.map((member) => {
                                    const isSelf = member.user_id === user.user.id
                                    const memberIsAdmin = member.role === "admin"

                                    return (
                                        <div
                                            key={member.id}
                                            className={`flex items-center justify-between p-3 rounded-lg ${themeStyles.secondbar} hover:opacity-80 transition`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Avatar */}
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                                    {member.username?.[0]?.toUpperCase() ||
                                                        member.email?.[0]?.toUpperCase() || "?"}
                                                </div>

                                                {/* User Info */}
                                                <div>
                                                    <div className={`font-semibold ${themeStyles.text}`}>
                                                        {member.username || member.full_name || "Unknown User"}
                                                        {isSelf && (
                                                            <span className={`ml-2 text-sm ${themeStyles.accent}`}>
                                                                (You)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`text-sm ${themeStyles.accent}`}>
                                                        {member.email}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Role Badge & Actions */}
                                            <div className="flex items-center gap-2">
                                                {memberIsAdmin && (
                                                    <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                                                        Admin
                                                    </span>
                                                )}

                                                {isAdmin && !isSelf && (
                                                    <>
                                                        <button
                                                            onClick={() => updateMemberRole(member.user_id, member.role)}
                                                            className={`px-3 py-1 text-xs rounded ${memberIsAdmin
                                                                ? "bg-orange-500 hover:bg-orange-600 text-white"
                                                                : "bg-green-500 hover:bg-green-600 text-white"
                                                                } transition`}
                                                        >
                                                            {memberIsAdmin ? "Remove Admin" : "Make Admin"}
                                                        </button>
                                                        <button
                                                            onClick={() => removeMember(member.user_id)}
                                                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition"
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {isAdmin && (
                        <>
                            {/* Edit Group Details Section */}
                            <div className={`p-4 border-t ${themeStyles.border}`}>
                                <h3 className={`text-sm font-semibold ${themeStyles.text} mb-3`}>
                                    Edit Group Details
                                </h3>
                                
                                <div className="space-y-3">
                                    {/* Group Name */}
                                    <div>
                                        <label className={`block text-xs ${themeStyles.accent} mb-1`}>
                                            Group Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            className={`w-full px-3 py-2 rounded ${themeStyles.secondbar} ${themeStyles.text} border ${themeStyles.border} text-sm`}
                                            placeholder="e.g., Study Group, Project Team..."
                                        />
                                    </div>
                                    
                                    {/* Group Avatar URL */}
                                    <div>
                                        <label className={`block text-xs ${themeStyles.accent} mb-1`}>
                                            Avatar URL
                                        </label>
                                        <input
                                            type="text"
                                            value={groupAvatar || ''}
                                            onChange={(e) => setGroupAvatar(e.target.value)}
                                            className={`w-full px-3 py-2 rounded ${themeStyles.secondbar} ${themeStyles.text} border ${themeStyles.border} text-sm`}
                                            placeholder="https://example.com/avatar.jpg"
                                        />
                                    </div>
                                    
                                    {/* Save Button */}
                                    <button
                                        onClick={async () => {
                                            if (!newGroupName.trim()) {
                                                alert("Group name cannot be empty")
                                                return
                                            }
                                            
                                            setUpdating(true)
                                            try {
                                                const response = await fetch(
                                                    `http://localhost:8000/api/chatgroups/${groupId}`,
                                                    {
                                                        method: 'PUT',
                                                        headers: {
                                                            'Authorization': `Bearer ${user.access_token}`,
                                                            'Content-Type': 'application/json'
                                                        },
                                                        body: JSON.stringify({
                                                            name: newGroupName,
                                                            avatar_url: groupAvatar || null
                                                        })
                                                    }
                                                )
                                                
                                                if (response.ok) {
                                                    alert("Group details updated successfully!")
                                                    if (onGroupUpdated) {
                                                        onGroupUpdated()
                                                    }
                                                } else {
                                                    const error = await response.json()
                                                    alert(error.detail || "Failed to update group")
                                                }
                                            } catch (error) {
                                                console.error("Failed to update group:", error)
                                                alert("Failed to update group")
                                            } finally {
                                                setUpdating(false)
                                            }
                                        }}
                                        disabled={updating}
                                        className={`w-full ${themeStyles.button} py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm`}
                                    >
                                        {updating ? "Saving..." : "💾 Save Changes"}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Add Members Button */}
                            <div className={`p-4 border-t ${themeStyles.border}`}>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className={`w-full ${themeStyles.button} py-2 rounded-lg hover:opacity-90 transition`}
                                >
                                    + Add Members
                                </button>
                            </div>
                        </>
                    )}

                    {/* Leave Group (for all members) */}
                    <div className={`p-4 border-t ${themeStyles.border}`}>
                        <button
                            onClick={leaveGroup}
                            className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
                        >
                            🚪 Leave Group
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Member Modal */}
            {showAddModal && (
                <AddMemberModal
                    groupId={groupId}
                    onClose={() => {
                        setShowAddModal(false)
                        fetchMembers() // Refresh members after adding
                    }}
                />
            )}
        </>
    )
}

// AddMemberModal Component
function AddMemberModal({ groupId, onClose }) {
    const { user } = useAuth()
    const { themeStyles } = useTheme()
    const [availableUsers, setAvailableUsers] = useState([])
    const [selectedUsers, setSelectedUsers] = useState(new Set())
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchAvailableUsers()
    }, [groupId])

    async function fetchAvailableUsers() {
        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/available-users`,
                {
                    headers: { Authorization: `Bearer ${user.access_token}` },
                }
            )

            if (response.ok) {
                const data = await response.json()
                setAvailableUsers(data.users || [])
            }
        } catch (error) {
            console.error("Failed to fetch available users:", error)
        } finally {
            setLoading(false)
        }
    }

    function toggleUser(userId) {
        const newSelected = new Set(selectedUsers)
        if (newSelected.has(userId)) {
            newSelected.delete(userId)
        } else {
            newSelected.add(userId)
        }
        setSelectedUsers(newSelected)
    }

    async function addMembers() {
        if (selectedUsers.size === 0) return

        setAdding(true)
        try {
            const response = await fetch(
                `http://localhost:8000/api/chatgroups/${groupId}/members`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${user.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        user_ids: Array.from(selectedUsers),
                    }),
                }
            )

            if (response.ok) {
                onClose()
            } else {
                const error = await response.json()
                alert(error.detail || "Failed to add members")
            }
        } catch (error) {
            console.error("Failed to add members:", error)
            alert("Failed to add members")
        } finally {
            setAdding(false)
        }
    }

    const filteredUsers = availableUsers.filter(
        (u) =>
            u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div
                    className={`${themeStyles.cardBg} rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`${themeStyles.secondbar} p-4 border-b ${themeStyles.border}`}>
                        <div className="flex justify-between items-center">
                            <h2 className={`text-xl font-bold ${themeStyles.text}`}>
                                Add Members
                            </h2>
                            <button
                                onClick={onClose}
                                className={`${themeStyles.accent} hover:${themeStyles.text} text-2xl`}
                            >
                                ×
                            </button>
                        </div>

                        {/* Search */}
                        <div className="mt-3">
                            <input
                                type="text"
                                placeholder="🔍 Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${themeStyles.input}`}
                            />
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="overflow-y-auto max-h-96 p-4">
                        {loading ? (
                            <div className={`text-center ${themeStyles.accent}`}>
                                Loading users...
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className={`text-center ${themeStyles.accent}`}>
                                {searchQuery ? "No users found" : "All users are already members"}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredUsers.map((availUser) => {
                                    const isSelected = selectedUsers.has(availUser.user_id)

                                    return (
                                        <div
                                            key={availUser.user_id}
                                            onClick={() => toggleUser(availUser.user_id)}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${isSelected
                                                ? "bg-blue-500 text-white"
                                                : `${themeStyles.secondbar} hover:opacity-80`
                                                }`}
                                        >
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => { }}
                                                className="w-5 h-5"
                                            />

                                            {/* Avatar */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isSelected
                                                ? "bg-white text-blue-500"
                                                : "bg-gradient-to-br from-blue-400 to-purple-500 text-white"
                                                }`}>
                                                {availUser.username?.[0]?.toUpperCase() ||
                                                    availUser.email?.[0]?.toUpperCase() || "?"}
                                            </div>

                                            {/* User Info */}
                                            <div className="flex-1">
                                                <div className="font-semibold">
                                                    {availUser.username || availUser.full_name || "Unknown User"}
                                                </div>
                                                <div className={`text-sm ${isSelected ? "text-blue-100" : themeStyles.accent}`}>
                                                    {availUser.email}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className={`p-4 border-t ${themeStyles.border} flex gap-2`}>
                        <button
                            onClick={onClose}
                            className={`flex-1 px-4 py-2 rounded-lg border ${themeStyles.border} ${themeStyles.text} hover:opacity-80 transition`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={addMembers}
                            disabled={selectedUsers.size === 0 || adding}
                            className={`flex-1 ${themeStyles.button} px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition`}
                        >
                            {adding ? "Adding..." : `Add ${selectedUsers.size} Member${selectedUsers.size !== 1 ? "s" : ""}`}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
