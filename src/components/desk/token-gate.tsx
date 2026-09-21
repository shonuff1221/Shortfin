"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND } from "@/lib/brand";
import { fetcher, setToken, clearToken } from "@/lib/api";

/**
 * Desk gate: token entered once, stored client-side (localStorage), verified
 * against the brain API before the desk renders.
 */
export function TokenGate({ onVerified }: { onVerified: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = value.trim();
    if (!token) return;
    setChecking(true);
    try {
      setToken(token);
      await fetcher("/api/summary"); // 401 -> "unauthorized"
      onVerified();
    } catch (err) {
      clearToken();
      setError(
        err instanceof Error && err.message === "unauthorized"
          ? "Token rejected — check it and try again."
          : "Could not reach the brain API — is apps/api running on :8890?",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-border bg-card p-8">
        <span className="grid size-10 place-items-center rounded-lg border border-brand/40 bg-brand-soft">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <h1 className="mt-4 text-xl font-semibold">{BRAND.name} desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your access token to view the live trading desk. It stays on this device.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label htmlFor="desk-token" className="sr-only">
            Access token
          </label>
          <Input
            id="desk-token"
            type="password"
            autoComplete="off"
            placeholder="Access token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "token-error" : undefined}
          />
          {error && (
            <p id="token-error" role="alert" className="text-sm text-down">
              {error}
            </p>
          )}
          <Button type="submit" disabled={checking || !value.trim()} className="w-full">
            {checking ? "Verifying…" : "Enter desk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
