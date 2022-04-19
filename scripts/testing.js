var exec = require('child_process').exec;

exec('npx hardhat run scripts/deploy.js --network localhost',
    function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });