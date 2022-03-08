const fs = require("fs");

fs.readFile('ppData.json', (err, data) => {
    if (err) throw err;
    let student = JSON.parse(data);
    console.log(student);
});