const cheerio = require("cheerio");
const csv = require("csvtojson");
const request = require("request");
const { DocumentContent, Document, Thumbnail } = require("../schema");
const pdfparse = require("pdf-parse");
const fetch = require("node-fetch");
const ObjectID = require("bson").ObjectID;
const rp = require("request-promise");
const utf8 = require("utf8");

function removeDupes(list) {
  let unique = {};
  list.forEach(function (i) {
    if (!unique[i]) {
      unique[i] = true;
    }
  });
  return Object.keys(unique);
}

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
      var authors = [];
      var authorNames = removeDupes(metadata["Authors"].split("||"));

      for (var i = 0; i < authorNames.length; i++) {
        var curr_author = new Object();
        curr_author["name"] = authorNames[i];
        curr_author["email"] = "";
        curr_author["url"] = "";

        authors.push(curr_author);
      }

      schema.authors = authors;
    }
    if (metadata["Variant title"] != undefined) {
      schema.alternateTitle = [metadata["Variant title"]];
    }
    schema.datePublished = metadata["Date"];
    schema.dateReviewed = new Date(metadata.dc.date.accessioned);
    schema.dateIndexed = new Date();

    // Remove duplicates from keywords and ensure every word is utf8 encoded
    if (metadata["Subject or keywords"] !== undefined) {
      var keywords = removeDupes(
        (metadata["Subject or keywords"] || "").split("||")
      );
      var utf8_keywords = [];
      keywords.forEach(function (e) {
        utf8_keywords.push(utf8.encode(e));
      });
      schema.keywords = utf8_keywords;
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
    if (metadata["Journal title"] !== undefined) {
      schema.journalReference = {
        title: utf8.encode(metadata["Journal title"]),
        volume: utf8.encode(metadata["Journal volume"]),
        issue: utf8.encode(metadata["Journal issue"]),
        start: utf8.encode(metadata["Journal start page"]),
        end: utf8.encode(metadata["Journal end page"]),
      };
    } else {
      schema.journalReference = {};
    }

    if (metadata["MeSH Headings"] !== undefined) {
      schema.meshHeadings = removeDupes(
        (metadata["MeSH Headings"] || "").split("::").join("||").split("||")
      );
    }
    if (metadata["MeSH qualifiers"] !== undefined) {
      schema.meshQualifiers = removeDupes(
        (metadata["MeSH qualifiers"] || "").split("::").join("||").split("||")
      );
    }
    if (metadata["Publisher"] !== undefined) {
      schema.publisher = metadata["Publisher"].split("||");
    }
    if (metadata["Rights"] !== undefined) {
      schema.rights = utf8.encode(metadata["Rights"]);
    } else {
      schema.rights = "";
    }

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
      // Add filename to schema.fileName
      const fn = $(".item-page-field-wrapper").find("a").attr("#text");
      schema.fileName = fn;

      // Add pdf thumbnail to schema.imageURLs
      const pdf_img = $(".thumbnail").find("img").attr("src");
      const pdf_alt = $(".thumbnail").find("img").attr("alt");

      Thumbnail.url = pdf_img;
      Thumbnail.description = pdf_alt;
      if (schema.publisher !== undefined) {
        Thumbnail.provider = schema.publisher;
      } else {
        Thumbnail.provider = "";
      }
      Thumbnail.license = "";
      schema.imageURLs = Thumbnail;

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
      let relatedName = $(el).find("a").attr("#text");

      if (relatedLink !== undefined) {
        var current_related_doc = new Object();
        current_related_doc["url"] = base_url + relatedLink;
        current_related_doc["name"] = utf8.encode(relatedName);
        related_items.push(current_related_doc);
      }
    });

    schema.relatedDocuments = removeDupes(related_items);

    //update docs on mongo
    let updateFilter = { directURL: schema.directURL };
    let updateDoc = {
      $set: {
        url: schema.url.toString(),
        directURL: schema.directURL.toString(),
        title: utf8.encode(schema.title),
        alternateTitle: utf8.encode(alternateTitle),
        fileName: utf8.encode(schema.fileName),
        authors: schema.authors,
        datePublished: new Date(schema.datePublished),
        dateReviewed: schema.dateReviewed,
        dateIndexed: new Date(),
        keywords: schema.keywords,
        description: schema.description,
        imageURLs: schema.imageURLs,
        isbn: schema.isbn,
        issn: schema.issn,
        doi: schema.doi,
        pubMedID: schema.pubMedID,
        pmcID: schema.pmcID,
        relatedDocuments: schema.relatedDocuments,
        journalReference: schema.journalReference,
        rights: schema.rights,
        language: schema.language,
        content: {
          id: DocumentContent.id,
          url: DocumentContent.url,
          text: DocumentContent.text,
        },
        type: schema.type,
        source: {
          id: "who_iris",
          name: "WHO IRIS",
          description:
            "World Health Organization's Institutional Repository for Information Sharing",
        },
      },
    };
    await updateDB(updateFilter, updateDoc, { upsert: true });
    console.log(schema);
  } catch (e) {
    console.error("error:", e);
  }
}
// getMetadata('/iris/handle/10665/39365', new Document())
module.exports = { getMetadata };
