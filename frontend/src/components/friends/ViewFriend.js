import { useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom"
import Swal from "sweetalert2"
import FriendRequest from "./ViewFriendRequest"
import { useTheme } from "../../context/ThemeContext"



export default function ViewFriend() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { themeStyles } = useTheme()

  const [friends, setFriends] = useState([])
  const [allFriends, setAllFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    if (!user?.access_token) return
    fetchFriends()
  }, [user])

  async function fetchFriends() {
    try {
      setLoading(true)

      const response = await fetch("http://localhost:8000/api/friends", {
        headers: { Authorization: `Bearer ${user.access_token}` },
      })

      if (!response.ok) throw new Error("Failed to fetch friends")

      const data = await response.json()

      const list = data.friends ?? data
      setFriends(list)
      setAllFriends(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }


  function handleSearch(value) {
    const filtered = allFriends.filter((friend) =>
      friend.name.toLowerCase().includes(value.toLowerCase())
    )
    setFriends(filtered)
  }


  async function handleUnfriend(friendId) {
    const result = await Swal.fire({
      title: "Unfriend?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
    })

    if (!result.isConfirmed) return

    try {
      setRemovingId(friendId)

      const response = await fetch(
        `http://localhost:8000/api/friends/${friendId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${user.access_token}` },
        }
      )

      if (!response.ok) throw new Error()

      // update both states
      setFriends((prev) => prev.filter((f) => f.friend_id !== friendId))
      setAllFriends((prev) => prev.filter((f) => f.friend_id !== friendId))

      Swal.fire("Removed!", "Friend has been removed.", "success")
    } catch {
      Swal.fire("Error", "Something went wrong", "error")
    } finally {
      setRemovingId(null)
    }
  }

  async function handleMessage(friendId) {
    try {
      // Create or get conversation with this friend
      const response = await fetch(
        `http://localhost:8000/api/chat/conversations/${friendId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${user.access_token}` },
        }
      )

      if (response.ok) {
        // Navigate to chat page
        navigate("/chat")
      } else {
        Swal.fire("Error", "Failed to start conversation", "error")
      }
    } catch (error) {
      console.error("Failed to start conversation:", error)
      Swal.fire("Error", "Something went wrong", "error")
    }
  }

  if (loading) return <p>Loading friends...</p>
  if (error) return <p className="text-red-500">{error}</p>

  return (
  <div className={`max-w-3xl mx-auto p-6 ${themeStyles.text}`}>
    <FriendRequest />

    {/* SEARCH */}
    <div className="mb-6">
      <input
        className={`w-full px-4 py-3 rounded-xl border shadow-sm ${themeStyles.input}`}
        placeholder="🔍 Search friends..."
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>

    <h2 className="text-3xl font-bold mb-6">Friends</h2>

    {friends.length === 0 ? (
      <div className={`text-center py-16 rounded-xl border ${themeStyles.cardBg} ${themeStyles.border}`}>
        <p className={themeStyles.accent}>You haven’t added any friends yet.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {friends.map((friend) => (
          <div
            key={friend.friend_id}
            className={`p-5 rounded-2xl shadow-md hover:shadow-xl transition flex items-center justify-between ${themeStyles.cardBg} ${themeStyles.border} border`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-lg">
                {friend.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="font-semibold text-lg">{friend.name}</p>
                <p className={`text-sm ${themeStyles.accent}`}>
                  Added on {new Date(friend.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleMessage(friend.friend_id)}
                className={`${themeStyles.button} px-4 py-2 rounded-lg text-sm font-medium`}
              >
                Message
              </button>

              <button
                disabled={removingId === friend.friend_id}
                onClick={() => handleUnfriend(friend.friend_id)}
                className={`${themeStyles.button} px-4 py-2 rounded-lg text-sm font-medium opacity-80 hover:opacity-100`}
              >
                {removingId === friend.friend_id ? "Removing..." : "Unfriend"}
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)
}
