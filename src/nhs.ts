import { ONE_WEEK } from "./constants";
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
  });
