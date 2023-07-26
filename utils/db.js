const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://hoyhqpzaoazcpunwuqzc.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhveWhxcHphb2F6Y3B1bnd1cXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY1ODkxMzM1OCwiZXhwIjoxOTc0NDg5MzU4fQ.2NOLtLVLB6uPLxLmSyGBYJP3keLYEUijBMkyeb_Trnk";
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
