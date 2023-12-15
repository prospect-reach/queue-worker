const {createClient} = require("@supabase/supabase-js");

const supabase = (() => {
  if ((process.env.MODE = "PROD")) {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  }
  return createClient(process.env.SUPABASE_URL_DEV, process.env.SUPABASE_KEY_DEV);
})();

module.exports = supabase;
