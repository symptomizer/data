import { csv } from "../../utils/csv";
import { WHOMetadataError } from "./errors";

class CSVExportLinkHandler {
  metadataURL: string | null = null;

  element(element: Element) {
    this.metadataURL = element.getAttribute("href");
  }
}

const extractMetadataURL = async (
  id: string,
  document: Response
): Promise<URL> => {
  const csvExportLinkHandler = new CSVExportLinkHandler();
  const htmlRewriter = new HTMLRewriter().on(
    'li#export-format > a[href*="format=csv"]',
    csvExportLinkHandler
  );
  await htmlRewriter.transform(document).text();
  return new URL(
    "https://apps.who.int/iris/discover/export?format=csv&singleItemid=343690&handle=10665/339053"
  );
  if (csvExportLinkHandler.metadataURL === null) throw new WHOMetadataError(id);

  // return new URL(csvExportLinkHandler.metadataURL);
};

export type Metadata = {
  id: string;
  collection: string;
  Abstract: string;
  Authors: string;
  "Country code": string;
  Date: string;
  Description: string;
  "Journal end page": string;
  "Journal issue": string;
  "Journal start page": string;
  "Journal title": string;
  "Journal volume": string;
  Language: string;
  "Link to other languages": string;
  "MeSH Headings": string;
  "MeSH qualifiers": string;
  "Publication place": string;
  Publisher: string;
  Relation: string;
  Rights: string;
  "Rights holder": string;
  "Rights uri": string;
  "Series title and number": string;
  "Subject or keywords": string;
  Title: string;
  Type: string;
  "Variant title": string;
  "dc.date.accessioned": string;
  "dc.date.available": string;
  "dc.date.issuedOnline": string;
  "dc.identifier.doi": string;
  "dc.identifier.govdoc": string;
  "dc.identifier.isbn": string;
  "dc.identifier.issn": string;
  "dc.identifier.other": string;
  "dc.identifier.pmc": string;
  "dc.identifier.pubmed": string;
  "dc.identifier.uri": string;
  "wpro.contributor.coauthor": string;
};

export const getMetadata = async (
  id: string,
  document: Response
): Promise<Metadata> => {
  const metadataURL = await extractMetadataURL(id, document);
  const response = await fetch(metadataURL.toString());
  const metadata = csv(await response.text());
  if (metadata.length !== 1) throw new WHOMetadataError(id);
  return metadata[0] as Metadata;
};
