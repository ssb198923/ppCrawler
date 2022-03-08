process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';

const iconv = require("iconv-lite");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const getHtml = async () => {
    return await axios({
        url: "https://www.ppomppu.co.kr/zboard/zboard.php?id=ppomppu&page_num=20&category=&search_type=sub_memo&keyword=hmall", 
        method: "GET", 
        responseType: "arraybuffer"
      }).catch(function (err) { console.error(err) })
}

getHtml()
    .then(html => {
        const decoded = iconv.decode(html.data,'EUC-KR');
        let trList = [];
        const $ = cheerio.load(decoded);
        const $list = $("table#revolution_main_table tbody").children("tr[class^='list']:not(.list_notice)");

        $list.each(function(idx, elem){
            trList[idx] = {
                title: $(this).find(".list_title").text().trim()
            };
        });

    const data = trList.filter(n => n.title);
    return data;
    })
    .then(res => {
        try{
            let data = JSON.stringify(res);
            fs.writeFileSync('ppData.json',data);
        } catch(err) {
            fs.appendFileSync('err.log',err.toString());
        }
    });
