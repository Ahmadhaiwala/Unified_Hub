import { useAuth } from "../../context/AuthContext"
import ChatSidebar from "../chat/chatsidebar"
import { Outlet } from "react-router-dom"
export default function ChatLayout() {
    return (
        <div className="flex left-5">
            <ChatSidebar />
            <main>
                <Outlet />
            </main>
        </div>
    )
}