import { DocumentSource, Document, DocumentType, NotFoundError } from "..";
import { getMetadata, Metadata } from "./metadata";
import { getPDF } from "./pdf";

const mapType = (type: Metadata["Type"]): DocumentType => {
  switch (type) {
    case "Publications":
    case "Journal / periodical articles":
    case "Technical documents":
      return DocumentType.PUBLICATION;
    case "Book":
      return DocumentType.BOOK;
    case "Governing body documents":
    case "Meeting reports":
    case "Staff speeches & WR speeches":
      return DocumentType.ADMINISTRATION;
    case "Other":
      return DocumentType.OTHER;
    default:
      return DocumentType.UNKNOWN;
  }
};

export class WHO extends DocumentSource {
  id = "who";
  name = "WHO IRIS";
  description =
    "World Health Organization Institutional Repository for Information Sharing";
  url = new URL("https://apps.who.int/iris/");

  async getDocument(id: string): Promise<Document> {
    const documentURL = new URL(id);
    const documentResponse = await fetch(documentURL.toString());
    if (documentResponse.status === 404) throw new NotFoundError(id);

    const { url: pdfURL } = await getPDF(id, documentResponse.clone());
    const metadata = await getMetadata(id, documentResponse.clone());

    const date = new Date(metadata.Date);

    return new Document({
      id,
      url: documentURL,
      directURL: pdfURL,
      title: metadata.Title,
      alternateTitle: metadata["Variant title"],
      // fileName: pdf,
      authors: (metadata["Authors"] || "").split("||"),
      datePublished: date,
      // dateReviewed
      dateModified: date,
      dateIndexed: new Date(),
      keywords: (metadata["Subject or keywords"] || "").split("||"),
      description: metadata.Abstract,
      alternateDescription: metadata.Description,
      // imageURLs: []
      isbn: metadata["dc.identifier.isbn"],
      issn: metadata["dc.identifier.issn"],
      doi: metadata["dc.identifier.doi"],
      pubMedID: metadata["dc.identifier.pubmed"],
      pmcID: metadata["dc.identifier.pmc"],
      // relatedDocuments:
      journalReference: {
        title: metadata["Journal title"],
        volume: metadata["Journal volume"],
        issue: metadata["Journal issue"],
        start: metadata["Journal start page"],
        end: metadata["Journal end page"],
      },
      meshHeadings: (metadata["MeSH Headings"] || "")
        .split("::")
        .join("||")
        .split("||"),
      meshQualifiers: (metadata["MeSH qualifiers"] || "")
        .split("::")
        .join("||")
        .split("||"),
      publisher: metadata.Publisher,
      rights: metadata.Rights,
      content: [],
      type: mapType(metadata.Type),
      source: this,
    });
  }

  // getDocumentsModifiedAfter = () => {};
}
