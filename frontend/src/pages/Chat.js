import { useState } from "react"
import { useTheme } from "../context/ThemeContext"
import ConversationList from "../components/chat/ConversationList"
import ChatWindow from "../components/chat/ChatWindow"
import FriendListForChat from "../components/chat/FriendListForChat"
import GroupChatList from "../components/chat/GroupChatList"
import GroupChatWindow from "../components/chat/GroupChatWindow"
import CreateGroupModal from "../components/chat/CreateGroupModal"

export default function Chat() {
    const { themeStyles } = useTheme()
    const [activeTab, setActiveTab] = useState("direct") // "direct" or "groups"
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [selectedFriendName, setSelectedFriendName] = useState("")
    const [selectedGroup, setSelectedGroup] = useState(null)
    const [selectedGroupName, setSelectedGroupName] = useState("")
    const [showFriendList, setShowFriendList] = useState(false)
    const [showCreateGroup, setShowCreateGroup] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    function handleSelectConversation(conversationId, friendName) {
        setSelectedConversation(conversationId)
        setSelectedFriendName(friendName)
        setShowFriendList(false)
    }

    function handleSelectFriend(conversationId, friendName) {
        setSelectedConversation(conversationId)
        setSelectedFriendName(friendName)
        setShowFriendList(false)
        setRefreshTrigger(prev => prev + 1)
    }

    function handleSelectGroup(groupId, groupName) {
        setSelectedGroup(groupId)
        setSelectedGroupName(groupName)
    }

    function handleGroupCreated() {
        setRefreshTrigger(prev => prev + 1)
        setShowCreateGroup(false)
    }

    function handleGroupDeleted(groupId) {
        // Clear selection if the deleted group was selected
        if (selectedGroup === groupId) {
            setSelectedGroup(null)
            setSelectedGroupName("")
        }
        // Refresh the groups list
        setRefreshTrigger(prev => prev + 1)
    }

    function handleGroupUpdated(groupId, newGroupName) {
        // Update the group name if it's currently selected
        if (selectedGroup === groupId) {
            setSelectedGroupName(newGroupName)
        }
        // Refresh the groups list to show the updated name
        setRefreshTrigger(prev => prev + 1)
    }

    function handleGroupLeft(groupId) {
        // Clear selection if the user left the currently selected group
        if (selectedGroup === groupId) {
            setSelectedGroup(null)
            setSelectedGroupName("")
        }
        // Refresh the groups list
        setRefreshTrigger(prev => prev + 1)
    }

    return (
        <div className={`flex flex-col h-[calc(100vh-8rem)] ${themeStyles.cardBg} rounded-lg shadow-lg overflow-hidden ${themeStyles.border} border`}>
            {/* Tab Navigation */}
            <div className={`flex ${themeStyles.secondbar} ${themeStyles.border} border-b`}>
                <button
                    onClick={() => setActiveTab("direct")}
                    className={`flex-1 px-6 py-3 font-medium transition-colors ${activeTab === "direct"
                        ? `${themeStyles.text} border-b-2 border-blue-500`
                        : `${themeStyles.accent} hover:${themeStyles.text}`
                        }`}
                >
                    Direct Messages
                </button>
                <button
                    onClick={() => setActiveTab("groups")}
                    className={`flex-1 px-6 py-3 font-medium transition-colors ${activeTab === "groups"
                        ? `${themeStyles.text} border-b-2 border-blue-500`
                        : `${themeStyles.accent} hover:${themeStyles.text}`
                        }`}
                >
                    Groups
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Conversation/Group List */}
                <div className={`w-full lg:w-80 ${themeStyles.border} border-r flex flex-col`}>
                    {activeTab === "direct" ? (
                        <>
                            <ConversationList
                                onSelectConversation={handleSelectConversation}
                                selectedConversationId={selectedConversation}
                                refreshTrigger={refreshTrigger}
                            />
                            <button
                                onClick={() => setShowFriendList(!showFriendList)}
                                className={`p-4 ${themeStyles.button} font-medium`}
                            >
                                {showFriendList ? "← Back to Conversations" : "+ Start New Chat"}
                            </button>
                        </>
                    ) : (
                        <>
                            <GroupChatList
                                onSelectGroup={handleSelectGroup}
                                selectedGroupId={selectedGroup}
                                refreshTrigger={refreshTrigger}
                            />
                            <button
                                onClick={() => setShowCreateGroup(true)}
                                className={`p-4 ${themeStyles.button} font-medium`}
                            >
                                + Create New Group
                            </button>
                        </>
                    )}
                </div>

                {/* Chat Window */}
                <div className="flex-1 flex flex-col">
                    {activeTab === "direct" ? (
                        showFriendList ? (
                            <FriendListForChat onSelectFriend={handleSelectFriend} />
                        ) : (
                            <ChatWindow
                                conversationId={selectedConversation}
                                friendName={selectedFriendName}
                                onMessageSent={() => setRefreshTrigger(prev => prev + 1)}
                            />
                        )
                    ) : (
                        <GroupChatWindow
                            groupId={selectedGroup}
                            groupName={selectedGroupName}
                            onMessageSent={() => setRefreshTrigger(prev => prev + 1)}
                            onGroupDeleted={handleGroupDeleted}
                            onGroupUpdated={handleGroupUpdated}
                            onGroupLeft={handleGroupLeft}
                        />
                    )}
                </div>
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onGroupCreated={handleGroupCreated}
                />
            )}
        </div>
    )
}

