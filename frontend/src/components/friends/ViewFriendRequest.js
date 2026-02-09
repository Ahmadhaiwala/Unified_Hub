import { useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

export default function FriendRequest() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [openId, setOpenId] = useState(null)
  const { themeStyles } = useTheme()

  useEffect(() => {
    if (!user?.access_token) return
    getFriendRequests()
  }, [user])

  async function getFriendRequests() {
    const response = await fetch("http://localhost:8000/api/friendrequest", {
      headers: { Authorization: `Bearer ${user.access_token}` },
    })

    const data = await response.json()
    if (response.ok) setRequests(data.requests ?? data ?? [])

  }

  async function acceptRequest(id) {
    const res = await fetch(
      `http://localhost:8000/api/friendrequest/accept/${id}`,
      { method: "POST", headers: { Authorization: `Bearer ${user.access_token}` } }
    )
    if (res.ok) getFriendRequests()
  }

  async function rejectRequest(id) {
    await fetch(
      `http://localhost:8000/api/friendrequest/reject/${id}`,
      { method: "POST", headers: { Authorization: `Bearer ${user.access_token}` } }
    )
    getFriendRequests()
  }

  
  return (
  <div className="mb-8">
    <div className={`rounded-2xl shadow-md p-5 ${themeStyles.cardBg} ${themeStyles.border} border`}>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        📥 Friend Requests
      </h2>

      {requests.length === 0 ? (
        <div className={`text-center py-10 rounded-xl border ${themeStyles.border}`}>
          <p className={themeStyles.accent}>No pending requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.user_id}
              className={`rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition border ${themeStyles.border}`}
            >
              <div
                className={`flex items-center justify-between p-4 cursor-pointer ${themeStyles.secondbar}`}
                onClick={() => setOpenId(openId === req.user_id ? null : req.user_id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-semibold">
                    {req.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold">{req.name}</span>
                </div>

                <span className={`text-sm ${themeStyles.accent}`}>
                  {openId === req.user_id ? "Hide" : "View"}
                </span>
              </div>

              {openId === req.user_id && (
                <div className={`p-4 border-t ${themeStyles.border}`}>
                  <p className={`text-sm mb-4 ${themeStyles.accent}`}>
                    Sent on {new Date(req.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => acceptRequest(req.user_id)}
                      className={`${themeStyles.button} flex-1 py-2 rounded-lg font-medium`}
                    >
                      Accept
                    </button>

                    <button
                      onClick={() => rejectRequest(req.user_id)}
                      className={`${themeStyles.button} flex-1 py-2 rounded-lg font-medium opacity-80 hover:opacity-100`}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)

}
