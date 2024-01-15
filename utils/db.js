const {createClient} = require("@supabase/supabase-js");

const supabase = (() => {
  if (process.env.MODE == "PROD") {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  }
  if (process.env.MODE == "LOCAL") {
    return createClient(process.env.SUPABASE_URL_LOCAL, process.env.SUPABASE_KEY_LOCAL);
  }
  return createClient(process.env.SUPABASE_URL_DEV, process.env.SUPABASE_KEY_DEV);
})();

module.exports = supabase;
