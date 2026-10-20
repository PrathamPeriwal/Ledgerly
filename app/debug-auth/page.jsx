"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function DebugAuth() {
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Clear any local storage or session storage
      localStorage.clear();
      sessionStorage.clear();
      // Force reload to clear any cached state
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const clearAllData = () => {
    // Clear all browser storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear cookies (if possible)
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });

    // Reload page
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Authentication Debug
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Current Auth State
            </h2>
            <div className="space-y-2 text-sm">
              <p><strong>Signed In:</strong> {isSignedIn ? "Yes" : "No"}</p>
              <p><strong>User ID:</strong> {user?.id || "None"}</p>
              <p><strong>Email:</strong> {user?.emailAddresses?.[0]?.emailAddress || "None"}</p>
              <p><strong>Name:</strong> {user?.fullName || "None"}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Debug Actions
            </h2>

            <Button
              onClick={handleSignOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={!isSignedIn}
            >
              Force Sign Out
            </Button>

            <Button
              onClick={clearAllData}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
            >
              Clear All Browser Data & Reload
            </Button>

            <Button
              onClick={() => window.location.href = "/"}
              variant="outline"
              className="w-full"
            >
              Go to Home Page
            </Button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            <p><strong>Note:</strong> This page is for debugging authentication issues.</p>
            <p>Use &quot;Force Sign Out&quot; if you&apos;re stuck in a logged-in state.</p>
            <p>Use &quot;Clear All Browser Data&quot; if the issue persists.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
