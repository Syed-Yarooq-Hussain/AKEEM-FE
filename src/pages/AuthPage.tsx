import { FormEvent, useState } from "react";
import { forgotPassword, login, saveAuth, signup } from "../services/auth";
import LanguageSwitch from "../components/LanguageSwitch";

type Mode = "login" | "signup" | "forgot";
type Props = { onSuccess: () => void };
const features = [
  ["⚡", "Multi-agent AI workflows, end to end"],
  ["🔒", "Enterprise-grade security & compliance"],
  ["📊", "Live business intelligence, always on"],
  ["🤝", "Integrates with your existing stack"],
];

export default function AuthPage({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const submitForgot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPassword(
        String(new FormData(event.currentTarget).get("email")),
      );
      setResetSent(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response =
        mode === "signup"
          ? await signup({
              firstName: String(form.get("firstName")),
              lastName: String(form.get("lastName")),
              email: String(form.get("email")),
              password: String(form.get("password")),
              organizationName: String(form.get("organizationName")),
              timezone: String(form.get("timezone")),
              currency: String(form.get("currency")),
            })
          : await login({
              email: String(form.get("email")),
              password: String(form.get("password")),
            });
      saveAuth(response);
      onSuccess();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="relative min-h-screen bg-white lg:grid lg:grid-cols-[44%_56%]">
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitch />
      </div>
      <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-b from-[#080b13] to-[#0d1627] px-10 py-11 text-white lg:flex lg:flex-col xl:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9a84c]/50 bg-[#c9a84c]/[.08] font-serif text-[26px] text-[#c9a84c]">
            A
          </div>
          <div>
            <p className="font-serif text-base font-bold leading-none tracking-[.22em]">
              AKEEM
            </p>
            <p className="mt-1 text-[9px] font-medium tracking-[.08em] text-[#c9a84c]">
              ENTERPRISE INTELLIGENCE & AUTOMATION
            </p>
          </div>
        </div>
        <div className="mt-14 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#c9a84c]/30" />
          <span className="text-[10px] text-[#c9a84c]">◆</span>
          <span className="h-px flex-1 bg-[#c9a84c]/30" />
        </div>
        <div className="mt-9 max-w-xl">
          <h1 className="text-[29px] font-bold leading-[1.2] tracking-tight xl:text-[32px]">
            Intelligent automation
            <br />
            for the modern enterprise.
          </h1>
          <p className="mt-5 text-sm leading-6 text-[#c9a84c] xl:text-[15px]">
            AI agents across Finance, Sales, Legal, Operations, and Marketing —
            all working in concert, all under your command.
          </p>
          <ul className="mt-9 space-y-3.5">
            {features.map(([icon, label]) => (
              <li
                key={label}
                className="flex items-center gap-3 text-sm font-semibold"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/10 text-sm">
                  {icon}
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <blockquote className="mt-auto rounded-2xl border border-[#c9a84c]/25 bg-white/[.04] p-5 text-sm italic leading-6 shadow-lg">
          <p>
            “AKEEM cut our cross-department reporting time by 80% and gave our
            executive team real-time intelligence they never had before.”
          </p>
          <footer className="mt-4 flex items-center gap-3 not-italic">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c9a84c]/25 text-xs font-bold text-[#c9a84c]">
              SC
            </span>
            <span>
              <b className="block text-xs">Sarah Chen</b>
              <small className="text-[#c9a84c]">
                CEO, Meridian Technologies
              </small>
            </span>
          </footer>
        </blockquote>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[360px]">
          {mode === "forgot" ? (
            <>
              <h2 className="text-2xl font-bold text-slate-950">
                Reset your password
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                We’ll send a reset link to your work email.
              </p>
              {resetSent ? (
                <p
                  role="status"
                  className="mt-8 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                >
                  If this email exists, a reset link has been sent.
                </p>
              ) : (
                <form onSubmit={submitForgot} className="mt-8 space-y-5">
                  <Field
                    name="email"
                    label="Work Email"
                    type="email"
                    placeholder="you@company.com"
                  />
                  {error && (
                    <p
                      role="alert"
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
                    >
                      {error}
                    </p>
                  )}
                  <button
                    disabled={loading}
                    className="h-10 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {loading ? "Please wait…" : "Send reset link"}
                  </button>
                </form>
              )}
              <button
                onClick={() => {
                  setMode("login");
                  setResetSent(false);
                  setError("");
                }}
                className="mt-6 w-full text-sm font-semibold text-blue-600"
              >
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <h2 className="text-[25px] font-bold leading-tight text-slate-950">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "login"
                  ? "Sign in to your organization account"
                  : "Start running your business with AI"}
              </p>
              <p className="mb-6 mt-8 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Use your organization email and password.
              </p>
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        name="firstName"
                        label="First Name"
                        placeholder="Ali"
                      />
                      <Field
                        name="lastName"
                        label="Last Name"
                        placeholder="Khan"
                      />
                    </div>
                    <Field
                      name="organizationName"
                      label="Organization Name"
                      placeholder="Ali Technologies"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        name="timezone"
                        label="Timezone"
                        defaultValue="Asia/Karachi"
                      >
                        <option>Asia/Karachi</option>
                        <option>Europe/Berlin</option>
                        <option>UTC</option>
                        <option>America/New_York</option>
                        <option>Asia/Dubai</option>
                      </Select>
                      <Select
                        name="currency"
                        label="Currency"
                        defaultValue="PKR"
                      >
                        <option>PKR</option>
                        <option>USD</option>
                        <option>EUR</option>
                        <option>GBP</option>
                        <option>AED</option>
                      </Select>
                    </div>
                  </>
                )}
                <Field
                  name="email"
                  label="Work Email"
                  type="email"
                  placeholder="you@company.com"
                />
                <Field
                  name="password"
                  label="Password"
                  type="password"
                  minLength={8}
                  placeholder="Enter your password"
                />
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
                  >
                    {error}
                  </p>
                )}
                <div className="flex items-center justify-end text-[11px]">
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <button
                  disabled={loading}
                  className="h-10 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[.99] disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {loading
                    ? "Please wait…"
                    : mode === "login"
                      ? "Sign In"
                      : "Create account"}
                </button>
              </form>
              <p className="mt-6 text-center text-xs text-slate-500">
                {mode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  {mode === "login" ? "Create account" : "Sign in"}
                </button>
              </p>
              <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                Secure organization access
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
      </span>
      <input
        required
        {...props}
        className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none"
      />
    </label>
  );
}
function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
      </span>
      <select
        required
        {...props}
        className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}
