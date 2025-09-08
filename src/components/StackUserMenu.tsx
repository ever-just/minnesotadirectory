import { useState } from 'react';
// import { UserButton, AccountSettings } from '@stackframe/stack';
import useStackAuth from '../hooks/useStackAuth';

export function StackUserMenu() {
  const { isConfigured, isAuthenticated, user, signOut } = useStackAuth();
  const [showSettings, setShowSettings] = useState(false);
  
  // If Stack Auth is not configured, don't render anything
  if (!isConfigured) {
    return null;
  }
  
  // If user is not authenticated, show login buttons
  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-3">
        <a
          href="/auth/sign-in"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Sign In
        </a>
        <a
          href="/auth/sign-up"
          className="border border-blue-500 text-blue-500 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Sign Up
        </a>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-700 hidden md:inline">
        Welcome, {user?.displayName || user?.primaryEmail}
      </span>
      
      <UserButton
        extraItems={[
          {
            text: "Account Settings",
            icon: <>⚙️</>,
            onClick: () => setShowSettings(true),
          },
          {
            text: "Sign Out",
            icon: <>🚪</>, 
            onClick: () => signOut(),
          }
        ]}
      />
      
      {/* Account Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Account Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <AccountSettings
              fullPage={false}
              extraItems={[
                {
                  title: "Saved Companies",
                  content: (
                    <div className="p-4 bg-gray-50 rounded">
                      <p>Your saved companies will appear here.</p>
                      <p className="text-sm text-gray-600 mt-2">
                        This feature will be integrated after the migration is complete.
                      </p>
                    </div>
                  ),
                  id: "saved-companies"
                }
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StackUserMenu;
