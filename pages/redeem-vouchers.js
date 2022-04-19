import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Web3Modal from "web3modal"

import {
  nftaddress, nftcopyrightaddress, nftmarketaddress
} from '../config'

import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'

export default function MyAssets() {
  const [myVouchers, setVouchers] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  useEffect(() => {
    loadVouchers()
  }, [])

  async function loadVouchers() {
    let vs = sessionStorage.getItem('vouchers');
    vs = JSON.parse(vs);
    console.log(vs);
    const web3Modal = new Web3Modal({
        network: "mainnet",
        cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner();
    
    let addr = await signer.getAddress();
    if (vs) {
      vs = vs.filter(v => v.redeemer == addr)
      setVouchers(vs)
    }
    setLoadingState('loaded') 
  }

  async function redeem(v) {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner();
    var addr = await signer.getAddress();
    const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, signer);
    // { tokenIds, urls, redeemer }
    // console.log(v)
    var transaction = await marketContract.createMarketRedeemedItems(v.contractAddress, v.tokenIds, v.urls, Array(v.tokenIds.length).fill(1),addr);
    console.log(transaction)
    var vouchers = sessionStorage.getItem('vouchers');
    vouchers = JSON.parse(vouchers);
    // console.log(vouchers)
    vouchers.splice(vouchers.findIndex(item => item.contractAddress === v.contractAddress), 1);
    console.log(vouchers)
    var json = JSON.stringify(vouchers);
    
    
    sessionStorage.setItem('vouchers', json);
    loadVouchers();
  }

  // async function update(v) {
  //   var vouchers = sessionStorage.getItem('vouchers');
  //   vouchers = JSON.parse(vouchers);
  //   console.log(vouchers.findIndex(item => item.contractAddress === v.contractAddress))
  //   vouchers.splice(vouchers.findIndex(item => item.contractAddress === v.contractAddress), 1);
  //   console.log(vouchers)
  //   var json = JSON.stringify(vouchers);
  //   sessionStorage.setItem('vouchers', json);
  // }

  if (loadingState === 'loaded' && !myVouchers.length) return (<h1 className="py-10 px-20 text-3xl">No vouchers to redeem</h1>)
  return (
    <div > {/*className="flex justify-center"*/}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 pt-4">
          {
            myVouchers.map((v, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden ">
                <div className="p-4 bg-black content-center grid grid-cols-1">
                  <h2 className="text-2xl font-bold text-white content-center">Contract Address :</h2>
                  <p className="text-l font-bold text-white content-center">{v.contractAddress}</p>
                  <p className="text-2xl font-bold text-white content-center">Tokens : {v.tokenIds.length}</p>
                  <button onClick={() => redeem(v)} className="font-bold mt-4 bg-blue-500 text-white rounded p-4 shadow-lg">
                    Redeem Voucher and Mint Tokens
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

