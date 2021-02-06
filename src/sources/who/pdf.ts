import { WHOPDFError } from "./errors";
class CitationPDFURLElementHandler {
  pdfURL: string | null = null;

  element(element: Element) {
    this.pdfURL = element.getAttribute("content");
  }
}

const extractPDFURL = async (id: string, document: Response): Promise<URL> => {
  const citationPdfURLElementHandler = new CitationPDFURLElementHandler();
  const htmlRewriter = new HTMLRewriter().on(
    'meta[name="citation_pdf_url"]',
    citationPdfURLElementHandler
  );
  await htmlRewriter.transform(document).text();
  if (citationPdfURLElementHandler.pdfURL === null) throw new WHOPDFError(id);

  return new URL(citationPdfURLElementHandler.pdfURL);
};

type PDF = {
  url: URL;
};

export const getPDF = async (id: string, document: Response): Promise<PDF> => {
  const pdfURL = await extractPDFURL(id, document);

  return {
    url: pdfURL,
  };
};
