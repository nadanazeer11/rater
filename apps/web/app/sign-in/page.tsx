import { SignInForm } from './sign-in-form';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Sign in to rater</h1>
          <p className="text-sm text-gray-600">
            Enter your email and we&apos;ll send you a magic link.
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
