const cheerio = require('cheerio');
const csv = require('csvtojson');
const request = require('request');
const {DocumentContent} = require('../schema');
const pdfparse = require('pdf-parse');
const fetch = require('node-fetch')
const ObjectID = require('bson').ObjectID;

const getMetadata = async (uri, schema) => {
     request('https://apps.who.int/iris/handle/10665/42125',
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
      }
    })
}

module.exports = {
  getMetadata: getMetadata()
}