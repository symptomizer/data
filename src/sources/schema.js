// used in content
let DocumentContent = {
  // currently saved as page url
  id: this.id,
  url: this.url,
  // array of strings text[0] is the header of the section (if it exists, empty string if not)
  text: this.text,
};

// used in imgageURLS for WHO
let Thumbnail = {
  url: this.url,
  description: this.description,
  provider: this.provider,
  license: this.license,
};

class Document {
  // schema
  constructor(
    id,
    url,
    directURL,
    title,
    alternateTitle,
    fileName,
    authors,
    datePublished,
    dateReviewed,
    dateModified,
    dateIndexed,
    keywords,
    description,
    alternateDescription,
    imageURLs,
    isbn,
    issn,
    doi,
    pubMedID,
    pmcID,
    relatedDocuments,
    journalReference,
    meshHeadings,
    meshQualifiers,
    publisher,
    rights,
    content,
    type,
    source,
    document,
    language
  ) {
    this.id = id;
    this.url = url;
    this.directURL = directURL;
    this.title = title;
    this.alternateTitle = alternateTitle;
    this.fileName = fileName;
    this.authors = authors;
    this.datePublished = datePublished;
    this.dateReviewed = dateReviewed;
    this.dateModified = dateModified;
    this.dateIndexed = dateIndexed;
    this.keywords = keywords;
    this.description = description;
    this.alternateDescription = alternateDescription;
    this.imageURLs = imageURLs;
    this.isbn = isbn;
    this.issn = issn;
    this.doi = doi;
    this.pubMedID = pubMedID;
    this.pmcID = pmcID;
    this.relatedDocuments = relatedDocuments;
    this.journalReference = journalReference;
    this.meshHeadings = meshHeadings;
    this.meshQualifiers = meshQualifiers;
    this.publisher = publisher;
    this.rights = rights;
    this.content = content;
    this.type = type;
    this.source = source;
    this.document = document;
    this.language = language;
  }
}
class DocumentSource {
  constructor(id, name, description, url) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.url = url;
    if (new.target === DocumentSource) {
      throw new TypeError("Cannot construct DocumentSource instances directly");
    }
  }
}

exports.DocumentContent = DocumentContent;
exports.Document = Document;
exports.DocumentSource = DocumentSource;
