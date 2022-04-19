// file system module to perform file operations
const fs = require('fs');
 
class StorageManager {

    constructor() {
        this.fileName = 'storage.json';
    }

    function writeToFile(jsonData) {
        // stringify JSON Object
        var jsonContent = JSON.stringify(jsonObj);
        console.log(jsonContent);

        fs.writeFile("output.json", jsonContent, 'utf8', function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }

            console.log("JSON file has been saved.");
        });
    }
    
}

module.exports = {
    StorageManager
}