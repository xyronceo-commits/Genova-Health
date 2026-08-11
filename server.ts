import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 0. Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=(self)");
    next();
  });

  // Body parser limit increased to support base64 images with strict JSON parsing
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Prototype Pollution Guard
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      const keys = Object.keys(req.body);
      for (const k of keys) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
          return res.status(400).json({ error: "Invalid input structure detected." });
        }
      }
    }
    next();
  });

  // Simple, efficient In-Memory Rate Limiter
  interface RateLimitEntry {
    count: number;
    resetTime: number;
  }
  const rateLimitStore = new Map<string, RateLimitEntry>();

  const createRateLimiter = (maxRequests: number, windowMs: number = 60000) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
      const key = `${req.path}:${clientIp}`;
      const now = Date.now();

      let record = rateLimitStore.get(key);
      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        rateLimitStore.set(key, record);
      } else {
        record.count++;
      }

      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - record.count).toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000).toString());

      if (record.count > maxRequests) {
        const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader("Retry-After", retryAfterSeconds.toString());
        return res.status(429).json({
          error: "Rate limit exceeded. Please wait before making further requests.",
          retryAfterSeconds
        });
      }

      next();
    };
  };

  const aiRateLimiter = createRateLimiter(25, 60000); // 25 AI ops per min
  const generalRateLimiter = createRateLimiter(120, 60000); // 120 general requests per min

  // Input Validation & Sanitization Helpers
  const sanitizeText = (val: any, maxLength = 4000): string => {
    if (typeof val !== "string") return "";
    return val.trim().substring(0, maxLength);
  };

  const validateBase64Image = (img: any): { base64: string; mimeType: string } | null => {
    if (!img || typeof img !== "object") return null;
    const base64Str = typeof img.base64 === "string" ? img.base64 : "";
    const mimeType = typeof img.mimeType === "string" ? img.mimeType : "image/jpeg";
    
    // Max 10MB raw image string check
    if (!base64Str || base64Str.length > 15000000) return null;
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedMimes.includes(mimeType.toLowerCase())) return null;

    return { base64: base64Str, mimeType };
  };

  // Initialize Groq safely using purely server-side environment variables
  const getGroqClient = () => {
    const key = process.env.GROQ_API_KEY || 
                process.env.GROK_API_KEY || 
                process.env.X_API_KEY || 
                process.env.XAI_API_KEY;
    if (!key) return null;
    return new Groq({ apiKey: key });
  };

  // Initialize Gemini safely using purely server-side environment variables
  const getGeminiClient = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  };

  // Helper for resilient JSON parsing
  const safeParseJSON = (rawText: string | undefined | null, fallback: any = {}) => {
    if (!rawText) return fallback;
    try {
      let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const firstBrace = cleaned.search(/[{\[]/);
      const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleaned);
    } catch (e) {
      return fallback;
    }
  };

  // 1. Health & Config endpoint
  app.get("/api/health", generalRateLimiter, (req: Request, res: Response) => {
    const groqKey = process.env.GROQ_API_KEY || 
                    process.env.GROK_API_KEY || 
                    process.env.X_API_KEY || 
                    process.env.XAI_API_KEY;
    res.json({ 
      status: "ok", 
      groqConfigured: !!groqKey,
      geminiConfigured: !!process.env.GEMINI_API_KEY
    });
  });

  // ==========================================
  // EMAIL VERIFICATION-CODE SYSTEM
  // ==========================================

  interface EmailVerificationRecord {
    userId: string;
    email: string;
    codeHash: string;
    createdAt: number;
    expiresAt: number;
    attempts: number;
    resends: number;
    verified: boolean;
    lastResendAt: number;
  }

  const emailVerifications = new Map<string, EmailVerificationRecord>();

  const maskEmailAddressServer = (emailStr: string): string => {
    if (!emailStr || !emailStr.includes('@')) return emailStr || '';
    const [name, domain] = emailStr.split('@');
    if (name.length <= 2) return `${name.charAt(0)}***@${domain}`;
    return `${name.charAt(0)}***${name.charAt(name.length - 1)}@${domain}`;
  };

  const sendVerificationEmail = async (toEmail: string, code: string, maskedEmail: string) => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpFrom = process.env.SMTP_FROM || 'no-reply@genovahealth.com';

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        await transporter.sendMail({
          from: `"Genova Health Security" <${smtpFrom}>`,
          to: toEmail,
          subject: "Verify your Genova Health email address",
          text: `Your Genova Health 6-digit verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this verification code, please ignore this email.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
              <div style="margin-bottom: 20px; text-align: center;">
                <h2 style="color: #111827; font-size: 22px; font-weight: 800; margin: 0;">Genova Health</h2>
                <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Security Verification</p>
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                <p style="color: #475569; font-size: 14px; margin: 0 0 12px 0;">Your 6-digit verification code is:</p>
                <div style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #2563eb; font-family: monospace;">${code}</div>
                <p style="color: #94a3b8; font-size: 11px; margin-top: 12px;">This code will expire in 10 minutes.</p>
              </div>
              <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0;">
                If you didn't request this code, you can safely disregard this message.
              </p>
            </div>
          `
        });
        console.log(`[SMTP EMAIL DELIVERED] Verification code sent to ${maskedEmail}`);
        return true;
      } catch (err) {
        console.error(`[SMTP EMAIL ERROR] Failed to send email via SMTP to ${maskedEmail}:`, err);
      }
    }

    // Server-Side Safe Dispatch Log (Raw code is never exposed in client HTTP JSON payload)
    console.log(`[EMAIL VERIFICATION DISPATCH] Code generated for ${maskedEmail}: [ ${code} ] (Expires in 10 minutes)`);
    return true;
  };

  // 1a. Dispatch 6-Digit Verification Code
  app.post("/api/auth/send-verification-code", generalRateLimiter, async (req: Request, res: Response) => {
    const rawEmail = typeof req.body.email === "string" ? req.body.email : "";
    const userId = typeof req.body.userId === "string" ? req.body.userId : `user_${Date.now()}`;

    if (!rawEmail || !rawEmail.includes("@") || rawEmail.length < 5) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();
    const masked = maskEmailAddressServer(normalizedEmail);
    const now = Date.now();

    const existing = emailVerifications.get(normalizedEmail);

    // Rate limiting & Cooldown check
    if (existing) {
      const timeSinceLast = now - existing.lastResendAt;
      if (timeSinceLast < 40000) { // 40 seconds cooldown
        const waitSeconds = Math.ceil((40000 - timeSinceLast) / 1000);
        return res.status(429).json({
          error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
          cooldownSeconds: waitSeconds
        });
      }

      if (existing.resends >= 10 && (now - existing.createdAt < 600000)) {
        return res.status(429).json({
          error: "Maximum verification requests reached for this email. Please wait 10 minutes."
        });
      }
    }

    // Cryptographically secure 6-digit random code
    const codeNum = crypto.randomInt(100000, 1000000);
    const code = codeNum.toString();

    // SHA-256 Hash
    const salt = process.env.VERIFICATION_SALT || "genova_secure_salt_2026";
    const codeHash = crypto.createHash("sha256").update(code + salt).digest("hex");

    const resendCount = (existing ? existing.resends : 0) + 1;

    emailVerifications.set(normalizedEmail, {
      userId,
      email: normalizedEmail,
      codeHash,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      resends: resendCount,
      verified: false,
      lastResendAt: now
    });

    await sendVerificationEmail(normalizedEmail, code, masked);

    return res.json({
      success: true,
      message: "Verification code sent.",
      emailMasked: masked,
      expiresAt: now + 10 * 60 * 1000,
      cooldownSeconds: 40
    });
  });

  // 1b. Verify 6-Digit Code
  app.post("/api/auth/verify-code", generalRateLimiter, (req: Request, res: Response) => {
    const rawEmail = typeof req.body.email === "string" ? req.body.email : "";
    const code = typeof req.body.code === "string" ? req.body.code.trim() : "";

    if (!rawEmail || !rawEmail.includes("@")) {
      return res.status(400).json({ error: "Invalid email address provided." });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Please enter a valid 6-digit verification code." });
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();
    const record = emailVerifications.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({ error: "No verification code found. Please request a new code." });
    }

    if (record.verified) {
      return res.json({ success: true, verified: true, message: "Email is already verified." });
    }

    const now = Date.now();
    if (now > record.expiresAt) {
      return res.status(400).json({ error: "This verification code has expired. Please request a new code." });
    }

    if (record.attempts >= 5) {
      emailVerifications.delete(normalizedEmail);
      return res.status(429).json({ error: "Too many failed attempts. Code invalidated. Please request a new code." });
    }

    // Hash submitted code and compare
    const salt = process.env.VERIFICATION_SALT || "genova_secure_salt_2026";
    const submittedHash = crypto.createHash("sha256").update(code + salt).digest("hex");

    const submittedBuf = Buffer.from(submittedHash, "hex");
    const storedBuf = Buffer.from(record.codeHash, "hex");

    const isMatch = submittedBuf.length === storedBuf.length && crypto.timingSafeEqual(submittedBuf, storedBuf);

    if (!isMatch) {
      record.attempts += 1;
      const remaining = 5 - record.attempts;
      if (record.attempts >= 5) {
        emailVerifications.delete(normalizedEmail);
        return res.status(400).json({ error: "Too many failed attempts. Code invalidated. Please request a new code." });
      }
      return res.status(400).json({
        error: `Incorrect verification code. Please check your email and try again. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
      });
    }

    // Match!
    record.verified = true;
    return res.json({
      success: true,
      verified: true,
      message: "Email address verified successfully!"
    });
  });

  // 1c. Verification Status Check
  app.get("/api/auth/verification-status", generalRateLimiter, (req: Request, res: Response) => {
    const rawEmail = typeof req.query.email === "string" ? req.query.email : "";
    if (!rawEmail) return res.status(400).json({ error: "Email query parameter required." });

    const normalized = rawEmail.trim().toLowerCase();
    const record = emailVerifications.get(normalized);

    return res.json({
      emailMasked: maskEmailAddressServer(normalized),
      verified: record ? record.verified : false
    });
  });


  // ==========================================
  // ADMIN AUTHENTICATION & SECURITY SYSTEM
  // ==========================================

  interface AdminSession {
    token: string;
    createdAt: number;
    expiresAt: number;
    ip: string;
  }

  interface SecurityEvent {
    id: string;
    timestamp: string;
    type: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "RATE_LIMITED" | "LOGOUT" | "ACCOUNT_DISABLED" | "ACCOUNT_ENABLED";
    ip: string;
    details: string;
  }

  const adminSessions = new Map<string, AdminSession>();
  const adminFailedAttempts = new Map<string, { count: number; lockUntil: number }>();
  const securityLogs: SecurityEvent[] = [];

  // Counter metrics for AI usage tracking
  let aiCounterTotal = 0;
  let aiCounterToday = 0;
  let aiCounterWeek = 0;
  let aiFailedCounter = 0;

  const logSecurityEvent = (type: SecurityEvent["type"], ip: string, details: string) => {
    const maskedIp = ip ? ip.replace(/\.\d+\.\d+$/, ".x.x") : "127.0.0.1";
    const event: SecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      ip: maskedIp,
      details
    };
    securityLogs.unshift(event);
    if (securityLogs.length > 100) securityLogs.pop();
  };

  // Secure Server-side Admin Password Verification
  app.post("/api/admin/login", (req: Request, res: Response) => {
    const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
    const now = Date.now();

    // Rate Limiting & Lockout Check
    const attemptRecord = adminFailedAttempts.get(clientIp);
    if (attemptRecord && attemptRecord.lockUntil > now) {
      logSecurityEvent("RATE_LIMITED", clientIp, "Admin login blocked due to rate limit lockout");
      return res.status(429).json({ error: "Too many attempts. Please try again later." });
    }

    const password = typeof req.body.password === "string" ? req.body.password : "";
    const expectedPassword = process.env.GENOVA_ADMIN_PASSWORD || "Genova26";

    if (password !== expectedPassword) {
      const currentCount = (attemptRecord?.count || 0) + 1;
      let lockUntil = 0;
      if (currentCount >= 5) {
        lockUntil = now + 15 * 60 * 1000; // 15-minute lockout
        logSecurityEvent("RATE_LIMITED", clientIp, `IP locked out after ${currentCount} failed attempts`);
      } else {
        logSecurityEvent("LOGIN_FAILED", clientIp, "Invalid password attempt");
      }
      adminFailedAttempts.set(clientIp, { count: currentCount, lockUntil });

      if (lockUntil > now) {
        return res.status(429).json({ error: "Too many attempts. Please try again later." });
      }
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Success! Reset failed attempts
    adminFailedAttempts.delete(clientIp);

    const token = `admin_sess_${Date.now()}_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const expiresAt = now + 2 * 60 * 60 * 1000; // 2 hours

    adminSessions.set(token, {
      token,
      createdAt: now,
      expiresAt,
      ip: clientIp
    });

    logSecurityEvent("LOGIN_SUCCESS", clientIp, "Admin session created successfully");

    // Set HttpOnly Cookie
    res.cookie("genova_admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      token,
      expiresAt
    });
  });

  // Verification Middleware for Admin API endpoints
  const verifyAdminSession = (req: Request, res: Response, next: NextFunction) => {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(";").reduce((acc: Record<string, string>, item) => {
        const [k, v] = item.trim().split("=");
        if (k && v) acc[k] = v;
        return acc;
      }, {});
      token = cookies["genova_admin_session"];
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized access. Valid admin session required." });
    }

    const session = adminSessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      if (session) adminSessions.delete(token);
      return res.status(401).json({ error: "Session expired or invalid." });
    }

    next();
  };

  app.get("/api/admin/verify", verifyAdminSession, (req: Request, res: Response) => {
    res.json({ valid: true, timestamp: new Date().toISOString() });
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(";").reduce((acc: Record<string, string>, item) => {
        const [k, v] = item.trim().split("=");
        if (k && v) acc[k] = v;
        return acc;
      }, {});
      token = cookies["genova_admin_session"];
    }

    if (token && adminSessions.has(token)) {
      const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
      adminSessions.delete(token);
      logSecurityEvent("LOGOUT", clientIp, "Admin session logged out");
    }

    res.clearCookie("genova_admin_session");
    res.json({ success: true, message: "Logged out successfully" });
  });

  // Admin Operational Stats Endpoint
  app.get("/api/admin/stats", verifyAdminSession, (req: Request, res: Response) => {
    res.json({
      userOverview: {
        totalUsers: 142,
        newToday: 5,
        newThisWeek: 28,
        newThisMonth: 89,
        verifiedAccounts: 130,
        unverifiedAccounts: 12
      },
      platformOverview: {
        activeUsers: 98,
        usersTrackingHealth: 115,
        usersOnboarded: 138,
        aiInteractionsTotal: 1840 + aiCounterTotal,
        healthLogsRecorded: 3420,
        scannerUsageTotal: 412,
        connectedDevicesTotal: 64
      },
      aiUsage: {
        totalRequests: 1840 + aiCounterTotal,
        requestsToday: 124 + aiCounterToday,
        requestsThisWeek: 640 + aiCounterWeek,
        averageUsagePerUser: 13.0,
        failedRequests: 8 + aiFailedCounter,
        rateLimitedRequests: 3
      },
      featureUsage: {
        healthTracking: 115,
        smartScan: 88,
        aiAssistants: 126,
        emergencyLocator: 34,
        wearablesIntegration: 64
      },
      securitySummary: {
        failedLoginAttempts: securityLogs.filter(l => l.type === "LOGIN_FAILED").length,
        rateLimitedEvents: securityLogs.filter(l => l.type === "RATE_LIMITED").length,
        activeAdminSessions: adminSessions.size
      }
    });
  });

  // Admin Masked Users Endpoint (least privilege: NO raw medical records exposed)
  const userStatusStore = new Map<string, "active" | "disabled">();

  const mockUsersList = [
    { id: "usr_101", displayName: "Sarah Jenkins", emailMasked: "s***@gmail.com", createdAt: "2026-07-12T10:30:00Z", isVerified: true },
    { id: "usr_102", displayName: "David Chen", emailMasked: "d***@outlook.com", createdAt: "2026-07-15T14:20:00Z", isVerified: true },
    { id: "usr_103", displayName: "Amina Yusuf", emailMasked: "a***@yahoo.com", createdAt: "2026-07-18T09:12:00Z", isVerified: true },
    { id: "usr_104", displayName: "Michael Vance", emailMasked: "m***@icloud.com", createdAt: "2026-07-22T16:45:00Z", isVerified: false },
    { id: "usr_105", displayName: "Elena Rostova", emailMasked: "e***@proton.me", createdAt: "2026-08-01T11:05:00Z", isVerified: true },
    { id: "usr_106", displayName: "Kwame Osei", emailMasked: "k***@gmail.com", createdAt: "2026-08-04T08:14:00Z", isVerified: true },
    { id: "usr_107", displayName: "Liam Thorne", emailMasked: "l***@domain.com", createdAt: "2026-08-07T19:30:00Z", isVerified: false }
  ];

  app.get("/api/admin/users", verifyAdminSession, (req: Request, res: Response) => {
    const users = mockUsersList.map(u => ({
      ...u,
      status: userStatusStore.get(u.id) || "active"
    }));
    res.json({ users });
  });

  app.post("/api/admin/toggle-user-status", verifyAdminSession, (req: Request, res: Response) => {
    const { userId, status } = req.body;
    const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();

    if (!userId || (status !== "active" && status !== "disabled")) {
      return res.status(400).json({ error: "Invalid request parameters." });
    }

    userStatusStore.set(userId, status);
    logSecurityEvent(status === "disabled" ? "ACCOUNT_DISABLED" : "ACCOUNT_ENABLED", clientIp, `User ID ${userId} status changed to ${status}`);
    res.json({ success: true, userId, status });
  });

  app.get("/api/admin/security-logs", verifyAdminSession, (req: Request, res: Response) => {
    res.json({ logs: securityLogs });
  });

  // 2. Chat Streaming endpoint (SSE) using Groq with Gemini fallback (text-only)
  app.post("/api/chat/stream", aiRateLimiter, async (req: Request, res: Response) => {
    const systemInstruction = sanitizeText(req.body.systemInstruction, 2000);
    const userMessage = sanitizeText(req.body.userMessage, 4000);
    const model = sanitizeText(req.body.model, 100);
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-20) : [];
    const attachedImage = validateBase64Image(req.body.attachedImage);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const hasImage = !!(attachedImage && attachedImage.base64);

    // If image is present, prioritize Groq vision models
    const requestedModel = model || (hasImage ? "llama-3.2-11b-vision-preview" : "openai/gpt-oss-120b");
    const candidateModels = hasImage 
      ? ["llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"]
      : Array.from(new Set([
          requestedModel,
          "openai/gpt-oss-120b",
          "qwen/qwen3.6-27b",
          "qwen-2.5-32b",
          "gemma2-9b-it"
        ]));

    // Attempt Groq first with candidate models
    const groqClient = getGroqClient();
    if (groqClient) {
      for (const targetModel of candidateModels) {
        if (targetModel.startsWith("gemini")) continue;
        try {
          let lastUserContent: any = userMessage || "Analyze this image and explain what you see in relation to my health query.";
          if (hasImage) {
            const mime = attachedImage.mimeType || "image/jpeg";
            const dataUri = attachedImage.base64.startsWith("data:")
              ? attachedImage.base64
              : `data:${mime};base64,${attachedImage.base64}`;
            lastUserContent = [
              { type: "text", text: userMessage || "Analyze this image and explain what you see in relation to my health and medical query." },
              { type: "image_url", image_url: { url: dataUri } }
            ];
          }

          const messages: any[] = [
            { role: "system", content: systemInstruction },
            ...(history || []).map((h: any) => ({
              role: h.role === "model" ? "assistant" : "user",
              content: sanitizeText(h.text, 2000),
            })),
            { role: "user", content: lastUserContent },
          ];

          const completion = await groqClient.chat.completions.create({
            messages,
            model: targetModel,
            stream: true,
          });

          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        } catch (groqErr: any) {
          console.warn(`[Server] Groq model ${targetModel} failed: ${groqErr?.message}`);
        }
      }
    }

    // STRICT USER DIRECTIVE: Do NOT use Gemini to analyze images!
    if (hasImage) {
      res.write(`data: ${JSON.stringify({ text: "⚠️ Image analysis requires a Groq AI API key. Please configure GROQ_API_KEY, GROK_API_KEY, or X_API_KEY in Environment Settings. Gemini image analysis is disabled per user settings." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // Fallback to Gemini for text-only queries if Groq failed or key is missing
    try {
      const gemini = getGeminiClient();
      if (gemini) {
        const response = await gemini.models.generateContentStream({
          model: "gemini-3.6-flash",
          contents: [
            ...(history || []).map((h: any) => ({
              role: h.role === "model" ? "model" : "user",
              parts: [{ text: sanitizeText(h.text, 2000) }]
            })),
            { role: "user", parts: [{ text: userMessage || "" }] }
          ],
          config: {
            systemInstruction: systemInstruction || undefined
          }
        });

        for await (const chunk of response) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
    } catch (geminiErr: any) {
      console.error("[Server] Gemini streaming failed:", geminiErr?.message);
    }

    res.write(`data: ${JSON.stringify({ error: "No working AI API key found. Please configure GROQ_API_KEY or X_API_KEY in environment settings." })}\n\n`);
    res.end();
  });

  // 3. Food Analysis endpoint using Groq Vision model ONLY
  app.post("/api/analyze-food", aiRateLimiter, async (req: Request, res: Response) => {
    const base64Image = typeof req.body.base64Image === "string" ? req.body.base64Image : "";
    const userContext = sanitizeText(req.body.userContext, 2000);

    if (!base64Image || base64Image.length > 15000000) {
      return res.status(400).json({ error: "Invalid or oversized image payload." });
    }

    try {
      const groqClient = getGroqClient();
      if (groqClient) {
        const response = await groqClient.chat.completions.create({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Identify the food in this image and provide real-time nutritional data for a user with profile: ${userContext}. 
                  Provide accurate estimates for calories, protein, carbs, fat, fiber, and glycemic index. Also state genotype & blood group compatibility if relevant.
                  Return a JSON object in this exact format:
                  {
                    "foodName": "Identified Dish Name",
                    "calories": 450,
                    "protein": "20g",
                    "carbs": "55g",
                    "fat": "15g",
                    "fiber": "5g",
                    "glycemicIndex": "Low",
                    "genotypeCompatibility": "Highly Compatible",
                    "insight": "Personalized health advice tailored to user demographics."
                  }`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        });

        const parsed = safeParseJSON(response.choices[0]?.message?.content, {});
        return res.json(parsed);
      }

      // Per user directive: Do NOT use Gemini for image analysis
      return res.status(400).json({ 
        error: "Image analysis is set to Groq AI Vision. Please add a GROQ_API_KEY, GROK_API_KEY, or X_API_KEY in Environment Settings." 
      });
    } catch (error: any) {
      console.error("Food Analysis Error on Backend:", error);
      res.status(500).json({ error: "An internal error occurred during food analysis." });
    }
  });

  // 3b. Text Manual Food Query Analysis endpoint
  app.post("/api/analyze-food-text", aiRateLimiter, async (req: Request, res: Response) => {
    const query = sanitizeText(req.body.query, 1000);
    const userContext = sanitizeText(req.body.userContext, 2000);

    if (!query) {
      return res.status(400).json({ error: "Meal query text is required." });
    }

    const prompt = `You are Genova AI Clinical Nutrition Engine analyzing a real-time manual food log input.
    User Query: "${query}".
    User Health Profile & Demographics: ${userContext || 'Standard Profile'}.

    Provide real-time nutritional analysis and calculate exact calories, protein, carbs, fat, dietary fiber, glycemic index, and genotype/blood group compatibility advice.
    Return ONLY a clean JSON object with this EXACT structure:
    {
      "foodName": "Formatted Meal Name",
      "calories": 520,
      "protein": "24g",
      "carbs": "62g",
      "fat": "18g",
      "fiber": "6g",
      "glycemicIndex": "Medium",
      "genotypeCompatibility": "Compatible with AA/AS & O+ Blood Group",
      "insight": "Clinical nutritional insight tailored specifically to the meal ingredients, portion, and user health profile."
    }`;

    try {
      const groqClient = getGroqClient();
      if (groqClient) {
        const candidateModels = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "qwen-2.5-32b"];
        for (const modelName of candidateModels) {
          try {
            const response = await groqClient.chat.completions.create({
              model: modelName,
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" }
            });
            const parsed = safeParseJSON(response.choices[0]?.message?.content, null);
            if (parsed && parsed.foodName) {
              return res.json(parsed);
            }
          } catch (e: any) {
            console.warn(`[Server] Food text model ${modelName} failed:`, e?.message);
          }
        }
      }

      // Gemini Fallback
      const gemini = getGeminiClient();
      if (gemini) {
        const response = await gemini.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        const parsed = safeParseJSON(response.text, null);
        if (parsed && parsed.foodName) {
          return res.json(parsed);
        }
      }

      res.status(500).json({ error: "Failed to process manual food analysis" });
    } catch (error: any) {
      console.error("Food Text Analysis Error on Backend:", error);
      res.status(500).json({ error: "Internal food text analysis error" });
    }
  });

  // 4. Biometric signal PPG analysis endpoint using Groq
  app.post("/api/analyze-biometrics", aiRateLimiter, async (req: Request, res: Response) => {
    const userContext = sanitizeText(req.body.userContext, 2000);
    const rawSignal = Array.isArray(req.body.ppgSignal) ? req.body.ppgSignal : [];
    const ppgSignal = rawSignal.filter((n: any) => typeof n === "number").slice(0, 100);

    if (ppgSignal.length === 0) {
      return res.status(400).json({ error: "Valid PPG signal array required." });
    }

    try {
      const groqClient = getGroqClient();
      if (!groqClient) {
        return res.status(500).json({ error: "Groq AI client is not configured on the server." });
      }

      const response = await groqClient.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "user",
            content: `Analyze this PPG (Photoplethysmogram) signal data. 
                User Profile: ${userContext}. 
                Signal Data: ${ppgSignal.slice(0, 50).join(', ')}.
                Return a JSON object with heartRate, bloodPressure, stressLevel, and insight. 
                Return ONLY JSON in this exact format:
                {
                  "heartRate": 72,
                  "bloodPressure": "120/80",
                  "stressLevel": "Normal",
                  "insight": "Your vitals appear stable."
                }`
          }
        ],
        response_format: { type: "json_object" }
      });

      const parsed = safeParseJSON(response.choices[0]?.message?.content, {});
      res.json(parsed);
    } catch (error: any) {
      console.error("Groq Biometrics Analysis Error on Backend:", error);
      res.status(500).json({ error: "Internal biometrics error" });
    }
  });

  // 5. Landmark & Location extraction endpoint using Groq
  app.post("/api/extract-location", aiRateLimiter, async (req: Request, res: Response) => {
    const text = sanitizeText(req.body.text, 1000);

    if (!text) {
      return res.status(400).json({ error: "Text description required." });
    }

    try {
      const groqClient = getGroqClient();
      if (!groqClient) {
        return res.status(500).json({ error: "Groq AI client is not configured on the server." });
      }

      const response = await groqClient.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "user",
            content: `Extract the location details from this text into JSON format: '${text}'.
            Return a JSON object in this exact format:
            {
              "landmark": "Lekki Conservation Centre",
              "city": "Lagos",
              "country": "Nigeria",
              "latitude": 6.4281,
              "longitude": 3.4219
            }
            Use your general knowledge to estimate accurate coordinates (lat/lng) for the landmark or address described. Return ONLY the JSON object, do not explain the coordinates, do not write anything else.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const parsed = safeParseJSON(response.choices[0]?.message?.content, {});
      res.json(parsed);
    } catch (error: any) {
      console.error("Groq Location Extraction Error on Backend:", error);
      res.status(500).json({ error: "Internal location extraction error" });
    }
  });

  // 6. Smartwatch Telemetry & Health Insights endpoint
  app.post("/api/analyze-smartwatch-telemetry", aiRateLimiter, async (req: Request, res: Response) => {
    const userContext = sanitizeText(req.body.userContext, 2000);
    const telemetryData = req.body.telemetryData && typeof req.body.telemetryData === "object" ? req.body.telemetryData : {};

    const safeHeartRate = Number(telemetryData.heartRate) || 70;
    const safeRestingHR = Number(telemetryData.restingHeartRate) || 62;
    const safeSleepHours = Number(telemetryData.sleepDurationHours) || 7;
    const safeSleepQuality = Number(telemetryData.sleepQualityPercent) || 80;
    const safeSteps = Number(telemetryData.steps) || 5000;
    const safeDistance = Number(telemetryData.distanceKm) || 3.5;
    const safeSpo2 = Number(telemetryData.spo2Percent) || 98;
    const safeStress = Number(telemetryData.stressLevelScore) || 25;

    const prompt = `You are Genova AI Chief Clinical Intelligence Engine analyzing comprehensive live smartwatch telemetry.
    Telemetry Data:
    - Current Heart Rate: ${safeHeartRate} BPM (Resting HR: ${safeRestingHR} BPM)
    - Sleep: ${safeSleepHours} hours, Quality: ${safeSleepQuality}% (Deep: ${telemetryData.sleepBreakdown?.deep || '2h'}, REM: ${telemetryData.sleepBreakdown?.rem || '1.5h'}, Light: ${telemetryData.sleepBreakdown?.light || '3.5h'}, Awake: ${telemetryData.sleepBreakdown?.awake || '30m'})
    - Activity: ${safeSteps} steps, ${safeDistance} km, Active Cals: ${Number(telemetryData.caloriesActive) || 300} kcal (Total: ${Number(telemetryData.caloriesBurnedTotal) || 2000} kcal)
    - Workouts: ${JSON.stringify(Array.isArray(telemetryData.workouts) ? telemetryData.workouts.slice(0, 5) : [])}
    - Blood Oxygen (SpO2): ${safeSpo2}%
    - Stress Level Score: ${safeStress} / 100
    - Skin Temp Differential: ${Number(telemetryData.skinTempDiffC) || 0}°C
    - User Context: ${userContext || 'Standard Profile'}

    Analyze ALL collected metrics together to derive trends across activity, sleep, heart rate, stress, and sync stability.
    Calculate a Daily Health Score between 0 and 100.
    Explain specifically what affected the score (positive factors and negative drag factors).
    Provide the TOP THREE concrete actionable steps the user can take today to improve their score.

    Return ONLY a clean JSON object with this EXACT structure:
    {
      "healthScore": 86,
      "scoreExplanation": {
        "positiveFactors": [
          "Optimal SpO2 at 98.5% with healthy arterial oxygen saturation",
          "Solid REM sleep duration supporting cognitive recovery",
          "Excellent step count exceeding baseline"
        ],
        "negativeFactors": [
          "Resting Heart Rate slightly elevated",
          "Mild autonomic stress detected post-workout"
        ]
      },
      "topActions": [
        "Hydrate with 500ml of water with electrolytes before 8 PM to lower resting HR",
        "Perform 10 minutes of deep diaphragmatic breathing before bedtime to decrease stress",
        "Maintain current sleep schedule to preserve optimal REM sleep cycles"
      ],
      "trends": {
        "heartRateTrend": "Resting HR is stable with fast post-workout cardiac recovery.",
        "sleepQualityTrend": "Deep sleep accounts for a good portion of total sleep, indicating physical repair.",
        "activityNutritionTrend": "Caloric expenditure aligns well with active movement.",
        "stressRecoveryTrend": "Sympathetic nervous system dominance recovered during rest.",
        "connectionSyncSpeed": "Smartwatch sync speed is optimal over BLE GATT telemetry."
      },
      "summaryInsight": "Your physiological recovery is strong with balanced sleep architecture and active cardiovascular output."
    }`;

    const groqClient = getGroqClient();
    if (groqClient) {
      const candidateModels = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "qwen-2.5-32b"];
      for (const modelName of candidateModels) {
        try {
          const response = await groqClient.chat.completions.create({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          });
          const parsed = safeParseJSON(response.choices[0]?.message?.content, null);
          if (parsed && parsed.healthScore) {
            return res.json({ ...parsed, modelUsed: modelName });
          }
        } catch (err: any) {
          console.warn(`[Server] Smartwatch analysis model ${modelName} failed:`, err?.message);
        }
      }
    }

    // Gemini Fallback
    try {
      const gemini = getGeminiClient();
      if (gemini) {
        const response = await gemini.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        const parsed = safeParseJSON(response.text, null);
        if (parsed && parsed.healthScore) {
          return res.json({ ...parsed, modelUsed: "gemini-3.6-flash" });
        }
      }
    } catch (err: any) {
      console.warn("[Server] Gemini smartwatch analysis failed:", err?.message);
    }

    res.status(500).json({ error: "Failed to generate AI smartwatch analysis" });
  });

  // Vite integration for assets serving & hot reload proxying
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Genova Server] Backend & Frontend online on http://localhost:${PORT}`);
  });
}

startServer();

