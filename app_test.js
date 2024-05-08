process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';

const ICONV = require("iconv-lite");
const AXIOS = require("axios");
const CHEERIO = require("cheerio");
const DBCONN = require("./src/dbConn");
const UTIL = require("./src/util");
const TG = require("./src/push");
const HTMLENT = require("html-entities");
require("dotenv").config();
const pushTerm = process.env.PUSH_TERM;
const crawlTerm = process.env.CRAWL_TERM;
const delay = (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay));

const urlPrefix = "https://www.ppomppu.co.kr/";
const keywordArr = ['네이버'];
// const keywordArr = ['hmall', '감기몰', '더현대', '현대백화점', '현대홈쇼핑', '현대몰', 'h몰', '에이치몰'];
// const keywordArr = ['롯데 ON', '11번가', '옥션', '네이버', '롯데온', 'SSG', 'K쇼핑', '지마켓', '위메프', '티몬', 'GS'];
const filterBoardIdArr = ['stock', 'issue', 'bitcoin', 'money', 'humor', 'house', 'gojobs'];

const getSearchHtml = async (keyword) => {
    const encodedKeyword = encodeURI(keyword);
    return await AXIOS({
        url: `${urlPrefix}search_bbs.php?page_size=20&bbs_cate=2&keyword=${encodedKeyword}&order_type=date&search_type=sub_memo`,
        method: "GET", 
        resultponseType: "arraybuffer",
        responseEncoding: "binary"
      })
      .catch(function (err) { UTIL.logging("err", err.stack.toString()); });
}

