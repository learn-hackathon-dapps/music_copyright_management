import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Web3Modal from "web3modal"

import {
  nftaddress, nftcopyrightaddress, nftmarketaddress
} from '../config'

import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import CopyrightNFT from '../artifacts/contracts/CopyrightNFT.sol/CopyrightNFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'

export default function MyAssets() {
  const router = useRouter()
  const [nfts, setNfts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const [formInput, updateFormInput] = useState({ price: '',})
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

    const data = await marketContract.fetchMyNFTs()
    
    var items = await Promise.all(data.map(async i => {
      const tokenContract = new ethers.Contract(i.nftContract, CopyrightNFT.abi, provider)
      const tokenUris = await tokenContract.uri(i.tokenId)
      const tokenUri = tokenUris[i.tokenId];
      const meta = await axios.get(tokenUri) //TODO Update
      let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
      console.log(i)
      let item = {
        price,
        tokenId: i.tokenId.toNumber(),
        seller: i.seller,
        owner: i.owner,
        name: meta.data.name,
        description: meta.data.description,
        image: meta.data.image,
        contract: i.nftContract,
        itemId: i.itemId
      }
      return item
    }))

    setNfts(items)
    setLoadingState('loaded') 
  }

  async function tryToWithdraw(contractAddress) {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner();
    var addr = await signer.getAddress();
    console.log()
    const tokenContract = new ethers.Contract(contractAddress, CopyrightNFT.abi, signer);
    var transaction = await tokenContract.release(addr)
    console.log(transaction)
  }

  async function putUpForSale(nft) {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner();
    const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, signer);
    let listingPrice = await marketContract.getListingPrice()
    listingPrice = listingPrice.toString();
    const nftPrice = ethers.utils.parseUnits(formInput.price, 'ether')
    var transaction = await marketContract.listMarketItem(nft.contract, nft.itemId, nftPrice, { value: listingPrice });
    console.log(transaction)

    // router.push('/')
  }

  if (loadingState === 'loaded' && !nfts.length) return (<h1 className="py-10 px-20 text-3xl">No assets owned</h1>)
  return (
    <div > {/*className="flex justify-center"*/}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 pt-4">
          {
            nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden ">
                {/* <img src={nft.image} className="rounded" /> */}
                <div className="p-4 bg-black content-center grid grid-cols-1">
                  <p className="text-2xl font-bold text-white content-center">Name - {nft.name}</p>
                  <p><a href={nft.image} className="text-xl text-blue-500">Link to File</a></p>
                  {/* <p className="text-2xl text-white">URL - {nft.image}</p> */}
                  <div className="p-4 bg-black content-center grid grid-cols-2">
                  <input
                    placeholder="Listing Price"
                    className="mt-4 border rounded p-4"
                    onChange={e => updateFormInput({ ...formInput, price: e.target.value })}
                  />
                  <button onClick={() => putUpForSale(nft)} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
                    Put Up for Sale
                  </button>
                  </div>
                  <button onClick={() => tryToWithdraw(nft.contract)} className="font-bold mt-4 bg-blue-500 text-white rounded p-4 shadow-lg">
                    Withdraw Payment
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

