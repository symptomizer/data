class WHOMetadataError extends Error {
  constructor(id) {
    super(`Could not extract metadata from WHO document: ${id}`);
    this.name = "WHOMetadataError";
  }
}

class WHOPDFError extends Error {
  constructor(id) {
    super(`Could not extract PDF from WHO document: ${id}`);
    this.name = "WHOPDFError";
  }
}

exports.WHOMetadataError = WHOMetadataError;
exports.WHOPDFError = WHOPDFError;