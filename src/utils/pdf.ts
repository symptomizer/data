import { getDocument, PDFDocumentOutline, PDFDocumentStats } from "pdfjs-dist";

type Unpromisify<T> = T extends Promise<infer U> ? U : T;
type PromisedDocument = ReturnType<typeof getDocument>;
type Document = Unpromisify<PromisedDocument>;

class PDFTextReader {
  document: Document;

  constructor(document: Document) {
    this.document = document;
  }

  async getPageText(pageNumber: number) {
    const page = await this.document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    return textContent.items.reduce(
      (accumulator, { str: value }) => accumulator + value,
      ""
    );
  }

  async getText() {
    const pages: string[] = [];

    for (let i = 1; i <= this.document.pdfInfo.numPages; i++) {
      pages.push(await this.getPageText(i));
    }

    return pages;
  }
}

export const pdf = async (
  response: Response
): Promise<{
  info: Record<string, unknown>;
  stats: PDFDocumentStats;
  outline: PDFDocumentOutline;
  pages: string[];
}> => {
  const buffer = new Uint8Array(await response.arrayBuffer());
  const document = await getDocument(buffer);

  const { info, metadata } = await document.getMetadata();
  const stats = await document.getStats();
  const outline = await document.getOutline();

  const textReader = new PDFTextReader(document);
  const pages = await textReader.getText();

  return { info, stats, outline, pages };
};
