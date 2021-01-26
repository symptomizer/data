import { Router } from "@glenstack/cf-workers-router";
import { handleRequest as nhs } from "./nhs";
import { handleRequest as medicinesComplete } from "./medicinesComplete";

const router = new Router();
router.get("/nhs/.*", nhs);
router.get("/medicinesComplete/.*", medicinesComplete);

addEventListener("fetch", (event) => {
  event.respondWith(router.route(event.request));
});
