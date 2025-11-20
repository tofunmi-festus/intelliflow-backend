import * as express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username?: string;
        email?: string | null;
        business_name?: string | null;
        access_code?: string | null;
      };
    }
  }
}

