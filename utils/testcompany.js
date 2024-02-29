require("dotenv").config();
const supabase = require("./db");

(async () => {
  const {data, error} = await supabase.from("target_companies").select().eq("name", "Future Bridge");
  console.log(data[0]?.industries[0]);
})();
