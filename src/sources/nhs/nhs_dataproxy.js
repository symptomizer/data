// import {DocumentSource, Document, DocumentContent} from "./tester";
const fetch = require('node-fetch');
let {DocumentContent} = require("./tester");
const {DocumentSource} = require("./tester");
const {Document} = require("./tester");
const {ONE_WEEK} = require('./constants');
const NHS_API_KEY = 'feb53bd5a8e04bdba3343018b937b878';

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve,ms))
}
class NHS extends DocumentSource{
    id = "nhs";
    name = "NHS A-Z";
    description = 'The NHS Health A-Z';
    url = new URL("https://www.nhs.uk/conditions/");
    // last_updated = null;
    all_docs = {};

    //figure out how to store A-Z ; look into how to cache

    retrieveNHSData = async (category) => {
        // add related documents section
        try {
            let no_calls = 0;
            let cat_docs = {};
            const nhs_url = 'https://api.nhs.uk/conditions/?category=' + category + '&synonyms=true&childArticles=true';
            let response = await fetch(nhs_url, {
                headers: {
                    "subscription-key": NHS_API_KEY
                },
                cf: {
                    cacheEverything: true,
                    cacheTtl: ONE_WEEK,
                }
            });

            let res = await response.json();
            const results = res.significantLink;
            const no_results = Object.keys(results).length;
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
                    no_calls+=1
                    if (no_calls === 10){
                        no_calls = 0;
                        const ONE_SECOND = 1000;
                        const ONE_MINUTE = 60 * ONE_SECOND;
                        await sleep(ONE_MINUTE);
                    }
                    let condition_response = await fetch(condition_url, {
                        headers: {
                            "subscription-key": NHS_API_KEY
                        },
                        cf: {
                            cacheEverything: true,
                            cacheTtl: ONE_WEEK,
                        }
                    });

                    let condition_res = await condition_response.json();
                    let condition_results = condition_res.mainEntityOfPage;
                    let no_condition_results = Object.keys(condition_results).length;
                    DocumentContent.id = results[i].url;
                    DocumentContent.url = results[i].url;
                    for (let j = 0; j<no_condition_results; j++) {
                        DocumentContent.text = [condition_results[j].text];
                        let page_items = condition_results[j].mainEntityOfPage;
                        let no_page_items = Object.keys(page_items).length;
                        for (let k = 0; k < no_page_items; k++) {
                            switch (page_items[k]["@type"]) {
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
                                    DocumentContent.text.push(page_items[k].text);
                            }
                        }
                    }
                    schema.document = DocumentContent;
                    console.log(results[i].url + "\nsuccessfully fetched");
                    cat_docs[results[i].name] = schema;

                } catch {
                    console.log(results[i].name);
                    console.log("Error fetching resource");
                }
            }

            this.all_docs[category] = cat_docs;
            return res;
        } catch {
            console.log("Error fetching resource");

        }

    }

    // async function retrieveNHSData(){
    //     try {
    //         let response = await fetch('https://api.nhs.uk/conditions/achalasia/', {
    //             headers: {
    //                 "subscription-key": NHS_API_KEY
    //             }
    //         });
    //         const res = await response.json();
    //         return res;
    //     } catch (err) {
    //         console.log("Error fetching resource", err.message);
    //     }
    // }

    // schema = new Document(
    //     this.id,
    //     this.url,
    //     this.json_file.url,
    //     this.json_file.name,
    //     this.json_file.about,
    //   null,
    //     this.json_file.author,
    //     null,
    //     this.json_file.lastReviewed,
    //     this.json_file.dateModified,
    //     new Date(),
    //     this.json_file.keywords,
    //     this.json_file.description
    // );
}

let test = new NHS();
test.retrieveNHSData('A').then((result) => {
    console.log(result);

});
console.log()