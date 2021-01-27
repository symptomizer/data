import parse from "csv-parse/lib/sync";
import { ONE_HOUR, ONE_WEEK } from "./constants";

const NUMBER_OF_REMAINING_DOCUMENTS_KEY = "NUMBER_OF_REMAINING_DOCUMENTS";
const NUMBER_OF_DOCUMENTS_KEY = "NUMBER_OF_DOCUMENTS";

const BATCH_SIZE = 500;

type Document = {
  Url: string;
  content?: string;
};

const updateDocument = (document: Document): Promise<void> =>
  EVIDENCE.put(`document:${document.Url}`, JSON.stringify(document));

const getPageOfDocuments = async ({
  perPage,
  page,
}: {
  perPage: number;
  page: number;
}): Promise<Document[]> => {
  const evidenceURL = new URL("https://www.evidence.nhs.uk/download");
  evidenceURL.searchParams.delete("q");
  evidenceURL.searchParams.set("ps", perPage.toString());
  evidenceURL.searchParams.set("pa", page.toString());

  const body = new FormData();
  body.set("DownloadType", "Csv");

  const response = await fetch(evidenceURL.toString(), {
    method: "POST",
    body,
  });
  const text = await response.text();
  try {
    return parse(text, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    console.error("MY ERROR");
    console.error(e.message);
    return [];
  }
};

const updatePageOfDocuments = async (
  ...args: Parameters<typeof getPageOfDocuments>
): Promise<void> => {
  const documents = await getPageOfDocuments(...args);
  const promises = documents.map(updateDocument);
  await Promise.all(promises);
};

const getNumberOfDocuments = async () => {
  const response = await fetch("https://www.evidence.nhs.uk/search");
  const numberOfResultsRegex = /<.*id="results-title".*>[\n\s]*(\d*) results for/gm;
  const match = numberOfResultsRegex.exec(await response.text());
  return match ? +match[1] : -1;
};

const handleBatch = async (numberOfDocuments: number) => {
  const numberOfRemainingDocuments = +(
    (await EVIDENCE.get(NUMBER_OF_REMAINING_DOCUMENTS_KEY)) || numberOfDocuments
  );
  if (numberOfRemainingDocuments === 0) {
    console.log("Nothing to do.");
    return;
  }

  const totalPages = Math.ceil(numberOfDocuments / BATCH_SIZE);
  const numberOfCompletedPages = numberOfDocuments - numberOfRemainingDocuments;
  const completedPages = Math.floor(numberOfCompletedPages / BATCH_SIZE);
  const pagesRemaining = totalPages - completedPages;
  const page = completedPages + 1;
  console.log(`Page: ${page}, Pages remaining: ${pagesRemaining}`);
  await updatePageOfDocuments({ perPage: BATCH_SIZE, page });
  await EVIDENCE.put(
    NUMBER_OF_REMAINING_DOCUMENTS_KEY,
    (numberOfDocuments - page * BATCH_SIZE).toString()
  );
  console.log("Complete!");
};

export const handleSchedule = async () => {
  const numberOfDocuments = await getNumberOfDocuments();
  const cachedNumberOfDocuments = +(
    (await EVIDENCE.get(NUMBER_OF_DOCUMENTS_KEY)) || "0"
  );
  if (cachedNumberOfDocuments !== numberOfDocuments) {
    console.log(
      `${
        numberOfDocuments - cachedNumberOfDocuments
      } new documents found! Starting batching...`
    );
    await EVIDENCE.put(NUMBER_OF_DOCUMENTS_KEY, numberOfDocuments.toString());
    await EVIDENCE.put(
      NUMBER_OF_REMAINING_DOCUMENTS_KEY,
      numberOfDocuments.toString()
    );
  }

  await handleBatch(numberOfDocuments);
};

export const handleDocumentRequest = async (
  request: Request
): Promise<Response> => {
  const documentURL = request.url.split("/evidence/")[1];
  const document = await EVIDENCE.get(`document:${documentURL}`, "json");
  const documentResponse = await fetch(documentURL, {
    cf: { cacheEverything: true, cacheTtl: ONE_WEEK },
  });
  new Response(documentResponse.body, {
    status: documentResponse.status,
    headers: {
      ...[...documentResponse.headers],
      "X-Document": JSON.stringify(document),
    },
  });
  return documentResponse;
};

export const handleRequest = async (request: Request): Promise<Response> => {
  const numberOfDocuments = await getNumberOfDocuments();
  const cachedNumberOfDocuments = +(
    (await EVIDENCE.get(NUMBER_OF_DOCUMENTS_KEY)) || "0"
  );
  const numberOfRemainingDocuments = +(
    (await EVIDENCE.get(NUMBER_OF_REMAINING_DOCUMENTS_KEY)) || numberOfDocuments
  );

  return new Response(
    JSON.stringify({
      numberOfDocuments,
      cachedNumberOfDocuments,
      numberOfRemainingDocuments,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
