require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
const fs = require("fs")
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/* Note: For a deploment these shouldn't be in code but as envoirnment variables 
  // To export your private key from Metamask, open Metamask and
  // go to Account Details > Export Private Key
  // Be aware of NEVER putting real Ether into testing accounts
*/
const MUMBAI_PRIVATE_KEY = fs.readFileSync(".secret").toString();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  // Note: Tutorial used Polygon here so
  networks: {
    // Hardhat test network
    hardhat: {
      chainId: 1337
    },
    // ropsten: {
    //   url: `https://ropsten.infura.io/v3/4816522b295741dc8b267e0aca50c5f3`,
    //   accounts: [`${ROPSTEN_PRIVATE_KEY}`]
    // },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [`${MUMBAI_PRIVATE_KEY}`]
    },
    // polygon: {
    //   url: "https://polygon-mainnet.infura.io/v3/<ADD API KEY>",
    //   accounts: ["<ADD WALLET PRIVATE KEY>"]
    // },
  },
  etherscan: {
    // Your API key for Etherscan or Polygonscan
    apiKey: "DJVAZVSRBZEHIUJEG7AQHBJESRYD4DWC4P"
  },
};
