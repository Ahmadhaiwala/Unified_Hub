import { useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom"
import Swal from "sweetalert2"
import FriendRequest from "./ViewFriendRequest"

export default function ViewFriend() {
  const { user } = useAuth()
  const navigate = useNavigate()

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
    <div>
      {/* 📥 FRIEND REQUEST INBOX */}
      <FriendRequest />

      {/* 🔍 SEARCH */}
      <input
        className="border p-2 mb-4 w-full"
        placeholder="Search friends..."
        onChange={(e) => handleSearch(e.target.value)}
      />

      <h2 className="text-2xl font-bold mb-4">Friends List</h2>

      {friends.length === 0 ? (
        <p>No friends yet</p>
      ) : (
        <ul>
          {friends.map((friend) => (
            <li
              key={friend.friend_id}
              className="mb-4 p-3 border rounded flex items-center gap-6"
            >
              <span>
                <b>Name:</b> {friend.name}
              </span>

              <span>
                <b>Added On:</b>{" "}
                {new Date(friend.created_at).toLocaleDateString()}
              </span>

              <button
                onClick={() => handleMessage(friend.friend_id)}
                className="px-3 py-1 text-sm rounded text-white bg-blue-500 hover:bg-blue-600"
              >
                Message
              </button>

              <button
                disabled={removingId === friend.friend_id}
                onClick={() => handleUnfriend(friend.friend_id)}
                className={`px-3 py-1 text-sm rounded text-white ${removingId === friend.friend_id
                  ? "bg-gray-400"
                  : "bg-red-500 hover:bg-red-600"
                  }`}
              >
                {removingId === friend.friend_id ? "Removing..." : "Unfriend"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
