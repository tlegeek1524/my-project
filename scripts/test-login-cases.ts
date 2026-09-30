import { prisma } from "../src/lib/prisma";
import { verifyPassword, hashPassword } from "../src/lib/auth/password";
import { signAuthToken, verifyAuthToken } from "../src/lib/auth/jwt";
import { checkRateLimit, resetRateLimit } from "../src/lib/auth/rate-limiter";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
});

interface TestCaseResult {
  id: string;
  name: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  message: string;
}

const results: TestCaseResult[] = [];

async function simulateLogin(
  body: Record<string, unknown>,
  clientIp = "127.0.0.1"
): Promise<{ status: number; message: string; data?: unknown }> {
  // 1. Rate Limit
  const emailKey =
    typeof body === "object" && body !== null && "email" in body
      ? String(body.email).toLowerCase()
      : "";
  const rateLimitKey = `test:${clientIp}:${emailKey}`;
  const rateCheck = checkRateLimit(rateLimitKey, 5, 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      status: 429,
      message: `RATE_LIMIT_EXCEEDED (retry after ${rateCheck.retryAfterSeconds}s)`,
    };
  }

  // 2. Schema Validation
  const parseResult = loginSchema.safeParse(body);
  if (!parseResult.success) {
    return {
      status: 400,
      message: parseResult.error.issues[0].message,
    };
  }

  const { email, password } = parseResult.data;

  // 3. User lookup
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return { status: 401, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  // 4. Account Status
  if (user.isSuspended) {
    return {
      status: 403,
      message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
    };
  }

  if (!user.isVerified) {
    return {
      status: 403,
      message: "กรุณายืนยันที่อยู่อีเมลของคุณก่อนเข้าสู่ระบบ",
    };
  }

  // 5. Password Verification
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return { status: 401, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  // 6. Success
  resetRateLimit(rateLimitKey);
  const token = await signAuthToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    status: 200,
    message: "เข้าสู่ระบบสำเร็จ",
    data: { user, token },
  };
}

async function runAllTests() {
  console.log("=== RUNNING BACKEND LOGIN TEST CASES SUITE ===\n");

  // Case 1: Empty Email & Password (VAL-01)
  {
    const res = await simulateLogin({});
    results.push({
      id: "VAL-01",
      name: "Empty Payload Validation",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: res.status === 400,
      message: res.message,
    });
  }

  // Case 2: Invalid Email Format (VAL-02)
  {
    const res = await simulateLogin({
      email: "invalid-email-format",
      password: "Password123!",
    });
    results.push({
      id: "VAL-02",
      name: "Invalid Email Format Validation",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: res.status === 400,
      message: res.message,
    });
  }

  // Case 3: Short Password (VAL-03)
  {
    const res = await simulateLogin({
      email: "user@example.com",
      password: "123",
    });
    results.push({
      id: "VAL-03",
      name: "Short Password (< 6 chars) Validation",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: res.status === 400,
      message: res.message,
    });
  }

  // Case 4: Non-existent User (AUTH-01)
  {
    const res = await simulateLogin({
      email: "notfound@example.com",
      password: "Password123!",
    });
    results.push({
      id: "AUTH-01",
      name: "Non-existent Account",
      expectedStatus: 401,
      actualStatus: res.status,
      passed: res.status === 401,
      message: res.message,
    });
  }

  // Case 5: Wrong Password (AUTH-02)
  {
    const res = await simulateLogin({
      email: "user@example.com",
      password: "WrongPassword999",
    });
    results.push({
      id: "AUTH-02",
      name: "Incorrect Password",
      expectedStatus: 401,
      actualStatus: res.status,
      passed: res.status === 401,
      message: res.message,
    });
  }

  // Case 6: Suspended User Account (ACC-01)
  {
    const res = await simulateLogin({
      email: "suspended@example.com",
      password: "Password123!",
    });
    results.push({
      id: "ACC-01",
      name: "Suspended Account Status",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      message: res.message,
    });
  }

  // Case 7: Unverified Email Account (ACC-02)
  {
    const res = await simulateLogin({
      email: "unverified@example.com",
      password: "Password123!",
    });
    results.push({
      id: "ACC-02",
      name: "Unverified Account Status",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      message: res.message,
    });
  }

  // Case 8: Success Login (AUTH-03)
  let sessionToken = "";
  {
    const res = await simulateLogin({
      email: "user@example.com",
      password: "Password123!",
    });
    sessionToken = (res.data as { token: string })?.token || "";
    results.push({
      id: "AUTH-03",
      name: "Valid Credentials Login Success",
      expectedStatus: 200,
      actualStatus: res.status,
      passed: res.status === 200 && Boolean(sessionToken),
      message: res.message,
    });
  }

  // Case 9: JWT Verification (SESS-01)
  {
    const decoded = await verifyAuthToken(sessionToken);
    const valid = decoded?.email === "user@example.com";
    results.push({
      id: "SESS-01",
      name: "JWT Token Signature & Payload Verification",
      expectedStatus: 200,
      actualStatus: valid ? 200 : 401,
      passed: valid,
      message: valid ? `Decoded User: ${decoded?.email}` : "Token Invalid",
    });
  }

  // Case 10: Rate Limiter Trigger (SEC-01)
  {
    const testIp = "192.168.1.100";
    let hitLimit = false;
    for (let i = 0; i < 6; i++) {
      const res = await simulateLogin(
        { email: "brute@example.com", password: "Password123!" },
        testIp
      );
      if (res.status === 429) {
        hitLimit = true;
      }
    }
    results.push({
      id: "SEC-01",
      name: "Rate Limiter (Brute-force 429 Response)",
      expectedStatus: 429,
      actualStatus: hitLimit ? 429 : 200,
      passed: hitLimit,
      message: hitLimit ? "Successfully throttled at 5+ attempts" : "Not throttled",
    });
  }

  // Print Summary Table
  console.log("----------------------------------------------------------------------------------");
  console.log(
    "Case ID".padEnd(10) +
      "Test Name".padEnd(42) +
      "Expected".padEnd(10) +
      "Actual".padEnd(10) +
      "Status"
  );
  console.log("----------------------------------------------------------------------------------");

  let allPassed = true;
  for (const r of results) {
    if (!r.passed) allPassed = false;
    const statusText = r.passed ? "✔ PASS" : "✖ FAIL";
    console.log(
      r.id.padEnd(10) +
        r.name.padEnd(42) +
        String(r.expectedStatus).padEnd(10) +
        String(r.actualStatus).padEnd(10) +
        statusText
    );
  }
  console.log("----------------------------------------------------------------------------------");
  console.log(`\nFinal Result: ${allPassed ? "ALL 10 CASES PASSED SUCCESSFULLY!" : "SOME CASES FAILED"}\n`);

  await prisma.$disconnect();
}

runAllTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
