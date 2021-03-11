const { DocumentSource, Document, DocumentContent } = require("../schema.js");
const cheerio = require("cheerio");
const request = require("request");
const metadata = require("./metadata");
const rp = require("request-promise");
//TODO: add mongo db stuff here

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
      // TODO: close database here
    }
  };
}

let test = new WHO();
test.retrieveWHOData();
