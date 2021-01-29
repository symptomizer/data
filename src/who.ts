import { ONE_WEEK } from "./constants";

const PDF_URL_REGEX = /<meta content="(.*)" name="citation_pdf_url">/gm;

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

  const documentPageHTML = await documentPage.text();
  const match = PDF_URL_REGEX.exec(documentPageHTML);

  if (match === null) {
    return new Response(null, { status: 404 });
  } else {
    const documentPDFURL = match[1];
    return fetch(documentPDFURL, {
      cf: { cacheEverything: true, cacheTtl: ONE_WEEK },
    });
  }
};
