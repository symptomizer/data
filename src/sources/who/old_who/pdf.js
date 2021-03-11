const { WHOPDFError } = require("./errors");

class CitationPDFURLElementHandler {
  constructor() {
    this.pdfURL = null;
  }

  element(element) {
    this.pdfURL = element.getAttribute('content');
  }

   extractPDFURL = async (string, document) => {
    const citationPDFURLElementHandler = new CitationPDFURLElementHandler();
    const htmlRewriter = new HTMLRewriter().on(
      'meta[name="citation_pdf_url"]',
      citationPDFURLElementHandler
    );

    await htmlRewriter.transform(document).text();
    if (citationPDFURLElementHandler.pdfURL === null) {throw new WHOPDFError(id);}
    return URL(citationPDFURLElementHandler.pdfURL);
  }

   getPDF = async (id, document) => {
    const pdfURL = await this.extractPDFURL(id, document);
    return pdfURL;
  }
}


exports.CitationPDFURLElementHandler = CitationPDFURLElementHandler;