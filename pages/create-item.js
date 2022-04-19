import { useState } from 'react'
import { ethers } from 'ethers'
import { create as ipfsHttpClient } from 'ipfs-http-client'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'
import axios from 'axios';

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

import {
  nftcopyrightaddress, nftaddress, nftmarketaddress
} from '../config'

import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import CopyrightNFT from '../artifacts/contracts/CopyrightNFT.sol/CopyrightNFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null)
  const [formInput, updateFormInput] = useState({ supply: '', price: '', name: '', description: '', contractName: '' })
  const router = useRouter()

  async function onChange(e) {
    const file = e.target.files[0]
    let urls = []
    try {
      for (let i = 0; i < formInput.supply; i++) {
        let added = await client.add(
          file,
          {
            progress: (prog) => console.log(`received: ${prog}`)
          }
        )
        let url = `https://ipfs.infura.io/ipfs/${added.path}`
        urls.push(url)
      }
      // const url = 'https://ipfs.infura.io/ipfs/QmabWKxvrrNmdjvZ7x9XfuvhyPoe5Hg8oZH7jx5URVkyVo'
      setFileUrl(urls)
      console.log(fileUrl)
    } catch (error) {
      console.log('Error uploading file: ', error)
    }
  }
  
  async function createMarket() {
    const { name, description, price, supply, contractName} = formInput
    if (!name || !description || !price || !supply || !fileUrl || !contractName) return
    /* first, upload to IPFS */
    // TODO Loop Here
    var metadataUrls = [];
    for (let i = 0; i < formInput.supply; i++) {
      var data = JSON.stringify({
        name, description, image: fileUrl[i]
      })
      try {
        var added = await client.add(data)
        var url = `https://ipfs.infura.io/ipfs/${added.path}`
        /* after file is uploaded to IPFS, pass the URL to save it on Polygon */
        metadataUrls.push(url);
      } catch (error) {
        console.log('Error uploading file: ', error)
      } 
    }
    console.log(metadataUrls)
    createSale(metadataUrls, contractName)
  }

  async function createSale(urls, contractName) {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)    
    const signer = provider.getSigner()

    /* Get Contract from MarketPlace */
    let marketContract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    const data = await marketContract.fetchMyContracts()
    const items = await Promise.all(data.map(async i => {
      let item = {
        itemId: i.itemId.toNumber(),
        title: i.title,
        owner: i.owner,
        nftContract: i.nftContract
      }
      return item
    }))
    const nftContractMarketItem = items.find(element => element.title === contractName);
    const nftContractAddress = nftContractMarketItem.nftContract;
    // const nftContractAddress = nftcopyrightaddress;
    /* next, create the item */
    // let contract = new ethers.Contract(nftaddress, NFT.abi, signer)
    // let nftContract = new ethers.Contract(nftcopyrightaddress, CopyrightNFT.abi, signer)
    let nftContract = new ethers.Contract(nftContractAddress, CopyrightNFT.abi, signer)

    const price = ethers.utils.parseUnits(formInput.price, 'ether')
    console.log(formInput.supply);
  
    /* then list the item for sale on the marketplace */
    let listingPrice = await marketContract.getListingPrice()
    listingPrice = listingPrice.toString()

    //TODO check and then have alt create tokens function
    let transaction;
    if (formInput.supply == 1) {
      transaction = await nftContract.createToken(urls[0])
      let tx = await transaction.wait()
      let event = tx.events[0]
      console.log(event.args);
      // let value = event.args[2]
      let value = event.args[4]
      console.log(value);
      let tokenId = value.toNumber() - 1;

      let minted_supply = await nftContract.getMintedSupply()
      console.log(minted_supply)

      // transaction = await contract.createMarketItem(nftaddress, tokenId, price, { value: listingPrice })
      transaction = await marketContract.createMarketItem(nftContractAddress, tokenId, price, { value: listingPrice })
      await transaction.wait()
    } else {
      let minted_supply = await nftContract.getMintedSupply();
      let ids = [];
      let amounts = [];
      for (let i = 0; i < formInput.supply; i++) {
          ids[i] = minted_supply + i;
          amounts[i] = 1;
      }

      transaction = await nftContract.createTokens(urls, ids, amounts)
      await transaction.wait()

      transaction = await marketContract.createMarketItems(nftContractAddress, ids, amounts, price, { value: listingPrice })
      await transaction.wait()

    }
    
    router.push('/')
  }

  return (
    <div className="flex justify-center"> {/*className="flex justify-center"*/}
      <div className="w-1/2 flex flex-col pb-12">
        <input 
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
        />
        <input
          placeholder="Asset Price in Eth"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, price: e.target.value })}
        />
        <input
          placeholder="Asset Supply"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, supply: e.target.value })}
        />
        <input
          placeholder="Contract Title"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, contractName: e.target.value })}
        />
        {/* <div className="flex flex-row items-stretch pb-12">
          {contractButtons()}
        </div> */}
        <input
          type="file"
          name="Asset"
          className="my-4"
          onChange={onChange}
        />
        {
          fileUrl 
          // && (
          //   <img className="rounded mt-4" width="350" src={fileUrl} />
          // )
        }
        <button onClick={createMarket} className="font-bold mt-4 bg-blue-500 text-white rounded p-4 shadow-lg">
          Create NFT and put up for sale
        </button>
      </div>
    </div>
  )
}