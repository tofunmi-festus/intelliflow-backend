"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const AuthService_1 = require("../services/AuthService");
const supabase_1 = require("../config/supabase");
class AuthController {
    static async login(req, res) {
        const { accessCode, username, password } = req.body;
        try {
            const result = await AuthService_1.AuthService.login(accessCode, username, password);
            return res.json(result);
        }
        catch (error) {
            return res.status(401).json({ message: error.message });
        }
    }
    // static async logout(req: Request, res: Response) {
    //   try {
    //     // we use (req as any) because you told me earlier you prefer local cast
    //     const user = (req as any).user;
    //     if (!user || !user.id) {
    //       return res.status(401).json({ message: "Unauthorized" });
    //     }
    //     await AuthService.logout(user.id);
    //     // also return a short message so client can clear local token
    //     return res.json({ message: "Successfully logged out" });
    //   } catch (err: any) {
    //     return res.status(500).json({ message: err.message || "Logout failed" });
    //   }
    // }
    static async logout(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(400).json({ success: false, message: "No token provided" });
            }
            const token = authHeader.split(" ")[1];
            // Save token to blacklist
            const { error } = await supabase_1.supabase
                .from("blacklisted_tokens")
                .insert({ token });
            if (error) {
                return res.status(500).json({ success: false, message: "Failed to log out" });
            }
            const user = req.user;
            await AuthService_1.AuthService.logout(user.id);
            return res.json({ success: true, message: "Logged out successfully" });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: "Logout failed" });
        }
    }
}
exports.AuthController = AuthController;
