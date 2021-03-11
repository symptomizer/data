

export class WHOMetadataError extends Error {
  constructor(id: string) {
    super(`Could not extract metadata from WHO document: ${id}`);
    this.name = "WHOMetadataError";
  }
}
export class WHOPDFError extends Error {
  constructor(id: string) {
    super(`Could not extract PDF from WHO document: ${id}`);
    this.name = "WHOPDFError";
  }
}
