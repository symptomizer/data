const { DocumentSource, Document, DocumentContent } = require("../schema.js");
const cheerio = require("cheerio");
const request = require("request");
const metadata = require("./metadata");
const fs = require("fs");
const mongo_pass = fs.readFileSync("../mongo_pass.txt");
const last_retrieved = fs.readFileSync("lastRetrieved.txt");
const rp = require("request-promise");

const MongoClient = require("mongodb").MongoClient;
const uri = `mongodb+srv://main_admin:${mongo_pass}@cluster1.xo9vl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

function setLastRetrieved() {
  // https://stackoverflow.com/questions/1531093/how-do-i-get-the-current-date-in-javascript
  let today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  const yyyy = today.getFullYear();

  let date = yyyy + "-" + mm + "-" + dd;

  fs.writeFile("lastRetrieved.txt", date, (err) => {
    // In case of a error throw err.
    if (err) throw err;
  });
}

class WHO extends DocumentSource {
  id = "who";
  name = "WHO IRIS";
  description =
    "World Health Organization Institutional Repository for Information Sharing";
  url = new URL("https://apps.who.int/iris/");

  retrieveWHOData = async () => {
    let getWHOData = async (uri, updateDB) => {
      const options = {
        uri: uri,
        transform: function (body) {
          return cheerio.load(body);
        },
      };
      function get_links($) {
        let links = [];
        $(".artifact-title").each((i, el) => {
          const link = $(el).find("a").attr("href");
          links.push(link);
        });
        return links;
      }
      try {
        const $ = await rp(options);
        const docLinks = await get_links($);
        // gets all the document links from main page
        // for each loop
        for (let i = 0; i < docLinks.length; i++) {
          let schema = new Document();
          schema.id = this.id;
          schema.url = this.url.toString();

          await metadata.getMetadata(docLinks[i], schema, updateDB);
        }
      } catch (e) {
        console.error("error:", e);
      }
    };

    try {
      //connect to database
      await client.connect();
      const database = client.db("document");
      const collection = database.collection("document");

      // update function
      async function updateDB(filter, updateDoc, options) {
        const result = await collection.updateOne(filter, updateDoc, options);
        console.log(
          `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`
        );
      }
      //TODO:initalise the database here
      // create an update function like in the nhs_data_proxy
      // call it updateDB
      //this function is passed in getWHOData and getMetadata

      for (let i = 3; i < 4; i++) {
        const baseurl =
          // rpp is results per page (loading 1000 should be okay)
          // offset should increase by i * rpp each iteration
          // do this up to total number docs
          "https://apps.who.int/iris/browse?rpp=5&offset=" +
          (i * 5).toString() +
          "&etal=-1&sort_by=1&type=title&starts_with_previous=&order=ASC";
        try {
          await getWHOData(baseurl);
        } catch (e) {
          console.log("error fetching WHO data");
          console.error(e);
        }
      }
    } catch (e) {
      console.log("error connecting to database");
      console.error(e);
    } finally {
      await client.close();
    }
  };
}

// Update the date files were last retrieved
setLastRetrieved();

let run = new WHO();
run.retrieveWHOData();
