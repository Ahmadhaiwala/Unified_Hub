import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit=async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
  }
  const googleSignup=async()=>{
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  }
  const githubSignup=async()=>{
    await supabase.auth.signInWithOAuth({
      provider: "github",
    });
  }


  return (

    <div>
      <form onSubmit={submit}>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />

        <label htmlFor="password">Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <input type="submit" value="Sign Up" />
      </form>
      <input type="button" value="Sign Up with Google" onClick={googleSignup} />
      <input type="button" value="Sign Up with GitHub" onClick={githubSignup} />
    </div>
  );
}
