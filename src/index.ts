// import { Router } from "@glenstack/cf-workers-router";
// import { DocumentSource } from "./sources";
// import { WHO } from "./sources/who/who_ts";
// // import { handleRequest as who } from "./who";
//
// const getDocument = (source: DocumentSource) => async (request: Request) => {
//   const url = new URL(request.url);
//   const documentID = "https://apps.who.int/iris/handle/10665/339053";
//   try {
//     const document = await source.getDocument(documentID);
//     return new Response(JSON.stringify(document), {
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (e) {
//     return new Response(e.message);
//   }
// };
//
// const router = new Router();
// // router.get("/nhs/.*", nhs);
// // router.get("/medicinesComplete/.*", medicinesComplete);
// router.get("/who/.*", getDocument(new WHO()));
//
// addEventListener("fetch", (event) => {
//   event.respondWith(router.route(event.request));
// });
