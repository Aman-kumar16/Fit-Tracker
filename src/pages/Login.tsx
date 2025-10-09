import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner"; // Assuming you use toast/sonner for errors

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false); // V2: Added loading state

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success is handled by the auth listener in App.tsx, usually better than window.location.
      // Since you use window.location, we'll keep it for now:
      window.location.href = "/"; 
    }  catch (err: unknown) { // ⬅️ V2 FIX: Use 'unknown' instead of 'any'

      // Type Guard: Safely check if the error is a standard Error object
      if (err instanceof Error) {
        // Firebase errors often have a 'code' property for specific handling
        let message = "Login failed. Please check your credentials.";
        
        // Use err.code if it exists, otherwise use err.message
        const errorCode = (err as any).code; // Temporarily cast to 'any' to access 'code' for checking, or define a specific FirebaseError interface if available
        
        if (errorCode === "auth/user-not-found" || errorCode === "auth/wrong-password") {
          message = "Invalid email or password.";
        } else if (errorCode) {
          message = `Login failed (${errorCode}).`;
        }
        
        toast.error(message);
        setError(message);

      } else {
        // Handle non-Error objects (e.g., if it's just a string or object)
        const genericMessage = "An unexpected login error occurred.";
        toast.error(genericMessage);
        setError(genericMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-black p-4">
      <form 
        onSubmit={handleLogin} 
        className="p-6 bg-gray-900 rounded-lg shadow-2xl w-full max-w-sm flex flex-col gap-4" // ⬅️ V2 FIX: flex-col and gap
      >
        <h2 className="text-2xl font-bold text-center mb-2">Welcome Back</h2>

        {/* Email Input */}
        <input
          className="p-3 border border-gray-700 rounded-lg w-full text-black bg-white focus:ring-blue-500 focus:border-blue-500" // ⬅️ Styling/Width Fix
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        {/* Password Input */}
        <input
          className="p-3 border border-gray-700 rounded-lg w-full text-black bg-white focus:ring-blue-500 focus:border-blue-500" // ⬅️ Styling/Width Fix
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        {/* Login Button */}
        <button
          type="submit"
          className="p-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg w-full transition-colors disabled:opacity-50" // ⬅️ Styling/Width Fix
          disabled={isLoading} // V2: Disable while loading
        >
          {isLoading ? "Logging In..." : "Login"}
        </button>
        
        {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
        
        {/* V2: Link to Sign Up (Assuming you have a Signup route) */}
        <p className="text-center text-sm text-gray-400 mt-4">
            Don't have an account? <a href="/signup" className="text-blue-500 hover:underline">Sign Up</a>
        </p>

      </form>
    </div>
  );
}