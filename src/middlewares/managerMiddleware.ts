import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase";

export interface ManagerRequest extends Request {
  manager?: {
    id: string;
    email?: string | null;
    manager_name?: string | null;
  };
}

export default async function managerMiddleware(
  req: ManagerRequest,
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

    req.manager = {
      id: decoded.id,
      email: decoded.email,
      manager_name: decoded.manager_name
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}
