import { useState } from 'react'
import { ethers } from 'ethers'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'
import axios from 'axios';
import { create as ipfsHttpClient } from 'ipfs-http-client'

import {
  nftmarketaddress
} from '../config'
import {LazyMinter} from './LazyMinter'

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

import CopyrightNFT from '../artifacts/contracts/CopyrightNFT.sol/CopyrightNFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'

export default function CreateContract() {

  const [formInput, updateFormInput] = useState({ cap: '', name: '', royalty: 0, shares: '', asset_description: '', asset_name: '' })
  const [fileUrl, setFileUrl] = useState(null)
  // const [vouchers, setVouchers] = useState(null)
  const router = useRouter()

  async function onChange(e) {
    const file = e.target.files[0]
    let urls = []
    try {
      for (let i = 0; i < formInput.cap; i++) {
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

  function prepareRightsHolders(arr) {
    var ids = [], rightsHolders = [], index = 0;
    var map = new Map();
    for (var i=0; i<arr.length; i=i+2) {
      var addr = arr[i];
      map.set(addr, {tokenStart:index, shares:arr[i+1]})
      // console.log(ethers.utils.isAddress(addr));
      for (var j=0; j<arr[i+1]; j++) {
        ids.push(index);
        index++;
        rightsHolders.push(addr);
      }
    }
    // return (ids, rightsHolders, map);
    return { ids, rightsHolders, map };
  }

  function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  async function createMarket() {
    const { asset_name, asset_description, cap} = formInput
    if (!asset_name || !asset_description || !fileUrl) return
    /* first, upload to IPFS */
    var metadataUrls = [];
    for (let i = 0; i < formInput.cap; i++) {
      var data = JSON.stringify({
        name: asset_name, description: asset_description, image: fileUrl[i], supply: cap
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
    console.log(metadataUrls);
    deployContract(metadataUrls)
  }


  async function deployContract(metadataUrls) {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)    
    const signer = provider.getSigner()

    // Deploy Contract
    // TODO might need to change to 127.0. (double check what this should be) so that they can interact, connected to same wifi, dangerous
    const res = await axios.get(`http://localhost:5500/deploy`)
    const { data } = await res;
    let contractAddress = data.slice(0, -1);
    console.log(contractAddress);
    console.log(ethers.utils.isAddress(contractAddress));
    // Make Longer/Shorter
    await delay(20000);
    // let contractAddress = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788';

    let tokenContract = new ethers.Contract(contractAddress, CopyrightNFT.abi, signer);

    // Prepare ids and rights holders
    var arr = formInput.shares.split(',');
    var temp = prepareRightsHolders(arr);
    var ids = temp.ids, rightsHolders = temp.rightsHolders, map=temp.map

    // Create Vouchers
    await tokenContract.deployed();

    let transaction = await tokenContract.createContractConstructor(nftmarketaddress, formInput.cap, formInput.royalty, formInput.asset_name);
    let tx = await transaction.wait()

    // Create Asset Names & Descriptions
    const lazyminter = await new LazyMinter({ contract: tokenContract, signer: provider.getSigner()});
    var vouchers = [];
    for (let [key, value] of map) {
      var v = lazyminter.createVoucher(ids.slice(value.tokenStart, value.tokenStart+value.shares),metadataUrls.slice(value.tokenStart, value.tokenStart+value.shares),key);
      vouchers.push(v);
    }
    // console.log(vouchers)
    // setVouchers(vouchers);
    var jsonObject = new Array();
    for (var i=0; i<vouchers.length; i++) {
      await vouchers[i].then(function(response) {
          response['contractAddress'] = contractAddress;
          jsonObject.push(response);
      }).catch(function(error) {
          console.log(error);
      });
    }
    console.log(jsonObject)
    // Save Vouchers in Session Storage
    var oldVouchers = sessionStorage.getItem('vouchers');
    if (oldVouchers) {
      oldVouchers = JSON.parse(oldVouchers);
      oldVouchers.splice(2, 1);
      jsonObject = jsonObject.concat(oldVouchers);
    }
    var json = JSON.stringify(jsonObject);
    sessionStorage.setItem('vouchers', json);

    // Add Contract to Market List
    let marketContract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    transaction = await marketContract.createContract(contractAddress, formInput.name, ids, rightsHolders);
    tx = await transaction.wait()

    // Leave this Page
    router.push('/contracts')
  }


  return (
    <div className="flex justify-center"> {/*className="flex justify-center"*/}
      <div className="w-1/2 flex flex-col pb-12">
        <input 
          placeholder="Contract Name"
          className="mt-8 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
        />
        <input
          placeholder="Secondary Fee Percentage eg. 10"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, royalty: e.target.value })}
        />
        <input 
          placeholder="Asset Name"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, asset_name: e.target.value })}
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, asset_description: e.target.value })}
        />
        <input
          placeholder="Asset Cap"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, cap: e.target.value })}
        />
        <input
          placeholder="Ownership Shares"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, shares: e.target.value })}
        />
        <input
          type="file"
          name="Asset"
          className="my-4"
          onChange={onChange}
        />
        {
          fileUrl && <p>Uploaded to IPFS</p>
        }
        <button onClick={createMarket} className="font-bold mt-4 bg-blue-500 text-white rounded p-4 shadow-lg">
          Create NFT and put up for sale
        </button>
      </div>
    </div>
  )
}