const cheerio = require("cheerio");
const csv = require("csvtojson");
const request = require("request");
const { DocumentContent, Document } = require("../schema");
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

  /* The object "set" stores the final field:value pairs that will be written to mongo,
     meaning it will ignore any null fields instead of writing them to mongo as null */

  const set = new Object();
  const source = new Object();
  source["id"] = "who_iris";
  source["name"] = "WHO IRIS";
  source["description"] =
    "World Health Organization's Institutional Repository for Information Sharing";
  set["source"] = source;

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
    schema.url = base_url + uri;
    set["url"] = schema.url.toString();
    schema.directURL = csvURL;
    set["directURL"] = schema.directURL.toString();
    schema.title = metadata["Title"];
    set["title"] = utf8.encode(schema.title);

    if (metadata["Authors"] !== undefined) {
      var authors = [];
      var authorNames = removeDupes(metadata["Authors"].split("||"));

      for (var i = 0; i < authorNames.length; i++) {
        var curr_author = new Object();
        curr_author["name"] = utf8.encode(authorNames[i]);
        curr_author["email"] = "";
        curr_author["url"] = "";

        authors.push(curr_author);
      }

      schema.authors = authors;
      set["authors"] = schema.authors;
    }
    if (metadata["Variant title"] !== undefined) {
      schema.alternateTitle = metadata["Variant title"];
      set["alternateTitle"] = [utf8.encode(schema.alternateTitle)];
    }
    if (metadata["Date"] !== undefined) {
      schema.datePublished = metadata["Date"];
      set["datePublished"] = new Date(schema.datePublished);
    }
    if (metadata.dc.date.accessioned !== undefined) {
      schema.dateReviewed = new Date(metadata.dc.date.accessioned);
      set["dateReviewed"] = schema.dateReviewed;
    }
    schema.dateIndexed = new Date();
    set["dateIndexed"] = schema.dateIndexed;

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
      set["keywords"] = utf8_keywords;
    }

    var desc = "";

    if (metadata.Description !== undefined) {
      var descs = metadata.Description.split("||");
      desc = utf8.encode(descs.join(" "));
    }

    if (metadata.Abstract !== undefined) {
      schema.description = utf8.encode(metadata.Abstract);
      set["description"] = schema.description;
      if (metadata.Description !== undefined) {
        schema.alternateDescription = desc;
        set["alternateDescription"] = schema.alternateDescription;
      }
    } else if (metadata.Description !== undefined) {
      schema.description = desc;
      set["description"] = schema.description;
    }

    schema.isbn = metadata.dc.identifier.isbn;
    if (schema.isbn !== undefined) {
      set["isbn"] = schema.isbn;
    }

    schema.issn = metadata.dc.identifier.issn;
    if (schema.issn !== undefined) {
      set["issn"] = schema.issn;
    }

    schema.doi = metadata.dc.identifier.doi;
    if (schema.doi !== undefined) {
      set["doi"] = schema.doi;
    }

    schema.pubMedID = metadata.dc.identifier.pubmed;
    if (schema.pubMedID !== undefined) {
      set["pubMedID"] = schema.pubMedID;
    }

    schema.pmcID = metadata.dc.identifier.pmc;
    if (schema.pmcID !== undefined) {
      set["pmcID"] = schema.pmcID;
    }

    if (metadata["Journal title"] !== undefined) {
      schema.journalReference = {
        title: utf8.encode(metadata["Journal title"]),
        volume: utf8.encode(metadata["Journal volume"]),
        issue: utf8.encode(metadata["Journal issue"]),
        start: utf8.encode(metadata["Journal start page"]),
        end: utf8.encode(metadata["Journal end page"]),
      };
      set["journalReference"] = schema.journalReference;
    }

    if (metadata["MeSH Headings"] !== undefined) {
      schema.meshHeadings = removeDupes(
        (metadata["MeSH Headings"] || "").split("::").join("||").split("||")
      );
      set["meshHeadings"] = schema.meshHeadings;
    }
    if (metadata["MeSH qualifiers"] !== undefined) {
      schema.meshQualifiers = removeDupes(
        (metadata["MeSH qualifiers"] || "").split("::").join("||").split("||")
      );
      set["meshQualifiers"] = schema.meshQualifiers;
    }
    if (metadata["Publisher"] !== undefined) {
      schema.publisher = removeDupes(metadata["Publisher"].split("||"));
      set["publisher"] = utf8.encode(schema.publisher.join(" and "));
    }
    if (metadata["Rights"] !== undefined) {
      schema.rights = utf8.encode(metadata["Rights"]);
      set["rights"] = schema.rights;
    }

    if (metadata["Language"] !== undefined) {
      schema.language = metadata["Language"].split("||")[0];
      set["language"] = utf8.encode(schema.language);
    }
    schema.type = mapType();
    set["type"] = schema.type;
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
      var thumbnail = new Object();

      // Add filename to schema.fileName
      const fn = $(".item-page-field-wrapper").find("a").text();
      schema.fileName = utf8.encode(fn);
      set["fileName"] = schema.fileName;

      // Add pdf thumbnail to schema.imageURLs
      const pdf_img = $(".thumbnail").find("img").attr("src");
      const pdf_alt = $(".thumbnail").find("img").attr("alt");

      thumbnail["url"] = pdf_img;
      thumbnail["description"] = utf8.encode(pdf_alt);
      if (set["publisher"] !== undefined) {
        thumbnail["provider"] = set["publisher"];
      } else {
        thumbnail["provider"] = "";
      }
      thumbnail["license"] = "";
      schema.imageURLs = [thumbnail];
      set["imageURLs"] = schema.imageURLs;

      const full_pdfURL = "https://apps.who.int" + pdfURL;
      DocumentContent.url = full_pdfURL;
      const response = await fetch(full_pdfURL);
      const pdfFile = await response.arrayBuffer();
      const data = await pdfparse(pdfFile);
      DocumentContent.text = [utf8.encode(data.text)];
      schema.document = DocumentContent;
      schema.content = DocumentContent.text;

      var content = new Object();
      content["id"] = DocumentContent.id;
      content["url"] = DocumentContent.url;
      content["text"] = DocumentContent.text;

      set["content"] = content;
    }
    const related_items = [];
    $("#aspect_discovery_RelatedItems_div_item-related").each((i, el) => {
      let relatedLink = $(el).find("a").attr("href");
      let relatedName = $(el).find("a").text();

      if (relatedLink !== undefined) {
        var current_related_doc = new Object();
        current_related_doc["url"] = base_url + relatedLink;
        current_related_doc["name"] = utf8.encode(relatedName);
        related_items.push(current_related_doc);
      }
    });

    if (related_items.length !== 0) {
      schema.relatedDocuments = related_items;
      set["relatedDocuments"] = schema.relatedDocuments;
    }
    //update docs on mongo
    let updateFilter = { directURL: schema.directURL };
    let updateDoc = { $set: set };
    await updateDB(updateFilter, updateDoc, { upsert: true });
    console.log(set);
  } catch (e) {
    console.error("error:", e);
  }
}
// getMetadata('/iris/handle/10665/39365', new Document())
module.exports = { getMetadata };
