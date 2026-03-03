"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, signup, error, isLoading } = useAuth();
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"customer" | "driver">("customer");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError("");

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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl border border-black/10 p-8 dark:border-white/20">
        <h1 className="text-2xl font-bold">{isSignup ? "Sign Up" : "Login"}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {isSignup
            ? "Create an account to order food or deliver"
            : "Login to your QuickBite account"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 dark:border-white/20"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 dark:border-white/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 dark:border-white/20"
              required
            />
          </div>

          {isSignup && (
            <div>
              <label className="block text-sm font-medium">I am a:</label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="customer"
                    checked={role === "customer"}
                    onChange={(e) => setRole(e.target.value as "customer" | "driver")}
                  />
                  Customer (ordering food)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="driver"
                    checked={role === "driver"}
                    onChange={(e) => setRole(e.target.value as "customer" | "driver")}
                  />
                  Driver (delivering food)
                </label>
              </div>
            </div>
          )}

          {(localError || error) && (
            <div className="rounded-lg bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-400">
              {localError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-foreground px-4 py-2 font-semibold text-background disabled:opacity-60"
          >
            {isLoading ? "Loading..." : isSignup ? "Sign Up" : "Login"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {isSignup ? "Already have an account? Login" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
