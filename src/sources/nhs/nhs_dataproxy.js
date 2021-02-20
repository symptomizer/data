// import {DocumentSource, Document, DocumentContent} from "./tester";
const fetch = require('node-fetch');
const {DocumentSource, Document, DocumentContent} = require("./tester");
const {ONE_WEEK} = require('./constants');
const fs = require('fs');
const NHS_API_KEY = fs.readFileSync('NHS_API_KEY.txt');
const mongo_pass = fs.readFileSync('../mongo_pass.txt');
const last_retrieved = fs.readFileSync("lastRetrieved.txt");
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

    fs.writeFile('lastRetrieved.txt', date, (err) => { 
        // In case of a error throw err. 
        if (err) throw err; 
    })
}

class NHS extends DocumentSource {
    id = "nhs";
    name = "NHS A-Z";
    description = 'The NHS Health A-Z';
    url = new URL("https://www.nhs.uk/conditions/");

    // fetch function with headers and cache filled out
    NHSFetch = async (url, category, last_retrieved) => {
        return await fetch(url, {
            headers: {
                "subscription-key": NHS_API_KEY,
                "synonyms": "true",
                "childArticles": "true",
                // comment out following category when updating + add comma
                // "category": category

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
            // category = letter in alphabet
            //synonyms = true -> includes symptoms of the condition in search
            // includes child pages of a topic

            const nhs_url = 'https://api.nhs.uk/conditions/?category=' + category + '&synonyms=true&childArticles=true';

            let response = await this.NHSFetch(nhs_url, category, last_retrieved);
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

                // iterate through all the conditions for the category
                for (let i = 0; i < no_results; i++) {
                    let mainEntity = results[i].mainEntityOfPage;
                    let schema = new Document();
                    schema.id = this.id;
                    schema.url = this.url;
                    schema.directURL = results[i].url;
                    schema.title = results[i].name;
                    schema.alternateTitle = mainEntity.alternateName;
                    schema.authors = {
                        url: res.author.url.toString(),
                        name: res.author.name,
                        email: res.author.email.toString()
                    };
                    schema.logo = res.author.logo;
                    if (mainEntity.lastReviewed !== undefined) {
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
                        no_calls += 1
                        // sleep for a minute if 10 calls have been done in a row
                        if (no_calls === 10) {
                            no_calls = 0;
                            const ONE_SECOND = 1000;
                            const ONE_MINUTE = 60 * ONE_SECOND;
                            await sleep(ONE_MINUTE);
                        }

                        let condition_response = await this.NHSFetch(condition_url);
                        let condition_res = await condition_response.json();

                        let condition_results = condition_res.mainEntityOfPage;
                        let no_condition_results = Object.keys(condition_results).length;
                        DocumentContent.id = new ObjectID();
                        DocumentContent.url = results[i].url;
                        //Get text from main body of symptoms page
                        for (let j = 0; j < no_condition_results; j++) {
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
                                        schema.imageURLs.push(image_dict);
                                        break;
                                    case "WebPageElement":
                                        if ((page_items[k].name !== undefined) && page_items[k].name !== "markdown") {
                                            DocumentContent.text.push(page_items[k].text);
                                        }
                                        //saves normal text objects into array of strings
                                        DocumentContent.text.push(page_items[k].text);
                                }
                            }
                        }
                        // adds DocumentContent to schema
                        schema.document = DocumentContent;
                        console.log(results[i].url + "\nsuccessfully fetched");

                        let updateFilter = { "directURL": schema.directURL};
                        let updateDoc = {
                            $set: {
                                "url": schema.url.toString(),
                                "directURL": schema.directURL.toString(),
                                "title": schema.title,
                                "alternateTitle": schema.alternateTitle, // currently showing as null in all instances
                                "authors": [schema.authors],
                                "datePublished": new Date(schema.datePublished),
                                "dateIndexed": new Date(),
                                "keywords": schema.keywords,
                                "description": schema.description, // currently showing as null in all instances
                                "imageURLs": schema.imageURLs,
                                "rights": schema.rights,
                                "content": {id: DocumentContent.id, url: DocumentContent.url, text: DocumentContent.text },
                                "type": "guidance",
                                "source": {
                                    id: "nhs_az",
                                    name: "NHS Health A to Z",
                                    description: "Complete guide to conditions, symptoms and treatments from the NHS (including what to do and when to get help"
                                }
                            }
                        }

                        //update database with document
                        await update(updateFilter, updateDoc, options);

                    } catch(e) {
                        console.log(results[i].url + "\nError fetching resource");
                        console.error(e);
                    }
                }
            } catch (e) {
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

let test = new NHS();

test.retrieveNHSData('A').then((result) => {
    // console.log(result);
});

console.log()