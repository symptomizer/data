const cheerio = require("cheerio");
const csv = require("csvtojson");
const request = require("request");
const { DocumentContent, Document } = require("../schema");
const pdfparse = require("pdf-parse");
const fetch = require("node-fetch");
const ObjectID = require("bson").ObjectID;
const rp = require("request-promise");
const utf8 = require("utf8");

async function getMetadata(uri, schema, updateDB) {
  const base_url = "https://apps.who.int";
  const options = {
    uri: base_url + uri,
    transform: function (body) {
      return cheerio.load(body);
    },
  };
  function metadata2schema(metadata, csvURL) {
    const mapType = () => {
      switch (metadata["Type"]) {
        case "Publications":
        case "Journal / periodical articles":
        case "Technical documents":
          return "PUBLICATION";
        case "Book":
          return "BOOK";
        case "Governing body documents":
        case "Meeting reports":
        case "Staff speeches & WR speeches":
          return "ADMINISTRATION";
        case "Other":
          return "OTHER";
        default:
          return "UNKNOWN";
      }
    };
    schema.id = metadata["id"];
    schema.url = uri;
    schema.directURL = csvURL;
    schema.title = metadata["Title"];
    if (metadata["Authors"] !== undefined) {
      schema.authors = metadata["Authors"].split("||");
    }
    schema.alternateTitle = metadata["Variant title"];
    schema.datePublished = metadata["Date"];
    schema.dateReviewed = new Date(metadata.dc.date.accessioned);
    schema.dateIndexed = new Date();
    if (metadata["Subject or keywords"] !== undefined) {
      schema.keywords = (metadata["Subject or keywords"] || "").split("||");
    }
    schema.description = metadata.Abstract;
    if (metadata.Description !== undefined) {
      schema.alternateDescription = metadata.Description.split("||");
    }
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
    };
    if (metadata["MeSH Headings"] !== undefined) {
      schema.meshHeadings = (metadata["MeSH Headings"] || "")
        .split("::")
        .join("||")
        .split("||");
    }
    if (metadata["MeSH qualifiers"] !== undefined) {
      schema.meshQualifiers = (metadata["MeSH qualifiers"] || "")
        .split("::")
        .join("||")
        .split("||");
    }
    if (metadata["Publisher"] !== undefined) {
      schema.publisher = metadata["Publisher"].split("||");
    }
    schema.rights = metadata["Rights"];
    if (metadata["Language"] !== undefined) {
      schema.language = metadata["Language"].split("||");
    }
    schema.type = mapType();
  }

  try {
    const $ = await rp(options);
    const csvURL = $(".export-format").find("a").attr("href");
    const jsonarray = await csv().fromStream(request.get(csvURL));
    const metadata = jsonarray[0];
    metadata2schema(metadata, csvURL);
    DocumentContent.id = new ObjectID();
    const pdfURL = $(".item-page-field-wrapper").find("a").attr("href");
    if (pdfURL !== undefined) {
      const full_pdfURL = "https://apps.who.int" + pdfURL;
      DocumentContent.url = full_pdfURL;
      const response = await fetch(full_pdfURL);
      const pdfFile = await response.arrayBuffer();
      const data = await pdfparse(pdfFile);
      DocumentContent.text = [utf8.encode(data.text)];
      schema.document = DocumentContent;
      schema.content = DocumentContent.text;
    }
    const related_items = [];
    $("#aspect_discovery_RelatedItems_div_item-related").each((i, el) => {
      let relatedLink = $(el).find("a").attr("href");
      related_items.push(base_url + relatedLink);
      schema.relatedDocuments = related_items;
    });
    //TODO: use update function here
    console.log(schema);
  } catch (e) {
    console.error("error:", e);
  }
}
// getMetadata('/iris/handle/10665/39365', new Document())
module.exports = { getMetadata };