const getPageHtml = async (url) => {
    return await AXIOS({
        url: url,
        method: "GET", 
        resultponseType: "arraybuffer",
        responseEncoding: "binary"
      })
      .catch(function (err) { UTIL.logging("err", err.stack.toString()); });
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
        UTIL.logging("proc", `Crawling start : ${keyword}`);
        let html = await getSearchHtml(keyword);

        decoded = ICONV.decode(Buffer.from(html.data, 'binary'), 'euc-kr');
        const $ = CHEERIO.load(decoded);
        const $list = $(".results_board .conts");

        for(const listItem of $list){
            const url = urlPrefix.concat('', $(listItem).find(".title a").attr("href"));
            const itemId = url.split("no=")[1].split("&")[0].trim();
            const itemRegDate = $(listItem).find(".desc span:nth-child(3)").text().replace(/[\.]/g, "").trim().concat("000000");

            if(UTIL.getUtcTime(itemRegDate) < (Date.now()-crawlTerm)) continue;

            // const cntDocById = await DBCONN.getCount({ _id : itemId });
            // console.log(cntDocById);

            if(await DBCONN.getCount({ _id : itemId }) == 0){
                UTIL.logging("proc", `get page : ${url}`);
                const itemHtml = await getPageHtml(url);
                decoded = ICONV.decode(Buffer.from(itemHtml.data, 'binary'), 'euc-kr');
                const $page = CHEERIO.load(decoded);


                if($page(".error2").length != 0) {
                    UTIL.logging("proc", `skip crawling : ${url} - deleted url`);
                    continue;
                }

                const regdate = $page(".topTitle-mainbox").html().split("등록일")[1].split("조회수")[0].replace(/<.*/g,"").replace(/(&nbsp;)/g,"").trim().replace(/[- :]/gi,"")+"00";
                const regUtc = UTIL.getUtcTime(regdate);

                data[dataIdx] = {
                    _id : url.split("no=")[1].split("&")[0].trim(),
                    keyword : keyword,
                    board_id : url.split("id=")[1].split("&")[0].trim(),
                    board : $(listItem).find(".desc span:first-child").text().replace(/[\[\]]/g, "").trim(),
                    title : $page("#topTitle h1").text().trim(),
                    url : url,
                    regdate : regdate,
                    regutc : regUtc,
                    pstv_cnt : $(listItem).find(".like").text().trim(),
                    ngtv_cnt : $(listItem).find(".dislike").text().trim(),
                    crawl_date : UTIL.getYmdDate(Date.now()),
                };

                console.log("----------------------------------------------------------------------------");
                console.log("_id", url.split("no=")[1].split("&")[0].trim());
                console.log("keyword", keyword);
                console.log("board_id", url.split("id=")[1].split("&")[0].trim());
                console.log("board", $(listItem).find(".desc span:first-child").text().replace(/[\[\]]/g, "").trim());
                console.log("title", $page("#topTitle h1").text());
                console.log("url", url);
                console.log("regdate", regdate);
                console.log("pstv_cnt", $(listItem).find(".like").text().trim());
                console.log("ngtv_cnt", $(listItem).find(".dislike").text().trim());
                console.log("crawl_date", UTIL.getYmdDate(Date.now()));
                console.log("----------------------------------------------------------------------------");

                dataIdx++;
                await delay( Math.floor(Math.random() * (4-1)+1) * 1000 );
            }
        }
    }

    data = data.filter(n => n.title != '' && typeof n.url != "undefined");
    console.log("@data",data);

    const dataBulkOps = await getBulkOps(data);
    console.log("@dataBulkOps",dataBulkOps);

    UTIL.logging("proc", `crawled count : ${dataBulkOps.length}`);
    if(dataBulkOps.length >= 1){
        const res = await DBCONN.bulkWriteDb(dataBulkOps);
        console.log(res);
        UTIL.logging("proc", `db write : ${dataBulkOps.length} documents`);
    }

    const pushTargetList = await DBCONN.selectDb({ 
        regutc : { $gt : (Date.now()-pushTerm) },
        board_id : { $nin : filterBoardIdArr },
        pushed : { $nin : ["Y", "y"] } 
    });

    let pushTargetCnt = 0;
    let msgTxt = [];
    let targetIdList = [];
    let keyword;
    for(target of pushTargetList) {
        let utcDate = new Date(target.regutc);
        let regTime = ( utcDate.getHours() < 10 ? "0" + utcDate.getHours() : utcDate.getHours() ) + ":" + ( utcDate.getMinutes() < 10 ? "0" + utcDate.getMinutes() : utcDate.getMinutes() );
        let title = HTMLENT.encode(target.title);
        if(keyword !== target.keyword){
            keyword = target.keyword;
            msgTxt.push(`\n[키워드 : ${keyword}]`);
        }
        msgTxt.push(`[${target.board}] <a href="${target.url}">${title}</a> ${regTime}`);
        targetIdList.push(target._id);
        pushTargetCnt++;
    }
    UTIL.logging("proc", `push target count : ${pushTargetCnt}`);

    if(pushTargetCnt >= 1){
        let pushedList = [];
        await TG.sendMsg(msgTxt.join("\n"))
        .then((res) => {
            UTIL.logging("proc", `pushed count : ${pushTargetCnt}`);
            UTIL.logging("proc", `pushed : ${msgTxt.join("\n")}`);
            if(res != null){
                for( _id of targetIdList){
                    pushedList.push({ "_id" : _id, "pushed" : "Y" });
                }
            }
        })
        .catch((err) => {
            UTIL.logging("err", err.stack.toString());
            UTIL.logging("proc", `Push error : Check err.log`);
        });

        const pushedBulkOps = await getBulkOps(pushedList);
        UTIL.logging("proc", `pushed update count : ${pushedBulkOps.length}`);
        if(pushedBulkOps.length >= 1){
            const res = await DBCONN.bulkWriteDb(pushedBulkOps);
            // console.log(res);
            UTIL.logging("proc", `db update : ${pushedBulkOps.length} documents`);
        }
    }
    
    UTIL.logging("proc", `Done`);

}

crawlPage(keywordArr).catch(function (err) { console.log(err); UTIL.logging("err", err.stack.toString()); });

