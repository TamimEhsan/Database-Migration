const Service = require('./base').Service;
const db = new Service();

XLSX = require('xlsx')
var workbook = XLSX.readFile('Brainlytic Translation(1).xlsx');





function getImageLinks(input) {
    let regex = /!\[[^\]]*\]\((?<filename>.*?)(?=\"|\))(?<optionalpart>\".*\")?\)/g;
    var links = input.match(regex)
    if(links){
        // console.log(links);
        return links.join('\n');
    }
    return "";
}
function processData(data,bnDescription,bnStatement,bnExplanation,bnHint,bnMCQ){
    let {description="",statement="",explanation=""} = data;
    let nestedData = data.data;
    let links;
    if(bnDescription){
        links = getImageLinks(description);
        bnDescription = bnDescription+" "+links;
        data.description = bnDescription;
    }
    if( bnStatement ){
        links = getImageLinks(statement);
        bnStatement = bnStatement+" "+links;
        data.statement = bnStatement;
    }
    if( bnExplanation ){
        links = getImageLinks(explanation);
        bnExplanation = bnExplanation+" "+links;
        data.explanation = bnExplanation;
    }

    if( bnHint ){
        const hints = bnHint.split('$');
        data.hint = hints;
    }


    // let newData = {...data,description:bnDescription,statement:bnStatement,explanation:bnExplanation,hint:bnHint};
    if(bnMCQ && data.ansType === "mcq" ){
        let nestedNestedData = nestedData.data;
        const answerIndex = nestedNestedData.options.indexOf(nestedNestedData.answer);
        const bnOptions = bnMCQ.split("\n");
        nestedNestedData.options = bnOptions;
        nestedNestedData.answer = bnOptions[answerIndex];
        nestedData.data = nestedNestedData;
        data.data = nestedData;
    }
    return data;
}

/*==================Queries===============*/
// let levelMap = new Map();
let topicMap = new Map();
let seriesMap = new Map();
function isLevelPresent(id){
    return levelMap.has(id);
}
function isTopiclPresent(id){
    return topicMap.has(id);
}
function isSeriesPresent(id){
    return seriesMap.has(id);
}

// async function insertLevel(id){
//     const query = "SELECT * FROM level WHERE level_id = $1";
//     const params = [id];
//     const fetchResult = await db.query(query,params);
//
//     const [] = fetchResult.data[0];
//     const insertQuery = "INSERT INTO level(something,something) VALUES($1,$2) RETURNING *";
//     const insertParams = [];
//     const insertResult = await db.query(insertQuery,insertParams);
//     const banglaLevelId = insertResult.data[0].level_id;
//     levelMap.set(id,banglaLevelId);
// }

async function insertTopic(id){
    const fetchQuery = "SELECT * FROM topic WHERE topic_id = $1";
    const fetchParams = [id];
    const fetchResult = await db.query(fetchQuery,fetchParams);

    const {name,subject,islive,logo,nseries,nproblem,description,serial,lang,level_id,color} = fetchResult.data[0];
    const insertQuery = 'INSERT INTO topic(name,subject,islive,logo,nseries,nproblem,description,serial,lang,level_id,color) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *;';
    const insertParams = [name,subject,islive,logo,0,0,description,serial,"bn",level_id,color];
    const insertResult = await db.query(insertQuery,insertParams);
    const banglaTopicId = insertResult.data[0].topic_id;
    topicMap.set(id,banglaTopicId);
}

async function insertSeries(enSeries_id,bnTopic_id){
    const fetchQuery = "SELECT * FROM series WHERE series_id = $1";
    const fetchParams = [enSeries_id];
    const fetchResult = await db.query(fetchQuery,fetchParams);

    const {islive,name,description,logo,serial,nproblem} = fetchResult.data[0];
    const insertQuery = 'INSERT INTO series(topic_id,islive,name,description,logo,serial,nproblem) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *;';
    const insertParams = [bnTopic_id,islive,name,description,logo,serial,0];
    const insertResult = await db.query(insertQuery,insertParams);



    const banglaSeriesId = insertResult.data[0].series_id;
    seriesMap.set(enSeries_id,banglaSeriesId);

    // Now increase nseries in bnTopic
    const updateQuery = "UPDATE topic SET nseries=nseries+1 WHERE topic_id=$1";
    const updateParams = [bnTopic_id];
    const updateResult = await db.query(updateQuery,updateParams);
}

async function insertProblem(enSeries_id,bnTopic_id,bn_series_id,serial,bnTitle,bnDescription,bnStatement,bnExplanation,bnHint,bnMCQ){
    const fetchQuery = "SELECT * FROM problem WHERE serial = $1 and series_id = $2";
    const fetchParams = [serial,enSeries_id];
    const fetchResult = await db.query(fetchQuery,fetchParams);


    const { title,islive,logo,difficulty,grade,data,author_id,doc_id,timestp,ispremium } =fetchResult.data[0];
    const newData = processData(data,bnDescription,bnStatement,bnExplanation,bnHint,bnMCQ);
    const insertQuery = "INSERT INTO problem( series_id,title,islive,logo,difficulty,grade,serial,data,author_id,doc_id,timestp,ispremium) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *;";
    const insertParams = [bn_series_id,bnTitle,islive,logo,difficulty,grade,serial,newData,author_id,doc_id,Date.now(),ispremium];
    const insertResult = await db.query(insertQuery,insertParams);

    // Now increase nproblem in bnSeries and bnTopic

    const updateQuery1 = 'Update series SET nproblem=nproblem+1 WHERE series_id=$1;';
    const updateParams1 = [bn_series_id];
    const updateResult1 = await db.query(updateQuery1,updateParams1);

    const updateQuery2 = 'UPDATE topic SET nproblem=nproblem+1 WHERE topic_id=$1;';
    const updateParams2 = [bnTopic_id];
    const updateResult2 = await db.query(updateQuery2,updateParams2);


}

function parseInfo(str){
    const myarr = str.split("/");
    return [myarr[6],myarr[8],myarr[10]];
}

async function getAllBanglaIds(level_id,enTopic_id,enSeries_id){
    if( !isTopiclPresent(enTopic_id) ) await insertTopic(enTopic_id,level_id);
    const bnTopic_id = topicMap.get(enTopic_id);
    // console.log("Debug ",bnTopic_id);

    if( !isSeriesPresent(enSeries_id) ) await insertSeries(enSeries_id,bnTopic_id);
    const bnSeries_id = seriesMap.get(enSeries_id);
    return [bnTopic_id,bnSeries_id];
}

async function getIds(row){
    if( !workbook.Sheets['Sheet1'][`B${row}`] ){
        console.log("faltu row ",row);
        return [false,false,false,false,false,false]
    }
    let link = workbook.Sheets['Sheet1'][`B${row}`].v;
    const [level_id,enSeries_id,serial] = parseInfo(link);
    const query = "SELECT topic_id FROM series WHERE series_id = $1";
    const params = [enSeries_id];
    const result = await db.query(query,params);
    const enTopic_id = result.data[0].topic_id;

    const [bnTopic_id,bnSeries_id] = await getAllBanglaIds(level_id,enTopic_id,enSeries_id);
    return [level_id,bnTopic_id,bnSeries_id,enTopic_id,enSeries_id,serial];
}


function getData(row){
    let title, description, statement, hint, explanation, mcq;
    if (workbook.Sheets['Sheet1'][`C${row}`])
        title = workbook.Sheets['Sheet1'][`C${row}`].v;
    if (workbook.Sheets['Sheet1'][`D${row}`])
        description = workbook.Sheets['Sheet1'][`D${row}`].v;
    if (workbook.Sheets['Sheet1'][`E${row}`])
        statement = workbook.Sheets['Sheet1'][`E${row}`].v;
    if (workbook.Sheets['Sheet1'][`G${row}`])
        hint = workbook.Sheets['Sheet1'][`G${row}`].v;
    if (workbook.Sheets['Sheet1'][`H${row}`])
        explanation = workbook.Sheets['Sheet1'][`H${row}`].v;
    if (workbook.Sheets['Sheet1'][`I${row}`])
        mcq = workbook.Sheets['Sheet1'][`I${row}`].v;
    return [title,description,statement,hint,explanation,mcq];
}





// function retreiveLinks(bangla){
//     let regxed = getImageLinks(bangla);
//     var fs = require('fs');
//     fs.writeFile('mynewfile3.txt', ` ${regxed}`, function (err) {
//         if (err) console.log(err);
//         console.log('Saved!');
//     });
// }
//
// async function readFile(row){
//     let bangla = workbook.Sheets['Sheet1'][`B${row}`].v;
//     const [level,series,serial] = parseInfo(bangla);
//     const query = "SELECT topic_id FROM series WHERE series_id = $1";
//     const params = [series];
//     const result = await db.query(query,params);
//     const topic = result.data[0].topic_id;
// }
async function completeEverything(){

    let start = 3;
    let end = 225;
    await db.query("BEGIN",[]);
    try{
        for(let row = start;row<end;row++){
            console.log(row);
            const [level_id,bnTopic_id,bnSeries_id,enTopic_id,enSeries_id,serial] = await getIds(row);
            if( level_id === false ) continue;
            console.log(level_id,bnTopic_id,bnSeries_id,enTopic_id,enSeries_id,serial);
            const [title,description,statement,hint,explanation,mcq] = getData(row);
            await insertProblem(enSeries_id,bnTopic_id,bnSeries_id,serial,title,description,statement,explanation,hint,mcq);
            // here===================

        }
    }catch (e) {
        console.log(e);
        await db.query("ROLLBACK",[]);
        await db.finish();
        return;
    }
    await db.query("COMMIT",[]);
    await db.finish();

}


completeEverything();

