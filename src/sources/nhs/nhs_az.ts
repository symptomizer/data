import { DocumentSource, Document, DocumentType, NotFoundError } from "..";
import { ONE_WEEK } from "../../constants";
import { addHeaders, alterURL } from "@glenstack/cf-workers-fetch-helpers";

const nhsFetch = alterURL(
  addHeaders(fetch, {
    headers: {
      "subscription-key": NHS_API_KEY,
    },
  }),
  {
    mutate: (url) => {
      const nhsURL = new URL(url);
      nhsURL.hostname = "api.nhs.uk";
      nhsURL.pathname = nhsURL.pathname.split("/nhs")[1];
      return nhsURL.toString();
    },
  }
);

export const handleRequest = async (request: Request): Promise<Response> =>
  nhsFetch(request, {
    cf: {
      cacheEverything: true,
      cacheTtl: ONE_WEEK,
    },
  }
);

// export class NHS_AZ extends DocumentSource {
//   id = "nhs_az";
//   name = "NHS A-Z";
//   description =
//     "NHS' easy to understand guide to conditions, symptoms and treatments, including what to do and when to get help.";
//   url = new URL("https://api.nhs.uk/conditions");


//   async getDocument(id: string): Promise<Document> {
    
//     const documentURL = nhsFetch(id, {
//       cf: {
//         cacheEverything: true,
//         cacheTtl: ONE_WEEK,
//       },
//     });

//     const documentResponse = await fetch(documentURL.toString());
//     if (documentResponse.status === 404) throw new NotFoundError(id);

//     return new Document({
//       id,
//       url: documentURL,
//       directURL: pdfURL,
//       title: metadata.Title,
//       alternateTitle: metadata["Variant title"],
//       // fileName: pdf,
//       authors: (metadata["Authors"] || "").split("||"),
//       datePublished: date,
//       // dateReviewed
//       dateModified: date,
//       dateIndexed: new Date(),
//       keywords: (metadata["Subject or keywords"] || "").split("||"),
//       description: metadata.Abstract,
//       alternateDescription: metadata.Description,
//       // imageURLs: []
//       isbn: metadata["dc.identifier.isbn"],
//       issn: metadata["dc.identifier.issn"],
//       doi: metadata["dc.identifier.doi"],
//       pubMedID: metadata["dc.identifier.pubmed"],
//       pmcID: metadata["dc.identifier.pmc"],
//       // relatedDocuments:
//       journalReference: {
//         title: metadata["Journal title"],
//         volume: metadata["Journal volume"],
//         issue: metadata["Journal issue"],
//         start: metadata["Journal start page"],
//         end: metadata["Journal end page"],
//       },
//       meshHeadings: (metadata["MeSH Headings"] || "")
//         .split("::")
//         .join("||")
//         .split("||"),
//       meshQualifiers: (metadata["MeSH qualifiers"] || "")
//         .split("::")
//         .join("||")
//         .split("||"),
//       publisher: metadata.Publisher,
//       rights: metadata.Rights,
//       content: [],
//       type: mapType(metadata.Type),
//       source: this,
//     });
//   }
//}

