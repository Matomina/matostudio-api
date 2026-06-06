import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const ADMIN_COOKIE = "mat_admin";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.[ADMIN_COOKIE] as string | undefined;

  if (!token) {
    response.status(401).json({ success: false, error: "Authentication required." });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    response.status(500).json({ success: false, error: "Server misconfiguration." });
    return;
  }

  try {
    jwt.verify(token, secret);
    next();
  } catch {
    response.status(401).json({ success: false, error: "Invalid or expired session." });
  }
}
