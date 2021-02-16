// used in Document Schema
let DocumentContent = {
    // currently saved as page url
    id: this.id,
    url: this.url,
    // array of strings text[0] is the header of the section (if it exists, empty string if not)
    text: this.text,
}

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
        document
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
    }
}
class DocumentSource{
    // class with information about NHS API (document sources)
    constructor(id, name, description, url) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.url = url;
        // if (typeof id === "string"){
        //     this.id = id;
        // } else {
        //     throw new TypeError("id must be a string");
        // }
        // if (typeof name === "string"){
        //     this.name = name;
        // } else {
        //     throw new TypeError("name must be a string");
        // }
        // if (typeof description === "string") {
        //     this.description = description;
        // } else {
        //     throw new TypeError("description must be a string");
        // }
        // if (typeof url === "object"){
        //     this.url = url;
        // } else {
        //     throw new TypeError("description must be a string");
        // }

        // function getDocument(id){
        //     return new Promise(((resolve, reject) => {
        //     }));
        // }
        if(new.target === DocumentSource) {
            throw new TypeError("Cannot construct DocumentSource instances directly");
        }
    }
}

exports.DocumentContent = DocumentContent;
exports.Document = Document;
exports.DocumentSource = DocumentSource;
//
// class Test {
//     constructor(car, id) {
//         this.car = car;
//         this.id = id;
//     }
// }
//
// let tester = new Test();
// tester.car = "hi";
// console.log(tester.car);
// console.log(tester.id);
// console.log("hi");

