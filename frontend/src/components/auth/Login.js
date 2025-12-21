import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loginWithGoogle = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
  });
};
const loginWithGithub = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "github",
  });
}

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
 

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    console.log("Logged in user:", data.user);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />

        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>

      <hr />

<button onClick={loginWithGoogle}>
  Continue with Google
</button>

<button onClick={loginWithGithub}>
  Continue with GitHub
</button>

    </div>
  );
}
