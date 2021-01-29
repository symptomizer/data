import { ONE_WEEK } from "./constants";
import { alterURL } from "@glenstack/cf-workers-fetch-helpers";

const FILENAME_REGEX = /<meta content="(.*)" name="citation_pdf_url">/gm;

const whoFetch = alterURL(fetch, {
  mutate: (url) => {
    const whoURL = new URL(url);
    whoURL.hostname = "apps.who.int";
    whoURL.pathname = whoURL.pathname.split("/who")[1];
    whoURL.pathname = `/iris/handle${whoURL.pathname}`;
    return whoURL.toString();
  },
});

export const handleRequest = async (request: Request): Promise<Response> => {
  const response = await whoFetch(request, {
    cf: {
      cacheEverything: true,
      cacheTtl: ONE_WEEK,
    },
  });

  const text = await response.text();
  const match = FILENAME_REGEX.exec(text);

  if (match === null) {
    return new Response(null, { status: 404 });
  } else {
    const pdfURL = match[1];
    return fetch(pdfURL, {
      cf: { cacheEverything: true, cacheTtl: ONE_WEEK },
    });
  }
};
