import { Router } from "@glenstack/cf-workers-router";
import { handleRequest as nhs } from "./nhs";
import { handleRequest as medicinesComplete } from "./medicinesComplete";
import { handleRequest as who } from "./who";

const router = new Router();
router.get("/nhs/.*", nhs);
router.get("/medicinesComplete/.*", medicinesComplete);
router.get("/who/.*", who);

addEventListener("fetch", (event) => {
  event.respondWith(router.route(event.request));
});
