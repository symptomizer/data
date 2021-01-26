import { Router } from "@glenstack/cf-workers-router";
import { handleRequest as nhs } from "./nhs";

const router = new Router();
router.get("/nhs/.*", nhs);

addEventListener("fetch", (event) => {
  event.respondWith(router.route(event.request));
});
