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

export default function MyContracts() {
  const [formInput, updateFormInput] = useState({ amount: '' })
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

    const items = await Promise.all(data.map(async i => {
      let item = {
        itemId: i.itemId.toNumber(),
        title: i.title,
        owner: i.owner,
        nftContract: i.nftContract
      }
      return item
    }))
    console.log(items)
    setContracts(items)
    setLoadingState('loaded') 
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
      const options = {value: ethers.utils.parseEther(String(formInput.amount))}
      var data = await marketContract.sendToContract(nftContractAddress, options)
      console.log(data);
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

  if (loadingState === 'loaded' && !contracts.length) return (<h1 className="py-10 px-20 text-3xl">No contracts deployed</h1>)
  return (
    <div > {/*className="flex justify-center"*/}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-4 pt-4">
          {
            contracts.map((contract, i) => (
              <div key={i} className="border shadow rounded-xl overflow-auto">
                {/* <img src={nft.image} className="rounded" /> */}
                <div className="p-4 bg-black">
                  <p className="text-2xl font-bold text-white">Name - {contract.title}</p>
                  <p className="text-l text-white">Contract Address - {contract.nftContract}</p>
                  <div className="p-1 grid grid-cols-2">
                    <input
                      placeholder="Payment Amount in Eth"
                      className="mt-2 border rounded p-2"
                      onChange={e => updateFormInput({ ...formInput, amount: e.target.value })}
                    />
                    <button onClick={() => makePayment(contract.nftContract)} className="font-bold mt-2 bg-blue-500 text-white rounded p-2 shadow-lg align-middle">
                      Make Payment
                    </button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

