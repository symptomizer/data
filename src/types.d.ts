declare const NHS_API_KEY: string;
declare const MEDICINESCOMPLETE_PLAY_SESSION_JWT: string;

declare module "pdfjs-dist" {
  type PDFDocumentStats = {
    streamTypes: Record<string, boolean>;
    fontTypes: Record<string, boolean>;
  };

  class Metadata {
    getRaw(): string;
    get(key: string): string;
    getAll(): Record<string, string>;
    has(key: string): boolean;
  }

  type PDFDocumentMetadata = {
    info: Record<string, unknown>;
    metadata: Metadata;
  };

  type OutlineNode = {
    title: string;
    // https://github.com/mozilla/pdf.js/blob/master/src/display/api.js#L768-L779
    items: Array<OutlineNode>;
  };

  type PDFDocumentOutline = Array<OutlineNode>;

  class PDFPage {
    getTextContent: () => Promise<{
      items: { str: string }[];
    }>;
  }

  type PDFDocument = {
    getMetadata: () => Promise<PDFDocumentMetadata>;
    getStats: () => Promise<PDFDocumentStats>;
    getOutline: () => Promise<PDFDocumentOutline>;
    getPage: (pageNumber: number) => Promise<PDFPage>;
    pdfInfo: {
      numPages: number;
    };
  };

  export const getDocument: (src: Uint8Array) => Promise<PDFDocument>;
}
