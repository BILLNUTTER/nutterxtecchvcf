import type { Request, Response, NextFunction } from "express";

/** Rejects requests that don't have an authenticated admin session. */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.session.isAdmin) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
