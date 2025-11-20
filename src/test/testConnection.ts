import dotenv from "dotenv";
dotenv.config();

import { supabase } from "../config/supabase";

async function testConnection() {
  try {
    console.log("Testing Supabase connection...");
    console.log("URL Loaded:", !!process.env.SUPABASE_URL);
    console.log("KEY Loaded:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("\nFetching users...");

    const { data: users, error: userErr } = await supabase
      .from("app_users")
      .select("*")
      .limit(5);

    if (userErr) {
      console.error("Error fetching users:", userErr);
    } else {
      console.log("Users:", users);
    }

    console.log("\nFetching transactions...");

    const { data: txs, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .limit(5);

    if (txErr) {
      console.error("Error fetching transactions:", txErr);
    } else {
      console.log("Transactions:", txs);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

testConnection();
