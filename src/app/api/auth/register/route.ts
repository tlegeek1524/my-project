import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signAuthToken, setAuthCookie } from "@/lib/auth/jwt";

const registerSchema = z.object({
  email: z.string().min(1, "กรุณาระบุอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  name: z.string().min(1, "กรุณาระบุชื่อ").optional(),
  password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_JSON",
          message: "ข้อมูลที่ส่งมาไม่ถูกต้อง (Invalid JSON)",
        },
        { status: 400 }
      );
    }

    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: formattedErrors[0]?.message || "ข้อมูลไม่ถูกต้อง",
          errors: formattedErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, name } = parseResult.data;

    // Check duplicate email (Case: Duplicate user -> 409 Conflict)
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_ALREADY_EXISTS",
          message: "อีเมลนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบ",
        },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        passwordHash,
        role: "USER",
        isVerified: true,
        isSuspended: false,
        lastLoginAt: new Date(),
      },
    });

    // Generate JWT and set cookie
    const token = await signAuthToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    await setAuthCookie(token);

    return NextResponse.json(
      {
        success: true,
        code: "REGISTER_SUCCESS",
        message: "สมัครสมาชิกและเข้าสู่ระบบสำเร็จ",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unhandled register error:", error);
    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
      },
      { status: 500 }
    );
  }
}
