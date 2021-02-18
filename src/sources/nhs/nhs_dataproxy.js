// import {DocumentSource, Document, DocumentContent} from "./tester";
const fetch = require('node-fetch');
const {DocumentSource, Document, DocumentContent} = require("./tester");
const {ONE_WEEK} = require('./constants');
const key = require('key');
const NHS_API_KEY = key.readFileSync('NHS_API_KEY.txt');

const Realm = require("realm");
const app = new Realm.App({ id: "documents-xjekh" });

async function handleLogin() {
  // Create a Credentials object to identify the user.
  // Anonymous credentials don't have any identifying information, but other
  // authentication providers accept additional data, like a user's email and
  // password.
  const credentials = Realm.Credentials.anonymous();
  // You can log in with any set of credentials using `app.logIn()`
  const user = await app.logIn(credentials);
  console.log(`Logged in with the user id: ${user.id}`);
};
handleLogin().catch(err => {
  console.error("Failed to log in:", err)
});

async function run() {
    await app.logIn(new Realm.Credentials.anonymous());
    // When you open a synced realm, the SDK automatically
    // creates the realm on the device (if it didn't exist already) and
    // syncs pending remote changes as well as any unsynced changes made
    // to the realm on the device.
    const realm = await Realm.open({
      schema: [TaskSchema],
      sync: {
        user: app.currentUser,
        partitionValue: "myPartition",
      },
    });
    // The myPartition realm is now synced to the device. You can
    // access it through the `realm` object returned by `Realm.open()`
  }
  run().catch(err => {
    console.error("Failed to open realm:", err)
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

    const fs = require('fs')

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

    //figure out how to store A-Z ; look into how to cache

    // fetch function with headers and cache filled out
    NHSFetch = async (url) => {
        return await fetch(url, {
            headers: {
                "subscription-key": NHS_API_KEY
            },
            cf: {
                cacheEverything: true,
                cacheTtl: ONE_WEEK
            }
        })
    }

    retrieveNHSData = async (category) => {
        // add related documents section
        try {
            let no_calls = 1;
            let cat_docs = {};
            // category = letter in alphabet
            //synonyms = true -> includes symptoms of the condition in search
            // includes child pages of a topic
            const nhs_url = 'https://api.nhs.uk/conditions/?category=' + category + '&synonyms=true&childArticles=true';
            let response = await this.NHSFetch(nhs_url);
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

                // Inserts document into mongo

                exports = function() {
                    const mongodb = context.services.get("mongodb-atlas");
                    const documentsCollection = mongodb.db("document").collection("document");

                    const new_doc = {
                        "_id": new BSON.ObjectID(),
                        "url": schema.url,
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
                        "content": {id: new BSON.ObjectID(), url: DocumentContent.url, text: DocumentContent.text},
                        "type": "guidance",
                        "source": {id: "nhs_az", name: "NHS Health A to Z", description: "Complete guide to conditions, symptoms and treatments from the NHS (including what to do and when to get help"}
                    };

                    documentsCollection.insertOne(new_doc)
                    .then(result => console.log(`Successfully inserted item with _id: ${result.insertedId}`))
                    .catch(err => console.error(`Failed to insert item: ${err}`))
                }
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

    /****************** UPDATE DATA *****************/

    UpdateData = async => {

        // Get last retrieved date
        var last_retrieved = fs.readFileSync("lastRetrieved.txt", "utf-8");
        // add related documents section
        try {
            let no_calls = 1;
            let cat_docs = {};
            // category = letter in alphabet
            //synonyms = true -> includes symptoms of the condition in search
            // includes child pages of a topic
            const nhs_url = 'https://api.nhs.uk/conditions/?category=' + category + '&startDate=' + last_retrieved + '&synonyms=true&childArticles=true&orderBy=dateModified';
            let response = await this.NHSFetch(nhs_url);
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

                // Upsert documents into mongo

                exports = function() {
                    const mongodb = context.services.get("mongodb-atlas");
                    const mongodb = context.services.get("mongodb-atlas");
                    const documentsCollection = mongodb.db("document").collection("document");

                    const query = { "url": schema.url };
                    const options = { "upsert": true };
                    const update = {
                        "url": schema.url,
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
                        "content": {id: new BSON.ObjectID(), url: DocumentContent.url, text: DocumentContent.text},
                        "type": "guidance",
                        "source": {id: "nhs_az", name: "NHS Health A to Z", description: "Complete guide to conditions, symptoms and treatments from the NHS (including what to do and when to get help"}
                    };

                    itemsCollection.updateOne(query, update, options)

                    .then(result => {
                      const { matchedCount, modifiedCount, upsertedId } = result;
                      if(upsertedId) {
                        console.log(`Document not found. Inserted a new document with _id: ${upsertedId}`)
                      } else {
                        console.log(`Successfully increased ${query.name} quantity by ${update.$inc.quantity}`)
                      }
                    })
                    .catch(err => console.error(`Failed to upsert document: ${err}`))
                }
            }
            
            // save the document to all_docs dictionary under category key
            this.all_docs[category] = cat_docs;

            // returns the initial NHS HEALTH A-Z call
            return res;
        } catch {
            console.log("Error fetching resource");

        }

        setLastRetrieved()

    }
}

let test = new NHS();
test.retrieveNHSData('A').then((result) => {
    console.log(result);
});
console.log()