/**
 * AdminLogin — simple password gate for the /admin route.
 * On success, stores the password in sessionStorage and redirects to /admin.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ADMIN_TOKEN_KEY } from "@/lib/adminTrpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: () => {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, password);
      navigate("/admin");
    },
    onError: (err) => {
      setError(err.message ?? "Incorrect password. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password.trim()) {
      setError("Please enter the admin password.");
      return;
    }
    loginMutation.mutate({ password });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "oklch(0.98 0.008 75)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{ background: "oklch(0.35 0.09 155)" }}>
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "oklch(0.22 0.015 65)", fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Literal Memories
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.04 75)" }}>
            Admin Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-xl border shadow-md overflow-hidden"
          style={{ borderColor: "oklch(0.88 0.015 75)", background: "#fff" }}
        >
          <div className="px-6 py-5 border-b" style={{ borderColor: "oklch(0.94 0.012 75)", background: "oklch(0.35 0.09 155)" }}>
            <h2 className="text-base font-semibold text-white">Sign in to continue</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
              Enter your admin password to access the quotes dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: "oklch(0.55 0.04 75)" }}
              >
                Admin Password
              </label>
              <input
                type="password"
                autoFocus
                placeholder="Enter password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full px-3 py-2.5 text-sm rounded-lg border transition-colors"
                style={{
                  border: error ? "1.5px solid oklch(0.55 0.09 25)" : "1.5px solid oklch(0.88 0.015 75)",
                  background: "oklch(0.98 0.008 75)",
                  outline: "none",
                  color: "oklch(0.22 0.015 65)",
                }}
              />
              {error && (
                <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "oklch(0.55 0.09 25)" }}>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full font-semibold"
              style={{ background: "oklch(0.35 0.09 155)", color: "#fff" }}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "oklch(0.75 0.02 75)" }}>
          <a href="/" style={{ color: "oklch(0.35 0.09 155)" }}>← Back to pricing calculator</a>
        </p>
      </div>
    </div>
  );
}
