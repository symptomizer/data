import { Router } from "@glenstack/cf-workers-router";
import { handleRequest as nhs } from "./nhs";
import { handleRequest as medicinesComplete } from "./medicinesComplete";
import {
  handleStatsRequest as evidenceStats,
  handleTriggerRequest as evidenceTrigger,
  handleDocumentRequest as evidenceDocument,
  handleSchedule as evidenceSchedule,
} from "./evidence";

const router = new Router();
router.get("/nhs/.*", nhs);
router.get("/medicinesComplete/.*", medicinesComplete);
router.get("/evidence/stats", evidenceStats);
router.get("/evidence/trigger", evidenceTrigger);
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
