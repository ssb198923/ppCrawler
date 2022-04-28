process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';

const ICONV = require("iconv-lite");
const AXIOS = require("axios");
const CHEERIO = require("cheerio");
const DBCONN = require("./src/dbConn");
const UTIL = require("./src/util");
const FS = require("fs");
const TG = require("./src/push");
const res = require("express/lib/response");
require("dotenv").config();
const interval = process.env.INTERVAL;
const delay = (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay));

const urlPrefix = "https://www.ppomppu.co.kr/";
// const keywordArr = ['GS'];
const keywordArr = ['hmall', '감기몰', '더현대', '현대백화점', '현대홈쇼핑', '현대몰', 'h몰', '에이치몰'];
// const keywordArr = ['롯데 ON', '11번가', '옥션', '네이버', '롯데온', 'SSG', 'K쇼핑', '지마켓', '위메프', '티몬', 'GS'];
// const boardIdArr = ['ppomppu','freeboard'];

const getSearchHtml = async (keyword) => {
    const encodedKeyword = encodeURI(keyword);
    return await AXIOS({
        url: `${urlPrefix}search_bbs.php?page_size=20&bbs_cate=2&keyword=${encodedKeyword}&order_type=date&search_type=sub_memo`,
        method: "GET", 
        resultponseType: "arraybuffer",
        responseEncoding: "binary"
      })
      .catch(function (err) { FS.appendFileSync('err.log',`[${new Date().toISOString()}] ${err.toString()}\n`); });
}

const getPageHtml = async (url) => {
    return await AXIOS({
        url: url,
        method: "GET", 
        resultponseType: "arraybuffer",
        responseEncoding: "binary"
      })
      .catch(function (err) { FS.appendFileSync('err.log',`[${new Date().toISOString()}] ${err.toString()}\n`); });
}


async function getBulkOps(data) {
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
    let decoded;
    for (const keyword of keywordArr){
        let html = await getSearchHtml(keyword);

        decoded = ICONV.decode(Buffer.from(html.data, 'binary'), 'euc-kr');
        const $ = CHEERIO.load(decoded);
        const $list = $(".results_board .conts");

        for(const listItem of $list){
            const url = urlPrefix.concat('', $(listItem).find(".title a").attr("href"));
            const itemId = url.split("no=")[1].split("&")[0].trim();

            const cntDocById = await DBCONN.getCount({ _id : itemId });
            // console.log(cntDocById);

            if(cntDocById == 0){

                const itemHtml = await getPageHtml(url);
                decoded = ICONV.decode(Buffer.from(itemHtml.data, 'binary'), 'euc-kr');
                const $page = CHEERIO.load(decoded);

                if($page(".error2").length != 0) continue;

                // console.log("_id", url.split("no=")[1].split("&")[0].trim());
                // console.log("keyword", keyword);
                // console.log("board_id", url.split("id=")[1].split("&")[0].trim());
                // console.log("board", $(listItem).find(".desc span:first-child").text().replace(/[\[\]]/g, "").trim());
                // console.log("title", $page(".sub-top-text-box .view_title2").text());
                // console.log("url", url);
                // console.log("regdate", $page(".sub-top-text-box").text().split("등록일:")[1].split("\n")[0].trim().replace(/[- :]/gi,"")+"00");
                // console.log("pstv_cnt", $(listItem).find(".like").text().trim());
                // console.log("ngtv_cnt", $(listItem).find(".dislike").text().trim());
                // console.log("crawl_date", UTIL.getYmdDate(Date.now()));

                const regdate = $page(".sub-top-text-box").text().split("등록일:")[1].split("\n")[0].trim().replace(/[- :]/gi,"")+"00";
                const regUtc = UTIL.getUtcTime(regdate);
                data[dataIdx] = {
                    _id : url.split("no=")[1].split("&")[0].trim(),
                    keyword : keyword,
                    board_id : url.split("id=")[1].split("&")[0].trim(),
                    board : $(listItem).find(".desc span:first-child").text().replace(/[\[\]]/g, "").trim(),
                    title : $page(".sub-top-text-box .view_title2").text().trim(),
                    url : url,
                    regdate : regdate,
                    regutc : regUtc,
                    pstv_cnt : $(listItem).find(".like").text().trim(),
                    ngtv_cnt : $(listItem).find(".dislike").text().trim(),
                    crawl_date : UTIL.getYmdDate(Date.now()),
                };

                dataIdx++;
                await delay( Math.floor(Math.random() * (4-1)+1) * 1000 );
            }
        }
    }

    data = data.filter(n => n.title != '' && typeof n.url != "undefined");
    // console.log(data);

    let bulkOps = await getBulkOps(data);
    // console.log(bulkOps);

    if(bulkOps.length >= 1){
        const res = await DBCONN.bulkWriteDb(bulkOps);
        // console.log(res);
    }

    DBCONN.selectDb({ regutc : { $gt : (Date.now()-interval) } })
    .then((res) => {
        if(res.length >= 1){
            let msgTxt = [];
            let keyword;
            res.forEach( (item) => {
                let utcDate = new Date(item.regutc);
                let regTime = ( utcDate.getHours() < 10 ? "0" + utcDate.getHours() : utcDate.getHours() ) + ":" + ( utcDate.getMinutes() < 10 ? "0" + utcDate.getMinutes() : utcDate.getMinutes() );
                if(keyword !== item.keyword){
                    keyword = item.keyword;
                    msgTxt.push(`\n[키워드 : ${keyword}]`);
                }
                msgTxt.push(`[${item.board}] <a href="${item.url}">${item.title}</a> ${regTime}`);
            });
            TG.sendMsg(msgTxt.join("\n"));
        }
    })
    .catch((err)=> { throw err; } )
    ;
}

crawlPage(keywordArr).catch(function (err) { FS.appendFileSync('err.log',`[${new Date().toISOString()}] ${err.toString()}\n`); });

