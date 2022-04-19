const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const CopyrightNFT = await hre.ethers.getContractFactory("CopyrightNFT");
  const copyrightnft = await CopyrightNFT.deploy();
  const contract = await copyrightnft.deployed();
  // console.log("copyrightnft deployed to:", copyrightnft.address);
  console.log(contract.address);

  return copyrightnft.address;
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
  