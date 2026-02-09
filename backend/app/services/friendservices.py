from app.core.supabase import supabase
from fastapi import HTTPException
from app.schemas.friends import Friend

class Friendservices:
    @staticmethod
    async def acceptfriendreq(user_id: str, request_id: str):
        try:
           
            request = (
                supabase.table("friend_request")
                .select("*")
                .eq("id", request_id)
                .eq("receiver_id", user_id)
                .eq("status", "pending")
                .execute()
            ).data

            if not request:
                raise HTTPException(404, "Friend request not found")

        
            supabase.table("friend_request")\
                .update({"status": "accepted"})\
                .eq("id", request[0]["id"])\
                .execute()

        
            supabase.table("friends").insert({
                "user_id": user_id,
                "friend_id": request[0]["sender_id"]
            }).execute()

        
            supabase.table("friend_request")\
                .delete()\
                .eq("id", request[0]["id"])\
                .execute()

            return True

        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, "Failed to accept friend request")


            
    @staticmethod
    async def addfriend(user_id: str, friend_id: str):
        try:
            existing = (
                supabase
                .table("friends")
                .select("*")
                .or_(
                    f"and(user_id.eq.{user_id},friend_id.eq.{friend_id}),"
                    f"and(user_id.eq.{friend_id},friend_id.eq.{user_id})"
                )
                .execute()
            ).data

            if existing:
                raise HTTPException(400, "Friend request already exists")

            response = (
                supabase
                .table("friend_request")
                .insert({
                    "sender_id": user_id,
                    "receiver_id": friend_id,
                    "status": "pending"
                })
                .execute()
            )


            

            if not response.data:
                raise HTTPException(500, "Failed to send friend request")

            return True

        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, "Failed to send friend request")
    @staticmethod
    async def getfriends(user_id: str):
        try:
            rows = (
                supabase
                .table("friends")
                .select("user_id, friend_id, created_at")
                .or_(f"user_id.eq.{user_id},friend_id.eq.{user_id}")
                .execute()
            ).data

            if not rows:
                return []

            friend_ids = [
                r["friend_id"] if r["user_id"] == user_id else r["user_id"]
                for r in rows
            ]

            profiles = (
                supabase
                .table("profiles")
                .select("id, username")
                .in_("id", friend_ids)
                .execute()
            ).data
            print("PROFILES:", profiles)
            profile_map = {p["id"]: p["username"] for p in profiles}
            

            return [
                Friend(
                    user_id=user_id,
                    friend_id=fid,
                    name=profile_map.get(fid, "Unknown"),
                    created_at=next(
                        r["created_at"] for r in rows
                        if (r["user_id"] == user_id and r["friend_id"] == fid)
                        or (r["friend_id"] == user_id and r["user_id"] == fid)
                    )
                )
                for fid in friend_ids
            
            ]

        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, "Failed to fetch friends")
    @staticmethod
    async def unfriend(user_id: str, friend_id: str):
        try:
            response = (
                supabase
                .table("friends")
                .delete()
                .or_(
                    f"and(user_id.eq.{user_id},friend_id.eq.{friend_id}),"
                    f"and(user_id.eq.{friend_id},friend_id.eq.{user_id})"
                )
                .execute()
            )

            if not response.data:
                raise HTTPException(500, "Failed to unfriend user")

            return True

        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, "Failed to unfriend user")
    @staticmethod
    async def searchfriends(query: str):
        try:
            rows = (
                supabase
                .table("profiles")
                .select("id, username")
                .ilike("username", f"%{query}%")
                .execute()
            ).data

            return [
                Friend(
                    user_id=None,
                    friend_id=r["id"],
                    name=r["username"]
                )
                for r in rows
            ]

        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, "Failed to search friends")
    
    @staticmethod
    async def get_friend_requests(user_id: str):
        """Get all pending friend requests for the current user"""
        try:
            rows = (
                supabase
                .table("friend_request")
                .select("id, sender_id, receiver_id, status, created_at")
                .eq("receiver_id", user_id)
                .eq("status", "pending")
                .execute()
            ).data

            if not rows:
                return []

            # Get sender profiles
            sender_ids = [r["sender_id"] for r in rows]
            profiles = (
                supabase
                .table("profiles")
                .select("id, username")
                .in_("id", sender_ids)
                .execute()
            ).data

            profile_map = {p["id"]: p["username"] for p in profiles}

            return [
                Friend(
                    user_id=r["id"],
                    friend_id=r["sender_id"],
                    name=profile_map.get(r["sender_id"], "Unknown"),
                    status=r["status"],
                    created_at=r["created_at"]
                )
                for r in rows
            ]

        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, "Failed to fetch friend requests")

    @staticmethod
    async def reject_friend_request(user_id: str, request_id: str):
        """Reject a friend request"""
        try:
            # Find the pending request
            request = (
                supabase.table("friend_request")
                .select("*")
                .eq("id", request_id)
                .eq("receiver_id", user_id)
                .eq("status", "pending")
                .execute()
            ).data

            if not request:
                raise HTTPException(404, "Friend request not found")

            # Delete the request
            supabase.table("friend_request")\
                .delete()\
                .eq("id", request[0]["id"])\
                .execute()

            return True

        except Exception as e:
            print("ERROR:", e)
            raise HTTPException(500, "Failed to reject friend request")

