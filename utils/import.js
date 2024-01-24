const supabase = require("./db");
const {io} = require("./socket");
const mail = require("./mail");
const {uuid} = require("uuidv4");
var crypto = require("crypto");

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

  let lastCheckedDomainIsBlacklisted = ["", false];

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

    const {data: existingCompanyRecord, error: companyError} = await supabase.from("target_companies").select().eq("name", company.name);

    console.log("COMPANY FOUND", existingCompanyRecord);
    if (companyError) {
      console.log("query", companyError);
    }

    let companyRef;

    // console.log("company", company);

    if (existingCompanyRecord.length < 1) {
      const {data: companyRecord, error: companyError} = await supabase.from("target_companies").insert(company).select();

      if (companyError) {
        console.log("insert", companyError);
      }

      console.log(companyRecord);
      companyRef = companyRecord;
    } else {
      companyRef = existingCompanyRecord;
    }

    // console.log("Company", companyRef);

    let emailDomain = entry["Email"].split("@")[1];

    if (emailDomain != lastCheckedDomainIsBlacklisted[0]) {
      lastCheckedDomainIsBlacklisted[0] = emailDomain;

      let {count: checkedDomain, error} = await supabase
        .from("blacklist")
        .select("*", {count: "exact", head: true})
        .eq("blocked_domain_or_email", emailDomain);

      console.log("CHECK DOMAIN BLACKLIST:", checkedDomain, error);

      if (checkedDomain > 0) {
        lastCheckedDomainIsBlacklisted[1] = true;
      } else {
        lastCheckedDomainIsBlacklisted[1] = false;
      }
    }

    console.log("CHECK DOMAIN BLACKLIST:", lastCheckedDomainIsBlacklisted);

    let emailIsBlacklisted = false;

    if (lastCheckedDomainIsBlacklisted[1] == false) {
      let {count, error} = await supabase.from("blacklist").select("*", {count: "exact", head: true}).eq("blocked_domain_or_email", entry["Email"]);
      console.log("CHECK EMAIL BLACKLIST:", count, error);

      if (count > 0) {
        emailIsBlacklisted = true;
      }
    }

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
    if (leadErrorDB) console.log("FINDING LEAD ERROR", leadErrorDB);

    console.log("FINDING LEAD", entry["Email"], leadRecordDB[0]?.id);

    if (leadRecordDB.length > 0) {
      leadRecord = leadRecordDB;
    } else {
      const {data: leadRecordDB, error: leadError} = await supabase.from("leads").insert([lead]).select();
      console.log("INSERTING LEAD", leadRecordDB, leadError);

      leadRecord = leadRecordDB;
    }

    let hasResponse = false;

    const {count: emailReplies, error: emailRepliesErorr} = await supabase
      .from("emails")
      .select("id", {count: "exact", head: true})
      .match({from_address: leadRecord[0].id, direction: 1});

    console.log("EMAIL REPLIES", emailReplies, emailRepliesErorr);

    if (emailReplies > 0) hasResponse = true;

    console.log(
      "SHOULD SEND EMAIL",
      !leadRecord[0].unsubscribed && lastCheckedDomainIsBlacklisted[1] == false && !emailIsBlacklisted && !hasResponse
    );

    if (!leadRecord[0].unsubscribed && lastCheckedDomainIsBlacklisted[1] == false && !emailIsBlacklisted && !hasResponse) {
      const {data: template, error: templateError} = await supabase.from("email_templates").select().eq("dynamic_template_id", _template);
      console.log("FOUND EMAIL TEMPLATE", template[0].dynamic_template_id, templateError);
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

            custom_args: {
              conversation_id: crypto.createHash("md5").update(leadRecord[0].email).digest("hex"),
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
              firstName: leadRecord[0].name.split(" ")[0],
            },

            headers: {
              "Message-ID": crypto.createHash("md5").update(leadRecord[0].email).digest("hex"),
            },

            send_at: sendAt,
          },
        ],
        template_id: _template,
      };

      // console.log(privateMsg);

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
