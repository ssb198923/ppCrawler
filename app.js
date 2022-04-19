process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';

const ICONV = require("iconv-lite");
const AXIOS = require("axios");
const CHEERIO = require("cheerio");
const DBCONN = require("./src/dbConn");
const UTIL = require("./src/util");
const FS = require("fs");
const TG = require("./src/push");
require("dotenv").config();
const interval = process.env.INTERVAL;

const urlPrefix = "https://www.ppomppu.co.kr/";
// const keywordArr = ['hmall'];
// const keywordArr = ['hmall', 'H몰', '감기몰', '더현대', '현대백화점','현대홈쇼핑', '현대몰', '현대hmall', '현대h몰'];
const keywordArr = ['롯데 ON', '11번가', '옥션', '네이버', '롯데온', 'SSG', 'K쇼핑'];

const getHtml = async (keyword) => {
    const encodedKeyword = encodeURI(keyword);
    return await AXIOS({
        url: `${urlPrefix}zboard/zboard.php?id=ppomppu&page_num=20&category=&search_type=sub_memo&keyword=${encodedKeyword}`,
        method: "GET", 
        resultponseType: "arraybuffer",
        responseEncoding: "binary"
      })
      .catch(function (err) { FS.appendFileSync('err.log',err.toString()); });
}

async function getBulkOpts(data) {
    let bulkOps = [];
    for(const item of data) {
        let filter = { _id : item._id };
        bulkOps.push({ 
            updateOne : { 
                "filter" : filter,
                "update" : { $set : item },
                "upsert" : true
            } 
        });
    }
    return bulkOps;
}

async function crawlPage(keywordArr) {
    let data = [];
    let dataIdx = 0;
    for (const keyword of keywordArr){
        let html = await getHtml(keyword);

        const decoded = ICONV.decode(Buffer.from(html.data, 'binary'), 'euc-kr');
        const $ = CHEERIO.load(decoded);
        const $list = $("table#revolution_main_table tbody").children("tr[class^='list']:not(.list_notice)");

        $list.each(function(idx, elem){
            const url = urlPrefix.concat('zboard/',$(this).find(".list_title").parent("a").attr("href"));
            const score = $(this).find("td:nth-child(5)").text();
            const regdate = $(this).find("[title] nobr").text();
            if(regdate.indexOf('/') >= 0) return true;
            const regUtc = UTIL.getUtcTime(UTIL.getYmdDate(Date.now()).toString().concat(regdate.replace(/:/gi,"")));
            data[dataIdx] = {
                _id : $(this).find("td:nth-child(1)").text().trim(),
                keyword : keyword,
                title : $(this).find(".list_title").text().toString("UTF-8").trim(),
                url : url,
                regdate : regdate.indexOf(":") >= 0 ? UTIL.getYmdDate(Date.now()) : UTIL.getYmdDate(`20${regdate}`),
                regutc : regUtc,
                pstv_cnt : score.indexOf("-") >= 0 ? score.split("-")[0].trim() : "0",
                ngtv_cnt : score.indexOf("-") >= 0 ? score.split("-")[1].trim() : "0",
                crawl_date : UTIL.getYmdDate(Date.now()),
            };
            dataIdx++;
        });
    }

    data = data.filter(n => n.title != '' && typeof n.url != "undefined");
    // console.log(data);

    let bulkOps = await getBulkOpts(data);
    // console.log(bulkOps);
    
    if(bulkOps.length >= 1){
        DBCONN.bulkWriteDb(bulkOps, (err, res) => {
            if(err) throw err;
            DBCONN.selectDb({ regutc : { $gt : (Date.now()-interval) } }, (err, res) => {
                if(err) throw err;
                if(res.length >= 1){
                    let msgTxt = ["새 딜이 등록되었습니다."];
                    let keyword;
                    res.forEach( (item) => {
                        if(keyword !== item.keyword){
                            keyword = item.keyword;
                            msgTxt.push(`검색키워드 : ${keyword}`);
                        }                        
                        msgTxt.push(`<a href="${item.url}">${item.title}</a>`);
                    });
                    TG.sendMsg(msgTxt.join("\n"));
                }
            });
        });
    }
}

crawlPage(keywordArr).catch(function (err) { FS.appendFileSync('err.log',err.toString()); });

// keywordArr.forEach(function(keyword){
//     getHtml(keyword)
//     .then( html => {
//         console.log("keyword", keyword);
//         const decoded = ICONV.decode(Buffer.from(html.data, 'binary'), 'euc-kr');
//         let itemList = [];
//         const $ = CHEERIO.load(decoded);
//         const $list = $("table#revolution_main_table tbody").children("tr[class^='list']:not(.list_notice)");

