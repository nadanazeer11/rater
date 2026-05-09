import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-semibold">Sign-in failed</h1>
        <p className="text-sm text-gray-600">
          The link may have expired or already been used.
        </p>
        <Link href="/sign-in" className="inline-block text-sm text-gray-900 underline">
          Try again
        </Link>
      </div>
    </div>
  );
}
