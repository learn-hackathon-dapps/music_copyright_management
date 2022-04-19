import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Web3Modal from "web3modal"

import {
  nftaddress, nftcopyrightaddress, nftmarketaddress
} from '../config'

import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import CopyrightNFT from '../artifacts/contracts/CopyrightNFT.sol/CopyrightNFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'

export default function CreatorDashboard() {
  const [formInput, updateFormInput] = useState({ amount: '' })
  const [nfts, setNfts] = useState([])
  const [sold, setSold] = useState([])
  const [contracts, setContracts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  useEffect(() => {
    loadNFTs()
  }, [])

  async function loadNFTs() {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
      
    const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    // const tokenContract = new ethers.Contract(nftaddress, NFT.abi, provider)
    // const tokenContract = new ethers.Contract(nftcopyrightaddress, CopyrightNFT.abi, provider)

    const data = await marketContract.fetchMyContracts()
    // const nftData = await marketContract.fetchAllMarketItems() // TODO
    var items = await Promise.all(data.map(async i => {
      const tokenContract = new ethers.Contract(i.nftContract, CopyrightNFT.abi, provider)
      // const tokenUri = await tokenContract.tokenURI(i.tokenId)
      const tokenOwner = await tokenContract.owner();
      if (signer.getAddress()==tokenOwner) {
        const tokenUris = await tokenContract.uri(i.tokenId)
        const tokenUri = tokenUris[i.tokenId];
        const meta = await axios.get(tokenUri)
        let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          sold: i.sold,
          name: meta.data.name,
          description: meta.data.description,
          image: meta.data.image,
          contract: i.nftContract,

        }
        return item
      }
    }))
    items = items.filter(function( element ) {
      return element !== undefined;
   });
    /* seperate by contract */
    var uniqueContractAddresses = [...new Set(items.map(item => item.contract))];
    // get the contract instances

    /* create a filtered array of items that have been sold */
    const soldItems = items.filter(i => i.sold)
    setContracts(uniqueContractAddresses)
    setSold(soldItems)
    setNfts(items)
    setLoadingState('loaded') 
  }

  function getListOfNFTs() {
    return contracts.map((value) => {
      let contractNfts = nfts.filter(j => j.contract === value)
      // let supply = parseInt(contractNfts[0].supply)
      let theNfts = contractNfts.map((nft, i) => (
        <div key={i} className="border shadow rounded-xl overflow-hidden">
          {/* <img src={nft.image} className="rounded" /> */}
          <div className="p-4 bg-black">
            <div className="grid grid-cols-2">
              <p className="text-2xl font-bold text-white">Name - {nft.name}</p>
              <p className="text-2xl text-white text-right">#{nft.tokenId}</p>
            </div>
            <p className="text-xl text-white">Description - {nft.description}</p>
            <a href={nft.image} className="text-xl text-blue-500">Link to File</a>
          </div>
        </div>
      ))
      return (
        <div className="m-2 p-4 bg-gray-200 border rounded outline outline-1 outline-gray-300" key={value}>
        <h2 className="font-bold text-2xl py-2">{value}</h2>
        <div className="p-1 grid grid-cols-2">
          <input
            placeholder="Payment Amount in Eth"
            className="mt-2 border rounded p-2"
            onChange={e => updateFormInput({ ...formInput, amount: e.target.value })}
          />
          <button onClick={() => tester(value)} className="font-bold mt-2 bg-blue-500 text-white rounded p-2 shadow-lg align-middle">
            Make Payment
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {theNfts}
        </div>
      </div>
      )
    }) 
  }

  async function makePayment(nftContractAddress) {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
      
    const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    const tokenContract = new ethers.Contract(nftContractAddress, CopyrightNFT.abi, signer)
    try {
      var amountDue = await tokenContract.getAmountDue(formInput.amount)
      console.log(amountDue)
      // amountDue=8;
      if (amountDue != 0) {
        const options = {value: ethers.utils.parseEther(String(amountDue))}
        var data = await marketContract.sendToContract(nftContractAddress, options)
        console.log(data);
      } else {
        console.log('Payment not due')
      }
      
    } catch (error) {
      console.error(error);
    }
  }

  async function tester(nftContractAddress) {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
      
    const tokenContract = new ethers.Contract(nftContractAddress, CopyrightNFT.abi, signer)
    try {
      const signer = provider.getSigner();
      var addr = await signer.getAddress();
      console.log(addr)
      var data = await tokenContract.payments(addr);
      console.log(data);
      data = await tokenContract.getBalance();
      console.log(data);
      data = await tokenContract.getMintedSupply();
      console.log(data);
      data = await tokenContract.getAmountDue(200);
      console.log(data);
      // data = await tokenContract.getAmountDue(36);
      // console.log(data);

    } catch (error) {
      console.error(error);
    }

  }



  if (loadingState === 'loaded' && !nfts.length) return (<h1 className="py-10 px-20 text-3xl">No assets created</h1>)
  return (
    <div>
        {getListOfNFTs()}
        <div className="px-4">
        {
          Boolean(sold.length) && (
            <div>
              <h2 className="text-2xl py-2">Items sold</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                {
                  sold.map((nft, i) => (
                    <div key={i} className="border shadow rounded-xl overflow-hidden">
                      {/* // comment out <img src={nft.image} className="rounded" /> */}
                      <div className="p-4 bg-black">
                        <div className="grid grid-cols-2">
                          <p className="text-2xl font-bold text-white">Name - {nft.name}</p>
                          <p className="text-2xl text-white text-right">#{nft.tokenId}</p>
                        </div>
                        <p className="text-xl text-white">Description - {nft.description}</p>
                        <p className="text-xl text-white">Price - {nft.price} Eth</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )
        }
        </div>
    </div>
  )
}