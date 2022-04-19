const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const NFTMarket = await hre.ethers.getContractFactory("NFTMarket");
  const nftMarket = await NFTMarket.deploy();
  await nftMarket.deployed();
  console.log("nftMarket deployed to:", nftMarket.address);

  const CopyrightNFT = await hre.ethers.getContractFactory("CopyrightNFT");
  const copyrightnft = await CopyrightNFT.deploy(nftMarket.address);
  await copyrightnft.deployed();
  console.log("copyrightnft deployed to:", copyrightnft.address);

  let config = 
  `
  export const nftmarketaddress = "${nftMarket.address}"
  export const copyrightnftaddress = "${copyrightnft.address}"
  `

  let data = JSON.stringify(config)
  fs.writeFileSync('config.js', JSON.parse(data))

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
  