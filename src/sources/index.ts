export type JournalReference = {
  title?: string;
  volume?: string;
  issue?: string;
  start?: string;
  end?: string;
};

export type DocumentContent = {
  id: string;
  url: URL;
  text: string;
};

export enum DocumentType {
  GUIDANCE = "GUIDANCE",
  OVERVIEW = "OVERVIEW",
  PUBLICATION = "PUBLICATION",
  BOOK = "BOOK",
  ADMINISTRATION = "ADMINISTRATION",
  OTHER = "OTHER",
  UNKNOWN = "UNKNOWN",
}

interface IDocument {
  id: string;
  url: URL;
  directURL: URL;
  title: string;
  alternateTitle?: string;
  fileName?: string;
  authors?: string[];
  datePublished?: Date;
  dateReviewed?: Date;
  dateModified?: Date;
  dateIndexed: Date;
  keywords?: string[];
  description: string;
  alternateDescription?: string;
  imageURLs?: URL[];
  isbn?: string;
  issn?: string;
  doi?: string;
  pubMedID?: string;
  pmcID?: string;
  relatedDocuments?: string[]; // IDs of other documents
  journalReference?: JournalReference;
  meshHeadings?: string[];
  meshQualifiers?: string[];
  publisher?: string;
  rights?: string;
  content: DocumentContent[];
  type: DocumentType;
  source: DocumentSource;
}

export class Document implements IDocument {
  id: string;
  url: URL;
  directURL: URL;
  title: string;
  alternateTitle?: string;
  fileName?: string;
  authors?: string[];
  datePublished?: Date;
  dateReviewed?: Date;
  dateModified?: Date;
  dateIndexed: Date;
  keywords?: string[];
  description: string;
  alternateDescription?: string;
  imageURLs?: URL[];
  isbn?: string;
  issn?: string;
  doi?: string;
  pubMedID?: string;
  pmcID?: string;
  relatedDocuments?: string[]; // IDs of other documents
  journalReference?: JournalReference;
  meshHeadings?: string[];
  meshQualifiers?: string[];
  publisher?: string;
  rights?: string;
  content: DocumentContent[];
  type: DocumentType;
  source: DocumentSource;

  constructor({
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
  }: IDocument) {
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
  }
}

export class NotFoundError extends Error {
  constructor(id: string) {
    super(`Document Not Found: ${id}`);
    this.name = "NotFoundError";
  }
}

export abstract class DocumentSource {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract url: URL;

  abstract getDocument(id: string): Promise<Document>;
  // abstract getDocumentsModifiedAfter(
  //   dateTime: Date
  // ): Promise<{ isComplete: boolean; documents: Document[] }>;
}
