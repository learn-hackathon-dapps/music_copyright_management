import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import React from 'react';
import axios from 'axios'
import Web3Modal from "web3modal"

import {
  nftaddress, nftcopyrightaddress, nftmarketaddress
} from '../config'

import CopyrightNFT from '../artifacts/contracts/CopyrightNFT.sol/CopyrightNFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'

let rpcEndpoint = null

if (process.env.NEXT_PUBLIC_WORKSPACE_URL) {
  rpcEndpoint = process.env.NEXT_PUBLIC_WORKSPACE_URL
}

export default function Home() {
  const [nfts, setNfts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')

  useEffect(() => {
    loadNFTs()
  }, [])

  async function loadNFTs() {    
    // const provider = new ethers.providers.JsonRpcProvider(rpcEndpoint)
    const provider = new ethers.providers.JsonRpcProvider("https://rpc-mumbai.maticvigil.com")//for mumbai
    // const tokenContract = new ethers.Contract(nftaddress, NFT.abi, provider)
    
    const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, provider)
    var data = await marketContract.fetchAllMarketItems()
    // items.filter(i => i.sold)
    // data = data.slice(0,1);
    // console.log(data)
    var items = await Promise.all(data.map(async i => {
      const tokenContract = new ethers.Contract(i.nftContract, CopyrightNFT.abi, provider)
      // const tokenUri = await tokenContract.tokenURI(i.tokenId)
      const tokenUris = await tokenContract.uri(i.tokenId)
      const tokenUri = tokenUris[i.tokenId];     
      const meta = await axios.get(tokenUri)
      let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
      let item = {
        price,
        itemId: i.itemId.toNumber(),
        seller: i.seller,
        owner: i.owner,
        name: meta.data.name,
        description: meta.data.description,
        contract: i.nftContract,
        sold: i.sold
      }
      return item
    }))
    items = items.filter(i => !i.sold) //Filter out sold items
    setNfts(items)
    setLoadingState('loaded') 
  }

  async function buyNft(nft) {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(nftmarketaddress, Market.abi, signer)

    const price = ethers.utils.parseUnits(nft.price.toString(), 'ether')
    // const transaction = await contract.createMarketSale(nftaddress, nft.itemId, {
    //   value: price
    // })
    // const transaction = await contract.createMarketSale(nftcopyrightaddress, nft.itemId, {
    //   value: price
    // })
    // console.log(nft.contract)
    const transaction = await contract.createMarketSale(nft.contract, nft.itemId, {
      value: price
    })
    await transaction.wait()
    loadNFTs()
  }
  if (loadingState === 'loaded' && !nfts.length) return (<h1 className="px-20 py-10 text-3xl">No items in marketplace</h1>)

  return (
    <div> {/*className="flex justify-center"*/}
      <div className="px-4" style={{ maxWidth: '1600px' }}>
      <h2 className="text-2xl py-2">Items For Sale</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {
            nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                {/* <img src={nft.image} /> */}
                <div className="p-4">
                  <p style={{ height: '64px' }} className="text-2xl font-semibold">{nft.name}</p>
                  <div style={{ height: '70px', overflow: 'hidden' }}>
                    <p className="text-gray-400">{nft.description}</p>
                  </div>
                </div>
                <div className="p-4 bg-black">
                  <p className="text-2xl mb-4 font-bold text-white">{nft.price} MATIC</p>
                  <button className="w-full bg-blue-500 text-white font-bold py-2 px-12 rounded" onClick={() => buyNft(nft)}>Buy</button>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}