const { DocumentSource, Document , DocumentContent} = require("../schema.js");
const cheerio = require('cheerio');
const request = require('request');
const csv = require('csvtojson');
const pdfparse = require('pdf-parse');
const fetch = require('node-fetch')
const ObjectID = require('bson').ObjectID;

class WHO extends DocumentSource {
  id = "who";
  name = "WHO IRIS"
  description =
    "World Health Organization Institutional Repository for Information Sharing";
  url = new URL("https://apps.who.int/iris/");

  retrieveWHOData = async () => {

    let getMetadata = async (url, schema) => {
      const uri = 'https://apps.who.int' + url;
      request(uri,
        async (error, response, html) => {
          if (!error && response.statusCode === 200) {
            const $ = cheerio.load(html);
            // let schema = new Document();

            // get csv
            const csvURL = $('.export-format').find('a').attr('href');
            const jsonarray = await csv().fromStream(request.get(csvURL));
            const metadata = jsonarray[0];

            function metadata2schema (metadata) {
              const mapType = () => {
                switch (metadata['Type']) {
                  case "Publications":
                  case "Journal / periodical articles":
                  case "Technical documents":
                    return 'PUBLICATION';
                  case "Book":
                    return 'BOOK';
                  case "Governing body documents":
                  case "Meeting reports":
                  case "Staff speeches & WR speeches":
                    return 'ADMINISTRATION';
                  case "Other":
                    return 'OTHER';
                  default:
                    return 'UNKNOWN';
                }
              }
              schema.id = metadata['id'];
              schema.url = uri;
              schema.directURL = csvURL;
              schema.title = metadata['Title'];
              schema.authors = metadata['Authors'].split('||');
              schema.alternateTitle = metadata["Variant title"];
              schema.datePublished = metadata['Date'];
              schema.dateReviewed = new Date(metadata.dc.date.accessioned);
              schema.dateIndexed = new Date();
              schema.keywords = (metadata["Subject or keywords"] || "").split("||");
              schema.description = metadata.Abstract;
              schema.alternateDescription = (metadata.Description).split('||');
              schema.isbn = metadata.dc.identifier.isbn;
              schema.issn = metadata.dc.identifier.issn;
              schema.doi = metadata.dc.identifier.doi;
              schema.pubMedID = metadata.dc.identifier.pubmed;
              schema.pmcID = metadata.dc.identifier.pmc;
              schema.journalReference = {
                title: metadata["Journal title"],
                volume: metadata["Journal volume"],
                issue: metadata["Journal issue"],
                start: metadata["Journal start page"],
                end: metadata["Journal end page"],
              }
              schema.meshHeadings = (metadata["MeSH Headings"] || "")
                .split("::")
                .join("||")
                .split("||")
              schema.meshQualifiers = (metadata["MeSH qualifiers"] || "")
                .split("::")
                .join("||")
                .split("||")
              schema.publisher = metadata['Publisher'].split('||');
              schema.rights = metadata['Rights'];
              schema.type = mapType();
            }
            metadata2schema(metadata)
            DocumentContent.id = new ObjectID();
            const pdfURL = $('.item-page-field-wrapper').find('a').attr('href');
            const full_pdfURL = "https://apps.who.int" + pdfURL;
            DocumentContent.url = full_pdfURL;
            const response = await fetch(full_pdfURL)
            const pdfFile = await response.arrayBuffer();
            const data = await pdfparse(pdfFile);
            DocumentContent.text = [data.text];
            schema.document = DocumentContent;
            schema.content = DocumentContent.text;
            console.log(schema)
          } else{
            console.error('error', error)
          }
        })
    }

    const baseurl = "https://apps.who.int/iris/browse?rpp=40&offset=20&etal=-1&value_lang=en&sort_by=1&type=title&starts_with_previous=&order=ASC";
    let getWHOLinks = async (uri) => {
      request(uri,
        async (error, response, html) => {

          if(!error && response.statusCode === 200) {
            const $ = cheerio.load(html);
            // const siteDocs = $('#aspect_artifactbrowser_ConfigurableBrowse_div_browse-by-title-results');

            // gets all the document links from main page
            function get_links () {
              let links = [];
              $('.artifact-title').each((i, el) => {
                const item = $(el).text();
                const link = $(el).find('a').attr('href')
                links.push(link);
              })
              return links;
            }
            const docLinks = get_links();
            console.log(docLinks.length)
            let schema = new Document();
            schema.id = this.id;
            schema.url = this.url;
            for (const link of docLinks) {
              try {
                 getMetadata(link, schema);
              } catch (e) {
                console.error(e);
              }
            }
          } else {
            console.error(error);
            throw Error(error);
          }
        })
    }
    getWHOLinks(baseurl)
  }
}

let test = new WHO();
test.retrieveWHOData()
// request(
//   'https://apps.who.int/iris/browse?rpp=2&offset=0&etal=-1&value_lang=en&sort_by=1&type=title&starts_with_previous=&order=ASC',
//   (error, response, html) => {
//     if(!error && response.statusCode === 200) {
//       const $ = cheerio.load(html);
//
//       const siteDocs = $('#aspect_artifactbrowser_ConfigurableBrowse_div_browse-by-title-results');
//       // const siteLinks = $('.artifact-title').html()
//       // console.log(siteLinks);
//       function get_links () {
//         let links = [];
//         let names = []
//         $('.artifact-title').each((i, el) => {
//           const item = $(el).text();
//           const link = $(el).find('a').attr('href')
//           links.push(link);
//           names.push(item);
//           console.log(item);
//           console.log(link);
//         })
//         console.log(links);
//       }
//
//       get_links()
//     }
//   });


