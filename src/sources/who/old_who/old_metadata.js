// import useWindowDimensions from "react-native/Libraries/Utilities/useWindowDimensions";

class CSVExportLinkHandler {
  constructor() {
    this.metadataURL = null;
  }
  element(element) {
    this.metadataURL = element.getAttribute("href");
  }
}

const extractMetadataURL = async (id, document) => {
  const csvExportLinkHandler = new CSVExportLinkHandler();
  const htmlRewriter = new HTMLRewriter().on(
    'li#export-format > a[href*="format=csv"]',
    csvExportLinkHandler
  );
  await htmlRewriter.transform(document).text();
  if (csvExportLinkHandler.metadataURL === null) {
    throw new WHOMetadataError(id);
  }
  return new URL(csvExportLinkHandler.metadataURL);
};

const getMetadata = async (id, document) => {
  const metadataURL = await extractMetadataURL(id, document);
  const response = await fetch(metadataURL.toString());
  const metadata = csv(await response.text());
  if (metadata.length !== 1) {
    throw new WHOMetadataError(id);
  }
  return metadata[0];
};
