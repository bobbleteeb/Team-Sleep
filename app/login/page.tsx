"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl"
        >
          ✕
        </button>
        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-4xl">📬</p>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Check your inbox</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              If <span className="font-semibold">{email}</span> has an account, you&apos;ll receive a password reset link shortly.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-3 text-sm font-bold"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-1">Reset Password</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-300/50 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/30 transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-lg bg-zinc-900 hover:bg-black py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                {sending ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, signup, error, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"customer" | "driver">("customer");
  const [localError, setLocalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; name?: boolean }>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const emailValid = useMemo(() => /^\S+@\S+\.\S+$/.test(email), [email]);
  const passwordValid = useMemo(() => password.length >= 8, [password]);
  const nameValid = useMemo(() => name.trim().length > 0, [name]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!emailValid) {
      setLocalError("Please enter a valid email");
      return;
    }
    if (isSignup && !nameValid) {
      setLocalError("Name is required");
      return;
    }
    if (isSignup && !passwordValid) {
      setLocalError("Must be at least 8 characters");
      return;
    }

    try {
      if (isSignup) {
        await signup(email, password, name, role);
      } else {
        await login(email, password);
      }
      router.push("/");
    } catch (err) {
      setLocalError(error || (err instanceof Error ? err.message : "Error"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
      <button
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        className="absolute right-4 top-4 z-20 h-10 w-10 rounded-full border-2 border-zinc-300 bg-white text-lg dark:border-zinc-700 dark:bg-zinc-900"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
      <div className="relative w-full max-w-md mx-4">
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-300/30 to-zinc-400/20 blur-3xl rounded-full opacity-60 dark:from-zinc-700/20 dark:to-zinc-800/20" />
        
        <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">QuickBite</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
              {isSignup
                ? "Join thousands of food lovers"
                : "Fast, fresh, delivered"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  className="w-full rounded-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-300/50 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/30 transition-all"
                  required
                />
                {touched.name && !nameValid && (
                  <p className="mt-1 text-xs font-semibold text-red-500">Name is required</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                className="w-full rounded-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm font-medium outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-300/50 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/30 transition-all"
                required
              />
              {touched.email && !emailValid && (
                <p className="mt-1 text-xs font-semibold text-red-500">Please enter a valid email</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  className="w-full rounded-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 pr-11 text-sm font-medium outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-300/50 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/30 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {isSignup && (
                <p className={`mt-1 text-xs font-semibold ${passwordValid ? "text-green-600" : "text-zinc-500"}`}>
                  {passwordValid ? "✓ Strong enough" : "Must be at least 8 characters"}
                </p>
              )}
              {!isSignup && (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="mt-1 inline-block text-xs text-zinc-500 hover:underline text-left"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {isSignup && (
              <div className="pt-2">
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">I am a:</label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg border-2 border-zinc-300 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all">
                    <div>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">🛒 Customer</p>
                      <p className="text-xs text-zinc-500">Order food</p>
                    </div>
                    <input
                      type="radio"
                      value="customer"
                      checked={role === "customer"}
                      onChange={(e) => setRole(e.target.value as "customer" | "driver")}
                      className="w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg border-2 border-zinc-300 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all">
                    <div>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">🚗 Driver</p>
                      <p className="text-xs text-zinc-500">Deliver food</p>
                    </div>
                    <input
                      type="radio"
                      value="driver"
                      checked={role === "driver"}
                      onChange={(e) => setRole(e.target.value as "customer" | "driver")}
                      className="w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}

            {(error || localError) && (
              <div className="rounded-lg border-2 border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-4 py-3">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {error || localError}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-zinc-900 hover:bg-black py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 mt-6 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {isLoading ? "Loading..." : isSignup ? "Create Account" : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              {isSignup ? "Already have an account?" : "Don't have an account?"}
            </p>
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:opacity-70 transition-opacity"
            >
              {isSignup ? "Login" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
