exports.getYmdDate = (utcdate) => {
    const date = new Date(utcdate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return (`${year}${month >= 10 ? month : '0' + month}${day >= 10 ? day : '0' + day}`);
}

exports.getUtcTime = (ymdhis) => {
    if (ymdhis.toString().length != 14) throw error;
    const year = ymdhis.toString().slice(0,4);
    const month = parseInt(ymdhis.toString().slice(4,6))-1;
    const day = ymdhis.toString().slice(6,8);
    const hour = ymdhis.toString().slice(8,10);
    const min = ymdhis.toString().slice(10,12);
    const sec = ymdhis.toString().slice(12,14);
    
    const dat = new Date();
    dat.setFullYear(year);
    dat.setMonth(month);
    dat.setDate(day);
    dat.setHours(hour);
    dat.setMinutes(min);
    dat.setSeconds(sec);

    return dat.getTime();
}