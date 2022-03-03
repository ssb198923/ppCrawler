const iconv = require("iconv-lite");
const axios = require("axios");
const cheerio = require("cheerio");
const log = console.log;

const getHtml = async () => {
    return await axios({
        url: "https://www.ppomppu.co.kr/zboard/zboard.php?id=ppomppu&page_num=20&category=&search_type=sub_memo&keyword=hmall", 
        method: "GET", 
        responseType: "arraybuffer"
      }).then(function (response) {
        const decoded = iconv.decode(text,'EUC-KR');
      }).catch(function (err) { console.error(err) })
}

getHtml()
    .then(html => {
        log(html);
        let trList = [];
        const $ = cheerio.load(html.data);
        const $list = $("table#revolution_main_table tbody").children("tr[class^='list']:not(.list_notice)");

        $list.each(function(idx, elem){
            trList[idx] = {
                title: $(this).find(".list_title").text()
            };
        });

    const data = trList.filter(n => n.title);
    return data;
    })
    .then(res => log(res));
