"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Clock,
  Sparkles,
  LogOut,
  UserCheck,
} from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "warning";
    code?: string;
    text: string;
  } | null>(null);

  const [loggedInUser, setLoggedInUser] = useState<{
    id: string;
    email: string;
    name: string | null;
    role: string;
  } | null>(null);

  // Quick test account loader
  const fillTestAccount = (testEmail: string, testPass: string) => {
    setIsLogin(true);
    setEmail(testEmail);
    setPassword(testPass);
    setStatusMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin
      ? { email, password }
      : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        let type: "error" | "warning" = "error";
        if (res.status === 429) {
          type = "warning";
        }

        setStatusMessage({
          type,
          code: data.code || `HTTP_${res.status}`,
          text: data.message || "เกิดข้อผิดพลาดในการทำรายการ",
        });
        return;
      }

      // Success
      setStatusMessage({
        type: "success",
        code: data.code,
        text: data.message || "สำเร็จ",
      });

      if (data.user) {
        setLoggedInUser(data.user);
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setLoggedInUser(null);
      setStatusMessage({
        type: "success",
        text: "ออกจากระบบเรียบร้อยแล้ว",
      });
    } catch {
      setStatusMessage({
        type: "error",
        text: "เกิดข้อผิดพลาดในการออกจากระบบ",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden text-slate-100">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/30">
            N
          </div>
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            My Next App
          </span>
        </Link>
        <p className="text-sm text-slate-400">
          ระบบตรวจสอบสิทธิ์และเข้าสู่ระบบ Backend + SQLite ครบทุก Case
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* If already logged in, show user session card */}
        {loggedInUser ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <UserCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              เข้าสู่ระบบสำเร็จแล้ว!
            </h3>
            <p className="text-sm text-slate-400 mb-1">{loggedInUser.email}</p>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6">
              Role: {loggedInUser.role}
            </span>

            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-left text-xs space-y-1 mb-6 text-slate-300">
              <div>
                <span className="text-slate-500">User ID:</span> {loggedInUser.id}
              </div>
              <div>
                <span className="text-slate-500">ชื่อ:</span> {loggedInUser.name || "-"}
              </div>
              <div>
                <span className="text-slate-500">สถานะ:</span> มีสิทธิ์ใช้งานระบบ (JWT HttpOnly Active)
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ (Logout)</span>
            </button>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex bg-slate-950/60 p-1 rounded-xl mb-6 border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setStatusMessage(null);
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isLogin
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setStatusMessage(null);
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  !isLogin
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                สมัครสมาชิก
              </button>
            </div>

            {/* Status Notification Alert */}
            {statusMessage && (
              <div
                className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm animate-in fade-in duration-200 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-950/50 border border-emerald-800/60 text-emerald-200"
                    : statusMessage.type === "warning"
                    ? "bg-amber-950/50 border border-amber-800/60 text-amber-200"
                    : "bg-rose-950/50 border border-rose-800/60 text-rose-200"
                }`}
              >
                {statusMessage.type === "success" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {statusMessage.type === "warning" && (
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                {statusMessage.type === "error" && (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  {statusMessage.code && (
                    <div className="text-[11px] font-mono opacity-75 uppercase mb-0.5">
                      Code: {statusMessage.code}
                    </div>
                  )}
                  <div>{statusMessage.text}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field (Sign Up only) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ชื่อ - นามสกุล
                  </label>
                  <input
                    type="text"
                    placeholder="สมชาย ใจดี"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                  />
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  อีเมล
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    รหัสผ่าน
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              {isLogin && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <label
                    htmlFor="remember"
                    className="text-xs text-slate-400 cursor-pointer select-none"
                  >
                    จดจำการเข้าสู่ระบบ
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-medium rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? "เข้าสู่ระบบ (POST /login)" : "ยืนยันการสมัครสมาชิก"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Quick Test Cases Picker Box */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>กดคลิกเพื่อทดสอบเคสต่างๆ (Quick Test):</span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillTestAccount("user@example.com", "Password123!")}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-slate-300 cursor-pointer"
            >
              <span>1. บัญชีปกติ (200 OK)</span>
              <span className="font-mono text-[10px] text-emerald-400">user@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => fillTestAccount("user@example.com", "WrongPassword999")}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-slate-300 cursor-pointer"
            >
              <span>2. รหัสผ่านผิด (401 Unauthorized)</span>
              <span className="font-mono text-[10px] text-rose-400">Wrong Password</span>
            </button>

            <button
              type="button"
              onClick={() => fillTestAccount("suspended@example.com", "Password123!")}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-slate-300 cursor-pointer"
            >
              <span>3. บัญชีถูกระงับ (403 Forbidden)</span>
              <span className="font-mono text-[10px] text-amber-400">suspended@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => fillTestAccount("unverified@example.com", "Password123!")}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-slate-300 cursor-pointer"
            >
              <span>4. ยังไม่ยืนยันอีเมล (403 Forbidden)</span>
              <span className="font-mono text-[10px] text-amber-400">unverified@example.com</span>
            </button>

            <button
              type="button"
              onClick={() => fillTestAccount("notfound@example.com", "Password123!")}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-slate-300 cursor-pointer"
            >
              <span>5. ไม่มีบัญชีในระบบ (401 Unauthorized)</span>
              <span className="font-mono text-[10px] text-rose-400">notfound@example.com</span>
            </button>
          </div>
        </div>
      </div>

      {/* Back to Home Link */}
      <div className="mt-6 text-center text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-300 transition-colors">
          ← กลับสู่หน้าหลัก
        </Link>
      </div>
    </div>
  );
}
