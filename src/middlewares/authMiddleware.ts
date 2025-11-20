import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username?: string;
    email?: string | null;
    business_name?: string | null;
    access_code?: string | null;
  };
}

export default async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const { data: blacklisted } = await supabase
      .from("blacklisted_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (blacklisted) {
      return res.status(401).json({ success: false, message: "Token is invalid" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: "JWT_SECRET not configured" });
    }

    const decoded = jwt.verify(token, secret) as any;

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      business_name: decoded.business_name,
      access_code: decoded.access_code
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}
