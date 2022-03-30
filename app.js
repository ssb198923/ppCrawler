process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';

const ICONV = require("iconv-lite");
const AXIOS = require("axios");
const CHEERIO = require("cheerio");
const DBCONN = require("./src/dbConn");
const UTIL = require("./src/util");
const FS = require("fs");
const MD5 = require("md5");

const urlPrefix = "https://www.ppomppu.co.kr/";
const keywordArr = ['hmall', 'H몰', '감기몰', '더현대', '현대백화점'];
// const keywordArr = ['hmall'];



const getHtml = (keyword) => {
    const encodedKeyword = encodeURI(keyword);
    return AXIOS({
        url: `${urlPrefix}zboard/zboard.php?id=ppomppu&page_num=20&category=&search_type=sub_memo&keyword=${encodedKeyword}`,
        method: "GET", 
        resultponseType: "arraybuffer"
      }).catch(function (err) { FS.appendFileSync('err.log',err.toString()); });
}

keywordArr.forEach( keyword => getHtml(keyword)
    .then( html => {
        const decoded = ICONV.decode(html.data,'EUC-KR');
        let itemList = [];
        const $ = CHEERIO.load(decoded);
        const $list = $("table#revolution_main_table tbody").children("tr[class^='list']:not(.list_notice)");

        $list.each(function(idx, elem){
            const url = urlPrefix.concat('zboard/',$(this).find(".list_title").parent("a").attr("href"));
            const score = $(this).find("td:nth-child(5)").text();
            const regdate = $(this).find("[title] nobr").text();
            itemList[idx] = {
                _id : MD5(url),
                keyword : keyword,
                title : $(this).find(".list_title").text().trim(),
                url : url,
                regdate : regdate.indexOf(":") >= 0 ? UTIL.getYmdDate(Date.now()) : UTIL.getYmdDate(`20${regdate}`),
                pstv_cnt : score.indexOf("-") >= 0 ? score.split("-")[0].trim() : "0",
                ngtv_cnt : score.indexOf("-") >= 0 ? score.split("-")[1].trim() : "0",
                crwal_date : UTIL.getYmdDate(Date.now()),
            };
            // if(idx==0) return false;
        });

        const data = itemList.filter(n => n.title != '' && n.url!=undefined);
        console.log(data);
        return data;
    })
    .then( result => {
        try{
            // console.log(result);
            DBCONN.insertDb(result);
            // let query = [];
            // result.forEach( (data, idx) => {
            //     query[idx] = { _id : data._id };
            // });
            // console.log(query);

            // DBCONN.updateDb(query, result);
            // let data = JSON.stringify(result);
            // fs.appendFileSync('ppData.json',data);
        } catch(err) {
            console.log(err);
            // FS.appendFileSync('err.log',err.toString());
        }
    })
);

