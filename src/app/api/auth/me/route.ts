import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message: "ยังไม่ได้เข้าสู่ระบบหรือ Session หมดอายุ",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        isSuspended: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user || user.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          code: "USER_INVALID",
          message: "ไม่พบบัญชีผู้ใช้หรือบัญชีถูกระงับ",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: "เกิดข้อผิดพลาดในการตรวจสอบ Session",
      },
      { status: 500 }
    );
  }
}
