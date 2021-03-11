// const mapType = (meta_type) => {
//   switch (meta_type){
//     case "Publications":
//     case "Journal / periodical articles":
//     case "Technical documents":
//       return
//   }
// }

// const NotFoundError = require('../index');
const { checkGitDirEnv } = require("husky/lib/checkGitDirEnv");
const { getPDF } = require('./pdf');
const { getMetadata } = require('./old_metadata');
const { DocumentSource } = require("../../schema");
const fetch = require('node-fetch');
const { CitationPDFURLElementHandler } = require("./pdf");

class WHO extends DocumentSource{
  id = "who";
  name = "WHO IRIS"
  description =
    "World Health Organization Institutional Repository for Information Sharing";
  url = new URL("https://apps.who.int/iris/");

  retrieveWHOData = async (id) => {
    const documentURL = new URL(id);
    const documentResponse = await fetch(documentURL.toString());
    if (documentResponse.status === 404) {throw new Error()}
    const pdfURL = await new CitationPDFURLElementHandler().getPDF(id, documentResponse.clone());
    const metadata = await getMetadata(id, documentResponse.clone());
  }
}
checkGitDirEnv()
let test = new WHO();
test.retrieveWHOData('https://apps.who.int/iris/handle/10665/163110')