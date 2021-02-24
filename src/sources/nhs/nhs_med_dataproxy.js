const fetch = require('node-fetch');
const {DocumentSource, Document, DocumentContent} = require("../schema.js");
const {ONE_WEEK} = require('./constants');
const fs = require('fs');
const NHS_API_KEY = fs.readFileSync('NHS_API_KEY.txt');
const mongo_pass = fs.readFileSync('../mongo_pass.txt');
const last_retrieved = fs.readFileSync("lastRetrievedMed.txt");
const ObjectID = require('bson').ObjectID;

const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://main_admin:${mongo_pass}@cluster1.xo9vl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//"sleeper" function to pause calls after 10 calls in a row
function sleep(ms){
    return new Promise(resolve => setTimeout(resolve,ms))
}

function setLastRetrieved() {

    // https://stackoverflow.com/questions/1531093/how-do-i-get-the-current-date-in-javascript
    let today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();

    let date = yyyy + '-' + mm + '-' + dd;

    fs.writeFile('lastRetrievedMed.txt', date, (err) => { 
        // In case of a error throw err. 
        if (err) throw err; 
    })
}

class NHS_MED extends DocumentSource {
    id = "nhs_med";
    name = "NHS Medicines";
    description = 'The NHS Medicines A-Z';
    url = new URL("https://www.nhs.uk/medicines/");
    // fetch function with headers and cache filled out
    NHSMedFetch = async (url, category, last_retrieved) => {
        return await fetch(url, {
            headers: {
                "subscription-key": NHS_API_KEY,

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

            const nhs_url = 'https://api.nhs.uk/medicines/?category=' + category;

            let response = await this.NHSMedFetch(nhs_url, category, last_retrieved);
            let res = await response.json();

            const results = res.significantLink;
            const no_results = Object.keys(results).length;

            try {
                //connect to database
                await client.connect();
                const database = client.db("document");
                const collection = database.collection("document");
                const options = { upsert: true };

                // update function
                async function update (filter, updateDoc, options) {
                    const result = await collection.updateOne(filter, updateDoc, options);
                    console.log(`${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`);
                }

                //function to get all schema data from all pages
                let iterate_pages = async (json_res, schema) => {
                    schema.authors = {
                        url: json_res.author.url.toString(),
                        name: json_res.author.name,
                        email: json_res.author.email.toString()
                    }
                    schema.rights = json_res.license;
                    schema.directURL = json_res.url;
                    schema.description = json_res.description;
                    schema.title = json_res.name;
                    schema.logo = json_res.author.logo;
                    schema.dateIndexed = new Date();
                    schema.source = "NHS Medicines A-Z";
                    schema.dateModified = json_res.dateModified;
                    schema.imageURLs = [];
                    schema.relatedDocuments = [];
                    if (schema.alternateTitle !== undefined) {
                        schema.alternateTitle = json_res.about.alternateName;
                    }

                    // function to get all related link urls
                    function allRelatedLinks(relatedLink) {
                        const relatedLink_len = Object.keys(relatedLink).length;
                        for (let i = 0; i < relatedLink_len; i++) {
                            if (relatedLink[i].relatedLink === undefined) {
                                schema.relatedDocuments.push(relatedLink[i]["url"]);
                            } else {
                                let new_relatedLink = relatedLink[i].relatedLink;
                                allRelatedLinks(new_relatedLink);
                            }
                        }
                    }

                    //adds related links
                    if (json_res.relatedLink !== undefined) {
                        allRelatedLinks(json_res.relatedLink);
                    }

                    if (json_res["@type"] === "MedicalWebPage") {

                        if (json_res.lastReviewed !== undefined) {
                            schema.dateReviewed = json_res.lastReviewed[0];
                        }
                        if (schema.keywords !== undefined) {
                            schema.keywords = json_res.keywords;
                        }
                        DocumentContent.id = new ObjectID();
                        DocumentContent.url = json_res.url;
                        DocumentContent.text = [];

                        // gets all text from main entity of the page
                        async function allText(mainEntity, DocumentContent) {
                            const mainEntity_len = Object.keys(mainEntity).length;
                            for (let i = 0; i < mainEntity_len; i++) {
                                if (mainEntity[i].headline === undefined) {
                                    switch (mainEntity[i]["@type"]) {
                                      // If it includes image saves image dictionary into schema
                                        case "ImageObject":
                                            let image_dict = {
                                                url: mainEntity[i].url,
                                                description: mainEntity[i].name,
                                                provider: mainEntity[i].provider,
                                                license: mainEntity[i].license
                                            }
                                            schema.imageURLs.push(image_dict);
                                            break;
                                        case "WebPageElement":
                                            if (mainEntity[i].name !== "markdown" && mainEntity[i].name !== "Reveal") {
                                                DocumentContent.text.push(mainEntity[i].name);
                                            }

                                            if (mainEntity[i].name !== "Reveal"){
                                                let text = mainEntity[i].text;
                                                DocumentContent.text.push(text);
                                            } else {
                                                let question = mainEntity[i]["subjectOf"];
                                                DocumentContent.text.push("Question");
                                                DocumentContent.text.push(question);

                                                let answer = mainEntity[i]["mainEntity"][0]["text"]
                                                DocumentContent.text.push("Answer");
                                                DocumentContent.text.push(answer);
                                            }
                                            break;
                                        case "Question":
                                            let question = mainEntity[i].text
                                            DocumentContent.text.push("Question");
                                            DocumentContent.text.push(question);

                                            let answer = mainEntity[i]["acceptedAnswer"]["mainEntity"][0]["text"]
                                            DocumentContent.text.push("Answer");
                                            DocumentContent.text.push(answer);
                                            break;
                                            
                                    }
                                } else {
                                    if ((mainEntity[i].headline !== "") && (mainEntity[i].headline !== null)) {
                                        DocumentContent.text.push(mainEntity[i].headline);
                                    }
                                    if ((mainEntity[i].text !== "") && (mainEntity[i].text !== null)) {
                                        DocumentContent.text.push(mainEntity[i].text);
                                    }
                                    await allText(mainEntity[i].mainEntityOfPage, DocumentContent);
                                }
                            }
                        }

                        await allText(json_res.mainEntityOfPage, DocumentContent);
                        schema.document = DocumentContent;
                        console.log(schema.directURL + "\nsuccessfully fetched");

                        //add doc to schema
                        let updateFilter = { "directURL": schema.directURL};
                        let updateDoc = {
                            $set: {
                                "url": schema.url.toString(),
                                "directURL": schema.directURL.toString(),
                                "title": schema.title,
                                "alternateTitle": schema.alternateTitle,
                                "authors": [schema.authors],
                                "datePublished": new Date(schema.datePublished),
                                "dateIndexed": new Date(),
                                "keywords": schema.keywords,
                                "description": schema.description,
                                "imageURLs": schema.imageURLs,
                                "rights": schema.rights,
                                "content": {id: DocumentContent.id, url: DocumentContent.url, text: DocumentContent.text },
                                "type": "guidance",
                                "source": {
                                    id: "nhs_med",
                                    name: "NHS Medicines A to Z",
                                    description: "NHS' guide to how your medicine works, how and when to take it, possible side effects and answers to your common questions."
                                }
                            }
                        }

                        await update(updateFilter, updateDoc, options);

                    } else if (json_res["@type"] === "CollectionPage") {
                        // iterate through all the link url in collection pages
                        let allLinks = async (mainEntity) => {
                            const mainEntity_len = Object.keys(mainEntity).length;
                            for (let i = 0; i < mainEntity_len; i++) {
                                if (mainEntity[i].url !== undefined) {
                                    try {
                                        no_calls += 1;
                                        if (no_calls === 10) {
                                            no_calls = 0;
                                            const ONE_SECOND = 1000;
                                            const ONE_MINUTE = 60 * ONE_SECOND;
                                            await sleep(ONE_MINUTE);
                                        }
                                        let new_url = mainEntity[i].url;

                                        let condition_response = await this.NHSMedFetch(new_url);
                                        let condition_res = await condition_response.json();
                                        let schema = new Document();
                                        schema.id = this.id;
                                        schema.url = this.url;
                                        schema.directURL = new_url;
                                        await iterate_pages(condition_res, schema);
                                    } catch (e) {
                                        console.log(new_url + "\nError fetching resource");
                                        console.error(e);
                                    }
                                } else if (mainEntity[i].mainEntityOfPage["hasPart"] !== undefined) {
                                    let hasPart = mainEntity[i].mainEntityOfPage["hasPart"];
                                    let hasPart_len = Object.keys(hasPart).length;
                                    for (let i = 0; i < hasPart_len; i++) {
                                        if (hasPart.url !== undefined) {
                                            schema.relatedDocuments.push(hasPart.url);
                                        }
                                    }
                                } else {
                                    try{
                                        mainEntity = mainEntity[i].mainEntityOfPage;
                                        await allLinks(mainEntity);

                                    } catch (e) {
                                        console.log(results[i].url + "\nError fetching resource");
                                        console.error(e);
                                    }

                                }
                            }
                        }
                        try{
                            let mainEntity;
                            if(json_res.mainEntityOfPage !== undefined){
                                mainEntity = json_res.mainEntityOfPage;
                            } else if (json_res.mainEntity !== undefined) {
                                mainEntity = json_res.mainEntity;
                            }
                            await allLinks(mainEntity);
                        } catch (e){
                            console.log(results[i].url + "\nError fetching resource");
                            console.error(e);
                        }
                    }

                }

                // iterate through all the conditions for the category
                for (let i = 0; i < no_results; i++) {
                    console.log(i.toString());
                    let mainEntity = results[i].mainEntityOfPage;
                    let schema = new Document();
                    schema.id = this.id;
                    schema.url = this.url;
                    schema.datePublished = mainEntity.datePublished;
                    let condition_url = results[i].url;
                    try {
                        // another call to get information for each condition
                        no_calls += 1
                        // sleep for a minute if 10 calls have been done in a row
                        if (no_calls === 10) {
                            no_calls = 0;
                            const ONE_SECOND = 1000;
                            const ONE_MINUTE = 60 * ONE_SECOND;
                            await sleep(ONE_MINUTE);
                        }

                        let condition_response = await this.NHSMedFetch(condition_url);
                        let condition_res = await condition_response.json();
                        await iterate_pages(condition_res, schema);

                    } catch (e) {
                        console.log(condition_url + "\nError fetching resource");
                        console.error(e);
                    }
                }
                }catch (e) {
                        console.log("Unable to connect to MongoDB Database");
                        console.error(e);
                    } finally {
                        await client.close();
                    }
                    // Update the date files were last retrieved
                    setLastRetrieved();
                } catch (e) {
                console.log("Unable top fetch NHS Health A-Z API");
                console.error(e);
            }
        }
}

let test = new NHS_MED();
console.log(`Starting category y`);
test.retrieveNHSData('z').then((result) => {
    console.log(`Category y is complete`);
});