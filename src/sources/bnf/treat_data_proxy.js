const fetch = require("node-fetch");
const fs = require("fs");
const mongo_pass = fs.readFileSync("../mongo_pass.txt");
const play_session = fs.readFileSync("play_session.txt");
const ObjectID = require("bson").ObjectID;

const MongoClient = require("mongodb").MongoClient;
const uri = `mongodb+srv://main_admin:${mongo_pass}@cluster1.xo9vl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const browse_url =
  "https://www.medicinescomplete.com/api/browse/bnf/treatmentSummaries/condition-";

const opts = {
  headers: {
    cookie: `PLAY_SESSION=${play_session}`,
  },
};

async function get_BNF(url) {
  try {
    // const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "Y", "Z"]
    const alphabet = ["A"];

    const all_links = new Object();

    for (var l = 0; l < alphabet.length; l++) {
      var letter = alphabet[l];

      var actual_url = url + letter;
      const response = await fetch(actual_url, opts);
      const json = await response.json();
      const content_url = "https://www.medicinescomplete.com/api/content/bnf/";

      var all_children = json.listChildren;

      for (var i = 0; i < all_children.length; i++) {
        var curr_page = all_children[i].link;
        all_links[curr_page.title] = content_url + curr_page.id + "/";
      }
    }

    console.log("retrieved all initial links");

    getData(all_links);
  } catch (error) {
    console.log(error);
  }
}

async function getData(all_links) {
  try {
    //connect to database
    await client.connect();
    const database = client.db("document");
    const collection = database.collection("document");

    async function update(filter, updateDoc, options) {
      const result = await collection.updateOne(filter, updateDoc, options);
      console.log(
        `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`
      );
    }
    try {
      for (const [title, link] of Object.entries(all_links)) {
        const response = await fetch(link, opts);
        const json = await response.json();
        const curr_content = json.contentResponse;

        const schema = new Object();

        schema["url"] = "https://bnf.nice.org.uk/treatment-summary/";
        schema["directURL"] = link;
        schema["title"] = title;
        schema["type"] = "GUIDANCE";
        schema["language"] = "en";
        schema["rights"] = "Medicines Complete";
        schema["dateIndexed"] = new Date();

        var author = new ObjectID();
        author["name"] = "National Institute for Health and Care Excellence";
        author["url"] = "https://www.nice.org.uk/";
        author["email"] = "nice@nice.org.uk";
        schema["authors"] = [author];

        var source = new Object();
        source["id"] = "bnf";
        source["name"] = "British National Formulary";
        source["description"] =
          "Aims to provide prescribers, pharmacists, and other healthcare professionals with sound up-to-date information about the use of medicines.";
        schema["source"] = source;

        schema["doi"] = curr_content.doi;
        schema["keywords"] = curr_content.link.rcSearchTerms[0].split(",");

        var content = new Object();
        content["id"] = new ObjectID();
        content["url"] = link;
        content["text"] = curr_content.body.split("\n");
        schema["content"] = content;

        //update docs on mongo
        let updateFilter = { directURL: link };
        let updateDoc = { $set: schema };
        let options = { upsert: true };

        await update(updateFilter, updateDoc, options);
      }
    } catch (error) {
      console.log(error);
      console.log("failed to get data");
    }
  } catch (error) {
    console.log(error);
    console.log("failed to connect to mongo");
  } finally {
    client.close();
  }
}

get_BNF(browse_url);
