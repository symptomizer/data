import { Router } from "@glenstack/cf-workers-router";
import { handleRequest as nhs } from "./nhs";
import { handleRequest as medicinesComplete } from "./medicinesComplete";
import {
  handleRequest as evidence,
  handleDocumentRequest as evidenceDocument,
  handleSchedule as evidenceSchedule,
} from "./evidence";

const router = new Router();
router.get("/nhs/.*", nhs);
router.get("/medicinesComplete/.*", medicinesComplete);
router.get("/evidence/", evidence);
router.get("/evidence/.*", evidenceDocument);

addEventListener("fetch", (event) => {
  event.respondWith(router.route(event.request));
});

addEventListener("scheduled", (event) => {
  event.waitUntil(
    (async () => {
      await evidenceSchedule();
    })()
  );
});
