import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase";
import { SupabaseUserRow } from "../types/User";

const JWT_EXPIRES_SECONDS = 3600; // 1 hour

export class ManagerService {
  static async login(email: string, password: string) {
    // Fetch user by username & accessCode
    const { data, error } = await supabase
      .from("managers")
      .select("*")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error("Database error: " + error.message);
    if (!data) throw new Error("Invalid credentials");

    const manager = data;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not configured");

    // Check if token exists and is still valid
    if (manager.current_access_token) {
      const { data: blacklisted } = await supabase
        .from("token_blacklist")
        .select("id")
        .eq("token", manager.current_token)
        .limit(1);

      if (!blacklisted) {
        // Token is blacklisted, proceed to generate a new one
        try {
          jwt.verify(manager.current_access_token, secret);
          // Token is valid, user already logged in — return existing token instead of creating new
          const message = "Manager already logged in, returning existing token";
          console.log(message);
          const safeManager = {
            id: manager.id,
            email: manager.email,
            manager_name: manager.manager_name
          };
          return {
            message,
            token: manager.current_access_token,
            expiresIn: JWT_EXPIRES_SECONDS,
            user: safeManager,
          };
        } catch {
          // Token expired or invalid, continue with login flow
        }
      }
    }

    // Verify password
    const passwordMatches = await bcrypt.compare(password, manager.password);
    if (!passwordMatches) throw new Error("Invalid credentials");

    // Generate JWT token
    const token = jwt.sign({ id: manager.id, email: manager.email }, secret, {
      expiresIn: JWT_EXPIRES_SECONDS,
    });

    // Save current token to user
    const { error: updateError } = await supabase
      .from("managers")
      .update({
        current_access_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", manager.id);

    if (updateError) {
      throw new Error("Failed to save access token: " + updateError.message);
    }

    // Return token and safe user data
    const safeManager = {
      id: manager.id,
      email: manager.email,
      manager_name: manager.manager_name,
    };

    return { token, expiresIn: JWT_EXPIRES_SECONDS, user: safeManager };
  }

  /**
   * Log out a user by clearing the stored current_access_token
   * @param userId string (UUID)
   */
  static async logout(managerId: string) {
    if (!managerId) throw new Error("Invalid user id");

    const { error } = await supabase
      .from("managers")
      .update({
        current_access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", managerId);

    if (error) {
      throw new Error("Failed to logout user: " + error.message);
    }

    return { message: "Logged out successfully" };
  }


  static async getUsersWithTransactionSummary(managerId: string) {
  if (!managerId) throw new Error("Manager ID missing");

  // Query users under this manager
  const { data: users, error: userError } = await supabase
    .from("app_users")
    .select("id, business_name, email")
    .eq("manager_id", managerId);

  if (userError) throw new Error("Failed to fetch users: " + userError.message);

  if (!users || users.length === 0) {
    return [];
  }

  // Fetch all user IDs
  const userIds = users.map(u => u.id);

  // Fetch transactions for all users IN ONE QUERY
  const { data: txData, error: txError } = await supabase
    .from("transactions")
    .select("user_id, amount, created_at")
    .in("user_id", userIds);

  if (txError) throw new Error("Failed to fetch transactions: " + txError.message);

  // Summaries per user
  const summaries = users.map(user => {
    const userTx = txData?.filter(t => t.user_id === user.id) || [];

    const totalAmount = userTx.reduce((s, t) => s + Number(t.amount), 0);
    const totalTransactions = userTx.length;
    const lastTransaction = userTx.length
      ? userTx.sort((a, b) => new Date(b.created_at).valueOf() - new Date(a.created_at).valueOf())[0].created_at
      : null;

    return {
      ...user,
      totalAmount,
      totalTransactions,
      lastTransaction
    };
  });

  return summaries;
}

}
