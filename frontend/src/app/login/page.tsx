"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/auth";
import { SITE_LOGO_PATH } from "@/lib/branding";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      signInWithGoogle();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.14),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-12">
      <section className="w-full max-w-[500px] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.1)]">
        <div className="border-b border-gray-100 bg-[linear-gradient(120deg,#eff6ff_0%,#ffffff_60%)] px-8 py-7">
          <div className="flex justify-center items-center gap-3">
            <div className="relative h-16 w-16 rounded-full  overflow-hidden shadow-sm">
              <Image src={SITE_LOGO_PATH} alt="CrisisControl logo" fill className="object-cover" sizes="48px" priority />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">CrisisControl</p>
              <h1 className="text-2xl font-semibold text-gray-900">Secure Sign In</h1>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-8">

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.1 3.56-5.2 3.56-8.65z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.88-3a7.16 7.16 0 0 1-10.66-3.77H1.4v3.1A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.4 14.3a7.21 7.21 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
              <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.78l3.43-3.44A11.95 11.95 0 0 0 12 0 12 12 0 0 0 1.4 6.6l4 3.1A7.18 7.18 0 0 1 12 4.77z" />
            </svg>
            {loading ? "Connecting to Google..." : "Continue with Google"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/preview")}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Open dashboard preview
          </button>
        </div>
      </section>
    </main>
  );
}
