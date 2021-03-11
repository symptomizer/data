const { DocumentSource, Document, DocumentContent } = require("../schema.js");
const cheerio = require("cheerio");
const request = require("request");
const metadata = require("./metadata");
const rp = require("request-promise");

class WHO extends DocumentSource {
  id = "who";
  name = "WHO IRIS";
  description =
    "World Health Organization Institutional Repository for Information Sharing";
  url = new URL("https://apps.who.int/iris/");

  retrieveWHOData = async () => {
    for (let i = 0; i < 5; i++) {
      const baseurl =
        "https://apps.who.int/iris/browse?rpp=2&offset=" +
        (i * 2).toString() +
        "&etal=-1&value_lang=en&sort_by=1&type=title&starts_with_previous=&order=ASC";
      let getWHOData = async (uri) => {
        const options = {
          uri: uri,
          transform: function (body) {
            return cheerio.load(body);
          },
        };
        function get_links($) {
          let links = [];
          $(".artifact-title").each((i, el) => {
            $(el).text();
            const link = $(el).find("a").attr("href");
            links.push(link);
          });
          return links;
        }
        try {
          const $ = await rp(options);
          const docLinks = await get_links($);
          // gets all the document links from main page
          for (let i = 0; i < docLinks.length; i++) {
            let schema = new Document();
            await metadata.getMetadata(docLinks[i], schema);
          }
        } catch (e) {
          console.error("error:", e);
        }
      };
      try {
        await getWHOData(baseurl);
      } catch (e) {
        console.log("error fetching WHO data");
        console.error(e);
      }
    }
  };
}

let test = new WHO();
test.retrieveWHOData();
