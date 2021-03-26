const fetch = require("node-fetch");
const request = require("request-promise");
const fs = require("fs");
const mongo_pass = fs.readFileSync("../mongo_pass.txt");
const ObjectID = require("bson").ObjectID;

const MongoClient = require("mongodb").MongoClient;
const uri = `mongodb+srv://main_admin:${mongo_pass}@cluster1.xo9vl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const play_session =
  "eyJhbGciOiJIUzI1NiJ9.eyJkYXRhIjp7InBhYzRqU2Vzc2lvbklkIjoiMTYyOTE1M2EtNjE2Yy00ODA3LTllNTQtNTcwZGVjNjI5ZjNlIn0sIm5iZiI6MTYxNjc3NjMxMCwiaWF0IjoxNjE2Nzc2MzEwfQ.06eyXaRGrlTnUWNyC5rfK08j76XylyTWUr8-v7KlHUo";
// const _starUuid = "d2fcb50f-7820-4dc1-a960-019e6d964ab1";
// const STAR_COUNTER_SESSION = "0485b89aI3d50I4db2Ib0bdI90bef78088b8";
// const MC_ANALYTICS = "UA-9959526-4";
// const MC_TICKET = "61f8a3df-ecec-442a-bcb2-058f27f3b0a9";

const browse_url =
  "https://www.medicinescomplete.com/api/browse/bnf/drugs/name-";

const opts = {
  headers: {
    cookie: `PLAY_SESSION=${play_session}`,
  },
};

const get_BNF = async (url) => {
  try {
    //connect to database
    await client.connect();
    const database = client.db("document");
    const collection = database.collection("document");
    const options = { upsert: true };

    // update function
    async function update(filter, updateDoc, options) {
      const result = await collection.updateOne(filter, updateDoc, options);
      console.log(
        `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`
      );
    }
    try {
      // const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
      const alphabet = ["A"];

      const all_links = new Object();

      for (var l = 0; l < alphabet.length; l++) {
        var letter = alphabet[l];

        var actual_url = url + letter;
        const response = await fetch(actual_url, opts);
        const json = await response.json();
        const content_url =
          "https://www.medicinescomplete.com/api/content/bnf/";

        var all_children = json.listChildren;

        for (var i = 0; i < all_children.length; i++) {
          var curr_page = all_children[i].link;
          all_links[curr_page.title] = content_url + curr_page.id;
        }
      }

      console.log("retrieved all initial links");

      getData(all_links);
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.log(error);
    console.log("failed to connect to mongo");
  } finally {
    await client.close();
  }
};

async function getData(all_links) {
  try {
    for (const [title, link] of Object.entries(all_links)) {
      const response = await fetch(link, opts);
      const json = await response.json();
      console.log(json);
      const curr_content = json.contentResponse;

      const schema = new Object();

      schema["url"] = "https://bnf.nice.org.uk/drugs";
      schema["directUrl"] = link;
      schema["title"] = title;
      schema["type"] = "PUBLICATION";
      schema["language"] = "en";
      schema["rights"] = "Medicines Complete";
      schema["dateIndexed"] = new Date();
      schema["authors"] = ["National Institute for Health and Care Excellence"];

      var source = new Object();
      source["id"] = "bnf";
      source["name"] = "British National Formulary";
      source["description"] =
        "Aims to provide prescribers, pharmacists, and other healthcare professionals with sound up-to-date information about the use of medicines.";
      schema["source"] = source;

      schema["doi"] = curr_content.doi;
      schema["keywords"] = curr_content.link.rcSearchTerms[0].split(",");

      var relatedDocuments = new Object();

      console.log(curr_content.body);
    }
  } catch (error) {
    console.log(error);
    console.log("failed to get data");
  }
}

get_BNF(browse_url);
