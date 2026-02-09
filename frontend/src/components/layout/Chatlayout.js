import React from "react"
import ChatSidebar from "../chat/chatsidebar"
import { useTheme } from "../../context/ThemeContext"
export default function ChatLayout() {
    const { themeStyles } = useTheme()
    return (
        <div className="flex h-screen abc">
            <ChatSidebar />
            <main className={`flex-1 p-4 overflow-y-auto ${themeStyles.bg} ${themeStyles.text}`}>
               
            </main>
        </div>
    )
}
