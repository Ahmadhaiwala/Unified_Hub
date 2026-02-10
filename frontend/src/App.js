import { Routes, Route } from "react-router-dom"
import { useAuth } from "./context/AuthContext"
import Auth from "./pages/Auth"
import AppLayout from "./components/layout/Applayout"
import Home from "./pages/home"
import Profile from "./components/profile/Profile"
import Loading from "./components/Loading"
import { ThemeProvider } from "./context/ThemeContext"
import ProtectedRoute from "./context/ProtectedRoute"
import Chat from "./pages/Chat"
import ViewFriend from "./components/friends/ViewFriend"
import Userls from "./components/users/Userls"
import UserProfile from "./components/users/UserProfile"
import AssignmentsPage from "./pages/Assignments"
import AssignmentDetailPage from "./pages/AssignmentDetail"

export default function App() {
  const { loading } = useAuth()

  if (loading) return <ThemeProvider><Loading /></ThemeProvider>

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >


          <Route path="users" element={<Userls />} />
          <Route path="users/:userId" element={<UserProfile />} />
          <Route path="chat" element={<Chat />} />
          <Route path="profile" element={<Profile />} />
          <Route path="friends" element={<ViewFriend />} />
          <Route path="assignments/:groupId" element={<AssignmentsPage />} />
          <Route path="assignment-detail/:assignmentId" element={<AssignmentDetailPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
