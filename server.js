const express = require('express')
const { stderr } = require('process')
const cors = require('cors')
const app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get('/', function (req, res) {
  res.send('Hello World')
})

app.get('/deploy', function (req, res) {
    const { exec } = require("child_process");
    output = "this is the initial setting"
    // npx hardhat run ./scripts/deploy_new_nft.js --network localhost
    // exec("npx hardhat run scripts/deploy_new_nft.js --network localhost", (error, stdout, stderr) => {
    //npx hardhat run scripts/deploy.js --network mumbai
    exec("npx hardhat run scripts/deploy_new_nft.js --network mumbai", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        res.send(String(stdout));
    });

    // //TODO: Remove and uncomment above
    // returnAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";
    // res.send(returnAddress);
})

app.post('/deployContract', (req, res) => {
    const address = req.body.address;

    exec("npx hardhat run scripts/deploy_new_nft.js --network localhost", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        res.send(stdout)
    });

    res.send('We got your marketAddress');
});

app.listen(5500)