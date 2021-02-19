// import {DocumentSource, Document, DocumentContent} from "./tester";
const fetch = require('node-fetch');
const {DocumentSource, Document, DocumentContent} = require("./tester");
const {ONE_WEEK} = require('./constants');
const fs = require('fs');
const NHS_API_KEY = fs.readFileSync('NHS_API_KEY.txt');
const mongo_pass = fs.readFileSync('../mongo_pass.txt');
const last_retrieved = fs.readFileSync("lastRetrieved.txt");

const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://main_admin:${mongo_pass}@cluster1.xo9vl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
  const documents = client.db("document").collection("document");
  // perform actions on the collection object
  client.close();
});

//"sleeper" function to pause calls after 10 calls in a row
function sleep(ms){
    return new Promise(resolve => setTimeout(resolve,ms))
}

function setLastRetrieved() {

    // https://stackoverflow.com/questions/1531093/how-do-i-get-the-current-date-in-javascript

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    date = yyyy + '-' + mm + '-' + dd;

    fs.writeFile('lastRetrieved.txt', date, (err) => { 
        // In case of a error throw err. 
        if (err) throw err; 
    }) 
}

class NHS extends DocumentSource{
    id = "nhs";
    name = "NHS A-Z";
    description = 'The NHS Health A-Z';
    url = new URL("https://www.nhs.uk/conditions/");
    all_docs = {};

    // fetch function with headers and cache filled out
    NHSFetch = async (url, category, last_retrieved) => {
        return await fetch(url, {
            headers: {
                "subscription-key": NHS_API_KEY,
                "synonyms":"true",
                "childArticles":"true",
                // comment out category when updating + add comma
                "category": category

                //uncomment following when updating
                //"startDate":last_retrieved,
                //"orderBy":"dateModified"
            },
            cf: {
                cacheEverything: true,
                cacheTtl: ONE_WEEK
            }
        })
    }

    retrieveNHSData = async (category) => {
        try {
            let no_calls = 1;
            let cat_docs = {};
            // category = letter in alphabet
            //synonyms = true -> includes symptoms of the condition in search
            // includes child pages of a topic
            
            const nhs_url = 'https://api.nhs.uk/conditions/'

            let response = await this.NHSFetch(nhs_url, category);
            let res = await response.json();

            const results = res.significantLink;
            const no_results = Object.keys(results).length;
            // iterate through all the conditions for the category
            for (let i=0; i<no_results; i++){
                let mainEntity = results[i].mainEntityOfPage;
                let schema = new Document();
                schema.id = this.id;
                schema.url = this.url;
                schema.directURL = results[i].url;
                schema.title = results[i].name;
                schema.alternateTitle = mainEntity.alternateName;
                schema.authors = res.author;
                if (mainEntity.lastReviewed !== undefined){
                    schema.dateReviewed = mainEntity.lastReviewed[0];
                }
                schema.dateModified = mainEntity.dateModified;
                schema.datePublished = mainEntity.datePublished;
                schema.dateIndexed = new Date();
                schema.keywords = mainEntity.keywords;
                schema.description = mainEntity.description;
                schema.rights = res.license;
                schema.source = "NHS Health A-Z";
                schema.imageURLs = [];
                const condition_url = results[i].url;
                try {
                    // another call to get information for each condition
                    no_calls+=1
                    // sleep for a minute if 10 calls have been done in a row
                    if (no_calls === 10){
                        no_calls = 0;
                        const ONE_SECOND = 1000;
                        const ONE_MINUTE = 60 * ONE_SECOND;
                        await sleep(ONE_MINUTE);
                    }

                    let condition_response = await this.NHSFetch(condition_url);
                    let condition_res = await condition_response.json();

                    let condition_results = condition_res.mainEntityOfPage;
                    let no_condition_results = Object.keys(condition_results).length;
                    DocumentContent.id = results[i].url;
                    DocumentContent.url = results[i].url;
                    //Get text from main body of symptoms page
                    for (let j = 0; j<no_condition_results; j++) {
                        DocumentContent.text = [condition_results[j].text];
                        let page_items = condition_results[j].mainEntityOfPage;
                        let no_page_items = Object.keys(page_items).length;
                        for (let k = 0; k < no_page_items; k++) {
                            switch (page_items[k]["@type"]) {
                                // If it includes image saves image dictionary into schema
                                case "ImageObject":
                                    let image_dict = {
                                        url: page_items[k].url,
                                        description: page_items[k].name,
                                        provider: page_items[k].provider,
                                        license: page_items[k].license
                                    }
                                    schema.imageURLs. push(image_dict);
                                    break;
                                case "WebPageElement":
                                    //saves normal text objects into array of strings
                                    DocumentContent.text.push(page_items[k].text);
                            }
                        }
                    }
                    // adds DocumentContent to schema
                    schema.document = DocumentContent;
                    console.log(results[i].url + "\nsuccessfully fetched");
                    cat_docs[results[i].name] = schema;

                } catch {
                    console.log(results[i].url + "\nError fetching resource");
                }

                // Upsert document into mongo
                documents.updateOne(
                    {"url": schema.url },
                    {$set : {"url": schema.url,
                    "directURL": schema.directURL,
                    "title": schema.title,
                    "alternateTitle": schema.alternateTitle,
                    "fileName":null,
                    "authors": schema.authors,
                    "datePublished": schema.datePublished,
                    "keywords": schema.keywords,
                    "description": schema.description,
                    "alternateDescription": null,
                    "imageURLs": schema.imageURLs,
                    "isbn": null,
                    "issn": null,
                    "doi": null,
                    "pubMedID": null,
                    "pmcID": null,
                    "relatedDocuments": null,
                    "journalReference": null,
                    "meshHeadings": null,
                    "meshQualifiers": null,
                    "publisher": null,
                    "rights": schema.rights,
                    "content": {id: DocumentContent, url: DocumentContent.url, text: DocumentContent.text},
                    "type": "guidance",
                    "source": {id: "nhs_az", name: "NHS Health A to Z", description: "Complete guide to conditions, symptoms and treatments from the NHS (including what to do and when to get help"}}},
                    {upsert : true}
                )
                .then(function(result) {
                    const { matchedCount, modifiedCount, upsertedId } = result;
                    if(upsertedId) {
                      console.log(`Document not found. Inserted a new document with _id: ${upsertedId}`)
                    } else {
                      console.log(`Successfully increased ${query.name} quantity by ${update.$inc.quantity}`)
                    }
                })
                .catch(err => console.error(`Failed to upsert document: ${err}`))
            }
            
            // save the document to all_docs dictionary under category key
            this.all_docs[category] = cat_docs;

            // returns the initial NHS HEALTH A-Z call
            return res;

        } catch {
            console.log("Error fetching resource");
        }
        // Update the date files were last retrieved
        setLastRetrieved()
    }
}
let test = new NHS();

test.retrieveNHSData('a').then((result) => {
    console.log(result);
});

console.log()