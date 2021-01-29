import { ONE_WEEK } from "./constants";

class CitationPDFURLElementHandler {
  pdfURL?: string;

  element(element: Element) {
    this.pdfURL = element.getAttribute("content") || undefined;
  }
}

const extractPDFURL = async (response: Response) => {
  const elementHandler = new CitationPDFURLElementHandler();
  const htmlRewriter = new HTMLRewriter().on(
    'meta[name="citation_pdf_url"]',
    elementHandler
  );

  await htmlRewriter.transform(response).text();

  return elementHandler.pdfURL;
};

export const handleRequest = async (request: Request): Promise<Response> => {
  const documentPageURL = new URL(request.url);
  documentPageURL.hostname = "apps.who.int";
  documentPageURL.pathname = documentPageURL.pathname.split("/who")[1];
  documentPageURL.pathname = `/iris/handle${documentPageURL.pathname}`;

  const documentPage = await fetch(documentPageURL.toString(), {
    cf: {
      cacheEverything: true,
      cacheTtl: ONE_WEEK,
    },
  });

  const documentPDFURL = await extractPDFURL(documentPage);

  if (documentPDFURL)
    return fetch(documentPDFURL, {
      cf: { cacheEverything: true, cacheTtl: ONE_WEEK },
    });

  return new Response(null, { status: 404 });
};
