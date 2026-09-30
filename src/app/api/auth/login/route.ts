import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signAuthToken, setAuthCookie } from "@/lib/auth/jwt";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limiter";

// Zod validation schema for login credentials
const loginSchema = z.object({
  email: z.string().min(1, "กรุณาระบุอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting Check (Case SEC-01)
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_JSON",
          message: "ข้อมูลที่ส่งมาไม่ถูกต้อง (Invalid JSON payload)",
        },
        { status: 400 }
      );
    }

    // Rate limit identifier: IP + entered email (if available)
    const emailKey =
      typeof body === "object" && body !== null && "email" in body
        ? String((body as Record<string, unknown>).email).toLowerCase()
        : "";
    const rateLimitKey = `login:${clientIp}:${emailKey}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 60 * 1000);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: "RATE_LIMIT_EXCEEDED",
          message: `พยายามเข้าสู่ระบบถี่เกินไป กรุณารอ ${rateCheck.retryAfterSeconds} วินาทีก่อนลองใหม่`,
          retryAfter: rateCheck.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSeconds),
          },
        }
      );
    }

    // 2. Input Validation via Zod (Cases VAL-01, VAL-02, VAL-03)
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: formattedErrors[0]?.message || "ข้อมูลที่ส่งมาไม่ถูกต้อง",
          errors: formattedErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // 3. Find User in SQLite Database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Case AUTH-01: User not found
    // (Note: use generic security message to prevent user enumeration)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
        { status: 401 }
      );
    }

    // 4. Account Status Checks
    // Case ACC-01: Suspended account
    if (user.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
        },
        { status: 403 }
      );
    }

    // Case ACC-02: Unverified account
    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_NOT_VERIFIED",
          message: "กรุณายืนยันที่อยู่อีเมลของคุณก่อนเข้าสู่ระบบ",
        },
        { status: 403 }
      );
    }

    // 5. Password Verification (Case AUTH-02: Incorrect password)
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
        { status: 401 }
      );
    }

    // 6. Login Successful (Case AUTH-03)
    // Reset rate limit counter on success
    resetRateLimit(rateLimitKey);

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create JWT token and set HttpOnly cookie
    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await setAuthCookie(token);

    // Return safe user profile (excluding passwordHash)
    return NextResponse.json(
      {
        success: true,
        code: "LOGIN_SUCCESS",
        message: "เข้าสู่ระบบสำเร็จ",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLoginAt: new Date(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Case SYS-01: Unexpected server error
    console.error("Unhandled login error:", error);
    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง",
      },
      { status: 500 }
    );
  }
}
