import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/"; // redirects to login automatically
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="p-2 mt-4 bg-red-600 hover:bg-red-700 rounded text-white"
    >
      Logout
    </button>
  );
}
