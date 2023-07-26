const supabase = require("./db");
const {io} = require("./socket");
const mail = require("./mail");

Date.prototype.addThreeDays = function () {
  var date = new Date(this.valueOf());
  if (date.getDay() > 2) {
    date.setDate(date.getDate() + 3 + 2);
  } else {
    date.setDate(date.getDate() + 3);
  }
  const options = {weekday: "long"};
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

Date.prototype.addFourDays = function () {
  var date = new Date(this.valueOf());
  if (date.getDay() > 1) {
    date.setDate(date.getDate() + 4 + 2);
  } else {
    date.setDate(date.getDate() + 4);
  }
  const options = {weekday: "long"};
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

async function uploadCompaniesAndLeads(entries, fileName, domain, _template, delay, email_class, sendTime) {
  let counter = 1;

  let date = new Date(sendTime);

  console.log(date);

  const options = {weekday: "long"};
  let startTime = date.getTime() / 1000;
  // let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let greeting = date.getUTCHours() > 12 ? "Good afternoon" : "Good morning";
  let followUpAt = date.getDay() > 3 ? "early next" : "later this";
  let currentDay = new Intl.DateTimeFormat("en-US", options).format(date);
  let weekdayPlusThree = date.addThreeDays();
  let weekdayPlusFour = date.addFourDays();

  for (let entry of entries) {
    let company = {
      name: entry["Company"] ?? "",
      website: entry["Website"] ?? "",
      company_facebook: entry["Facebook Url"] ?? "",
      company_twitter: entry["Twitter Url"] ?? "",
      company_linkedin: entry["Company Linkedin Url"] ?? "",
      address: entry["Company Address"] ?? "",
      city: entry["Company City"] ?? "",
      state: entry["Company State"] ?? "",
      country: entry["Company Country"] ?? "",
      size: getCompanySize(entry["Size"]) ?? "",
      industries: [entry["Industry"]] ?? "",
      domain: domain,
    };

    const {data: companyRecord, error: companyError} = await supabase.from("target_companies").select().eq("name", company.name);

    if (companyError) {
      console.log(companyError);
    }

    let companyRef;

    if (companyRecord.length < 1) {
      const {data: companyRecord, error: companyError} = await supabase.from("target_companies").insert([company]).select();

      if (companyError) {
        console.log(companyError);
      }

      console.log(companyRecord);
      companyRef = companyRecord;
    } else {
      companyRef = companyRecord;
    }

    console.log("Company", companyRef);

    let lead = {
      name: entry["Name"] + " " + entry["Last Name"],
      email: entry["Email"] ?? "",
      email_verified: entry["Email Status"] == "Verified" ? true : false,
      department: entry["Department"],
      position: entry["Title"] ?? "",
      company: companyRef[0].id,
      seniority: entry["Seniority"] ?? "",
      linkedin: entry["Person Linkedin Url"] ?? "",
      city: entry["City"] ?? "",
      state: entry["State"] ?? "",
      country: entry["Country"] ?? "",
      domain: domain,
    };

    let leadRecord;

    const {data: leadRecordDB, error: leadErrorDB} = await supabase.from("leads").select().eq("email", entry["Email"]);

    if (leadRecordDB.length > 0) {
      leadRecord = leadRecordDB;
    } else {
      const {data: leadRecordDB, error: leadError} = await supabase.from("leads").insert([lead]).select();

      leadRecord = leadRecordDB;
    }

    if (!leadRecord[0].unsubscribed) {
      const {data: template, error: templateError} = await supabase.from("email_templates").select().eq("dynamic_template_id", _template);

      if (templateError) {
        io.emit("message", "Template not found");
      }

      const sendAt = startTime + Number(delay) * counter;

      const privateMsg = {
        from: {email: template[0].from_address, name: template[0].from_name},
        reply_to: {email: template[0].from_address},
        content: [
          {
            type: "text/html",
            value: "<span>test</span>",
          },
        ],
        subject: "test",
        personalizations: [
          {
            to: [{email: leadRecord[0].email}],

            // {subject: subject},
            // text: textMessage,
            // html: msg,

            custom_args: {
              // subject: subject,
              // body: msg,
              recipient_id: leadRecord[0].id,
              pr_domain: domain,
              dynamic_template_id: _template,
              email_class: email_class,
            },

            dynamic_template_data: {
              name: leadRecord[0].name,
              company: companyRef[0].name,
              position: leadRecord[0].position,
              industry: companyRef[0].industries,
              email: leadRecord[0].email,
              greeting,
              followUpAt,
              currentDay,
              weekdayPlusThree,
              weekdayPlusFour,
            },

            send_at: sendAt,
          },
        ],
        template_id: _template,
      };

      console.log(privateMsg);

      const dateString = ((date) => date.toLocaleDateString() + " - " + date.toLocaleTimeString())(new Date(sendAt * 1000));

      io.emit("message", "Contact " + lead.name + " saved. Company: " + companyRef[0].name + ". Scheduled at " + dateString);

      const response = await mail.send(privateMsg, false, (err, result) => {
        if (err) console.log(err.response?.body);
        console.log(result);
      });

      io.emit("message", "Email to " + lead.name + " scheduled!");
      counter++;
    } else {
      io.emit("message", lead.name + " unsubscribed");
    }
  }
  io.emit("message", counter + " emails sent");
}

function getCompanySize(_size) {
  let size = parseInt(_size);
  if (size > 0 && size <= 50) return "0-50";
  if (size > 50 && size <= 100) return "50-100";
  if (size > 100 && size <= 500) return "101-500";
  if (size > 500 && size <= 1000) return "501-1000";
  if (size > 1000 && size <= 5000) return "1001-5000";
  if (size > 5000 && size <= 10000) return "5001-10000";
  if (size > 10000) return "10000+";
}

module.exports = {
  uploadCompaniesAndLeads,
};
