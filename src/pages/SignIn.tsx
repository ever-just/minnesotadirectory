// import { SignIn } from '@stackframe/stack';
import { isStackAuthConfigured } from '../config/stackAuth';

export function SignInPage() {
  if (!isStackAuthConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800">
              Stack Auth is not configured yet. Please complete the setup process.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <SignIn />
      </div>
    </div>
  );
}

export default SignInPage;