//         $list.each(function(idx, elem){
//             const url = urlPrefix.concat('zboard/',$(this).find(".list_title").parent("a").attr("href"));
//             const score = $(this).find("td:nth-child(5)").text();
//             const regdate = $(this).find("[title] nobr").text();
//             if(regdate.indexOf('/') >= 0) return true;
//             const regUtc = UTIL.getUtcTime(UTIL.getYmdDate(Date.now()).toString().concat(regdate.replace(/:/gi,"")));
//             itemList[idx] = {
//                 _id : $(this).find("td:nth-child(1)").text().trim(),
//                 keyword : keyword,
//                 title : $(this).find(".list_title").text().toString("UTF-8").trim(),
//                 url : url,
//                 regdate : regdate.indexOf(":") >= 0 ? UTIL.getYmdDate(Date.now()) : UTIL.getYmdDate(`20${regdate}`),
//                 regutc : regUtc,
//                 pstv_cnt : score.indexOf("-") >= 0 ? score.split("-")[0].trim() : "0",
//                 ngtv_cnt : score.indexOf("-") >= 0 ? score.split("-")[1].trim() : "0",
//                 crawl_date : UTIL.getYmdDate(Date.now()),
//             };
//         });

//         const data = itemList.filter(n => n.title != '' && typeof n.url != "undefined");

//         console.log(data);
//     })
// });

// keywordArr.forEach( async keyword => await getHtml(keyword)
//     .then( html => {
//         const decoded = ICONV.decode(Buffer.from(html.data, 'binary'), 'euc-kr');
//         let itemList = [];
//         const $ = CHEERIO.load(decoded);
//         const $list = $("table#revolution_main_table tbody").children("tr[class^='list']:not(.list_notice)");


//         $list.each(function(idx, elem){
//             const url = urlPrefix.concat('zboard/',$(this).find(".list_title").parent("a").attr("href"));
//             const score = $(this).find("td:nth-child(5)").text();
//             const regdate = $(this).find("[title] nobr").text();
//             if(regdate.indexOf('/') >= 0) return true;
//             const regUtc = UTIL.getUtcTime(UTIL.getYmdDate(Date.now()).toString().concat(regdate.replace(/:/gi,"")));
//             itemList[idx] = {
//                 _id : $(this).find("td:nth-child(1)").text().trim(),
//                 keyword : keyword,
//                 title : $(this).find(".list_title").text().toString("UTF-8").trim(),
//                 url : url,
//                 regdate : regdate.indexOf(":") >= 0 ? UTIL.getYmdDate(Date.now()) : UTIL.getYmdDate(`20${regdate}`),
//                 regutc : regUtc,
//                 pstv_cnt : score.indexOf("-") >= 0 ? score.split("-")[0].trim() : "0",
//                 ngtv_cnt : score.indexOf("-") >= 0 ? score.split("-")[1].trim() : "0",
//                 crawl_date : UTIL.getYmdDate(Date.now()),
//             };
//         });

//         const data = itemList.filter(n => n.title != '' && typeof n.url != "undefined");
//         return data;
//     })
//     .then( result => {
//         console.log(result);
//         // DBCONN.insertDb(result);
//         let bulkOps = [];
//         result.forEach( (data, idx) => { 
//             let filter = { _id : data._id };
//             bulkOps.push({ 
//                 updateOne : { 
//                     "filter" : filter,
//                     "update" : { $set : data },
//                     "upsert" : true
//                 } 
//             });
//         });
//         // console.log(bulkOps);
//         DBCONN.bulkWriteDb(bulkOps, (err, res) => {
//             if(err) throw err;
//             DBCONN.selectDb({ regutc : { $gt : (Date.now()-interval) } }, (err, res) => {
//                 if(err) throw err;
//                 console.log(res);
//                 if(res.length >= 1){
//                     let msgTxt = ["새 딜이 등록되었습니다."];
//                     let keyword;
//                     res.forEach( (item) => {
//                         if(keyword !== item.keyword){
//                             keyword = item.keyword;
//                             msgTxt.push(`검색키워드 : ${keyword}`);
//                         }                        
//                         msgTxt.push(`<a href="${item.url}">${item.title}</a>`);
//                     });
//                     TG.sendMsg(msgTxt.join("\n"));
//                 }
//             });
//         });

//         // DBCONN.updateDb(query, result);
//         // let data = JSON.stringify(result);
//         // fs.appendFileSync('ppData.json',data);
        
//     })
//     .catch(err => {
//         console.log(err);
//         FS.appendFileSync('err.log',err.toString());
//     })
// );

console.log("end");

