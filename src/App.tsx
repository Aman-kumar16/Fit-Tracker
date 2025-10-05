import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

import Dashboard from "./pages/Dashboard";
import DebugFirebase from "./pages/DebugFirebase";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  // While checking login state
  if (user === undefined) return <div className="text-center mt-10">Loading...</div>;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {user ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/debug" element={<DebugFirebase />} />
                <Route path="*" element={<NotFound />} />
              </>
            ) : (
              <Route path="*" element={<Login />} />
            )}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
