import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/jwt";

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({
      success: true,
      code: "LOGOUT_SUCCESS",
      message: "ออกจากระบบสำเร็จ",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: "เกิดข้อผิดพลาดในการออกจากระบบ",
      },
      { status: 500 }
    );
  }
}
