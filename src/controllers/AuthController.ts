import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

export class AuthController {
  static async login(req: Request, res: Response) {
    const { accessCode, username, password } = req.body;

    try {
      const result = await AuthService.login(accessCode, username, password);
      return res.json(result);
    } catch (error: any) {
      return res.status(401).json({ message: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      // we use (req as any) because you told me earlier you prefer local cast
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await AuthService.logout(user.id);

      // also return a short message so client can clear local token
      return res.json({ message: "Successfully logged out" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Logout failed" });
    }
  }
}
