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

const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;

export const handleRequest = async (request: Request): Promise<Response> =>
  nhsFetch(request, {
    cf: {
      cacheEverything: true,
      cacheTtl: ONE_WEEK,
    },
  });
