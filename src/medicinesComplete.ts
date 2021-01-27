import { ONE_WEEK } from "./constants";
import { addHeaders, alterURL } from "@glenstack/cf-workers-fetch-helpers";

const medicinesCompleteFetch = alterURL(
  addHeaders(fetch, {
    headers: {
      Cookie: `PLAY_SESSION: ${MEDICINESCOMPLETE_PLAY_SESSION_JWT}`,
    },
  }),
  {
    mutate: (url) => {
      const medicinesCompleteURL = new URL(url);
      medicinesCompleteURL.hostname = "www.medicinescomplete.com";
      medicinesCompleteURL.pathname = medicinesCompleteURL.pathname.split(
        "/medicinesComplete"
      )[1];
      medicinesCompleteURL.pathname = `/api${medicinesCompleteURL.pathname}`;
      return medicinesCompleteURL.toString();
    },
  }
);

export const handleRequest = async (request: Request): Promise<Response> =>
  medicinesCompleteFetch(request, {
    cf: {
      cacheEverything: true,
      cacheTtl: ONE_WEEK,
    },
  });
