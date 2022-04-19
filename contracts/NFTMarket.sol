// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./CopyrightNFT.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import "hardhat/console.sol";

contract NFTMarket is ReentrancyGuard, ERC1155Holder, EIP712 {
  using Counters for Counters.Counter;
  Counters.Counter private _itemIds;
  Counters.Counter private _itemsSold;

  address payable owner;
  uint256 listingPrice = 0.025 ether;

  constructor() 
  EIP712("LazyNFT-Voucher", "1")
  {
    owner = payable(msg.sender);
  }

  struct ContractsItem {
    uint itemId;
    string title;
    address nftContract;
    address payable owner;
  }

  /* Lazy Minting Voucher Functionality */
  struct NFTVoucher {
      uint256[] tokenIds;
      string[] urls;
      address redeemer;
      bytes signature;
  }

  // Index Starts at 1 so that we can check for zero mapping (Implemented in Function by adding first)
  uint256 contractId = 0;
  mapping(uint256 => ContractsItem) public idTocontractItem;
  mapping(address => uint256) public contractAddressToId;

  struct MarketItem {
    uint itemId;
    address nftContract;
    uint256 tokenId;
    address payable seller;
    address payable owner;
    uint256 price;
    bool sold;
  }

  mapping(uint256 => MarketItem) private idToMarketItem;

  event MarketItemCreated (
    uint indexed itemId,
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    address owner,
    uint256 price,
    bool sold
  );

  event ContractCreated (
    uint indexed itemId,
    string title,
    address indexed nftContract,
    address owner
  );

  /* Returns the listing price of the contract */
  function getListingPrice() public view returns (uint256) {
    return listingPrice;
  }
  
  /* Places an item for sale on the marketplace */
  function createMarketItem(
    address nftContract,
    uint256 tokenId,
    uint256 price
  ) public payable { //nonReentrant
    require(price > 0, "Price must be at least 1 wei");
    require(msg.value == listingPrice, "Price must be equal to listing price");
    
    // createContract(nftContract, Strings.toHexString(uint256(uint160(nftContract)), 20));

    _itemIds.increment();
    uint256 itemId = _itemIds.current();
  
    idToMarketItem[itemId] =  MarketItem(
      itemId,
      nftContract,
      tokenId,
      payable(msg.sender),
      payable(address(0)),
      price,
      false
    );

    // 721
    // IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
    // 1155
    IERC1155(nftContract).safeTransferFrom(msg.sender,address(this),tokenId,1,"");
    
    emit MarketItemCreated(
      itemId,
      nftContract,
      tokenId,
      msg.sender,
      address(0),
      price,
      false
    );
  }

  /* Places batch minted items for sale on the marketplace */
  function createMarketItems(
    address nftContract,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    uint256 price
  ) public payable  { //nonReentrant
    require(price > 0, "Price must be at least 1 wei");
    require(msg.value == listingPrice, "Price must be equal to listing price");
    // createContract(nftContract, Strings.toHexString(uint256(uint160(nftContract)), 20));
    uint256 itemId = 0;
    for (uint256 i = 0; i < tokenIds.length; i++) {
        _itemIds.increment();
        itemId = _itemIds.current();

        idToMarketItem[itemId] =  MarketItem(
          itemId,
          nftContract,
          tokenIds[i],
          payable(msg.sender),
          payable(address(0)),
          price,
          false
        );
    }
  }

  /* Places an item for sale on the marketplace */
  function listMarketItem(
    address nftContract,
    uint256 itemId,
    uint256 price
  ) public payable { //nonReentrant
    require(price > 0, "Price must be at least 1 wei");
    require(msg.value == listingPrice, "Price must be equal to listing price");
    
    MarketItem memory item = idToMarketItem[itemId];
  
    idToMarketItem[itemId] =  MarketItem(
      itemId,
      nftContract,
      item.tokenId,
      payable(msg.sender),
      payable(address(0)),
      price,
      false
    );

    // 721
    // IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
    // 1155
    IERC1155(nftContract).safeTransferFrom(msg.sender,address(this),item.tokenId,1,"");
    
    emit MarketItemCreated(
      itemId,
      nftContract,
      item.tokenId,
      msg.sender,
      address(0),
      price,
      false
    );
  }

    // function redeem(address nftContract, NFTVoucher calldata voucher, uint256[] memory amounts) public returns (uint256[] memory) {
    // // function redeem(uint256[] memory tokenIds, string[] memory uris, uint256[] memory amounts) public returns (uint256[] memory) {
    //   // address signer = _verify(voucher);
    //   return CopyrightNFT(payable(nftContract)).redeem(voucher.tokenIds, voucher.urls, amounts);
    // }

    /* Places batch minted items for sale on the marketplace */
    function createMarketRedeemedItems(
      address nftContract,
      uint256[] memory tokenIds,
      string[] memory urls,
      uint256[] memory amounts,
      address redeemer
    ) public payable { //nonReentrant
      // require(price > 0, "Price must be at least 1 wei");
      // require(msg.value == listingPrice, "Price must be equal to listing price");
      CopyrightNFT(payable(nftContract)).redeem(tokenIds, urls, amounts, redeemer);

      uint256 itemId = 0;
      for (uint256 i = 0; i < tokenIds.length; i++) {
          _itemIds.increment();
          itemId = _itemIds.current();

          idToMarketItem[itemId] =  MarketItem(
            itemId,
            nftContract,
            tokenIds[i],
            payable(msg.sender),
            payable(msg.sender),
            0,
            true
          );
      }
    
    emit MarketItemCreated(
      itemId,
      nftContract,
      tokenIds[0],
      msg.sender,
      address(0),
      0,
      true
    );
  }

  /* Creates the sale of a marketplace item */
  /* Transfers ownership of the item, as well as funds between parties */
  function createMarketSale(
    address nftContract,
    uint256 itemId
    ) public payable  { //nonReentrant
    uint price = idToMarketItem[itemId].price;
    uint256 tokenId = idToMarketItem[itemId].tokenId;
    require(msg.value == price, "Please submit the asking price in order to complete the purchase");

    /* Make Secondary Fees Payment Assignment (Not for Minting) */
    (address[] memory receivers, uint256 royaltyAmount) = CopyrightNFT(payable(nftContract)).royaltyInfo(tokenId, msg.value);
    for (uint256 j=0; j < receivers.length; j++) {
      payable(receivers[j]).transfer(royaltyAmount/receivers.length);
    }
    uint256 toSeller = msg.value - royaltyAmount;
    idToMarketItem[itemId].seller.transfer(toSeller);

    // if (_receiver == idToMarketItem[itemId].seller) {
    //   idToMarketItem[itemId].seller.transfer(msg.value);
    // } else {
    //   uint256 toSeller = msg.value - royaltyAmount;
    //   idToMarketItem[itemId].seller.transfer(toSeller);
    //   payable(_receiver).transfer(royaltyAmount);
    // }
  
    // IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
    IERC1155(nftContract).safeTransferFrom(address(this),msg.sender,tokenId,1,"");

    idToMarketItem[itemId].owner = payable(msg.sender);
    idToMarketItem[itemId].sold = true;
    _itemsSold.increment();
    // payable(owner).transfer(listingPrice);
  }

  function createContract(
    address nftContract,
    string memory title,
    uint256[] memory ids, 
    address[] memory rightsHolders
  ) public payable  { //nonReentrant
    
    if (contractAddressToId[nftContract] == 0) {
      contractId = contractId + 1;
      contractAddressToId[nftContract] = contractId;
      idTocontractItem[contractId] = ContractsItem (
        contractId,
        title,
        nftContract,
        payable(msg.sender)
      );
      // CopyrightNFT(payable(nftContract)).createContractConstructor(marketplaceAddress, supply, royaltyPercentage, ids, rightsHolders);

      CopyrightNFT(payable(nftContract)).addVouchers(ids, rightsHolders);

    }

    emit ContractCreated(
      contractId,
      title,
      nftContract,
      payable(msg.sender)
    );
  }

  // /* Returns all unsold market items */
  // function fetchMarketItems() public view returns (MarketItem[] memory) {
  //   uint itemCount = _itemIds.current();
  //   // uint unsoldItemCount = _itemIds.current() - _itemsSold.current();
  //   uint currentIndex = 0;

  //   MarketItem[] memory items = new MarketItem[](itemCount);
  //   for (uint i = 0; i < itemCount; i++) {
  //     if (idToMarketItem[i + 1].owner == address(0)) {
  //       uint currentId = i + 1;
  //       MarketItem storage currentItem = idToMarketItem[currentId];
  //       items[currentIndex] = currentItem;
  //       currentIndex += 1;
  //     }
  //   }
  //   return items;
  // }

  /* Returns all unsold market items */
  function fetchAllMarketItems() public view returns (MarketItem[] memory) {
    uint itemCount = _itemIds.current();
    uint currentIndex = 0;

    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint i = 0; i < itemCount; i++) {
      uint currentId = i + 1;
      MarketItem storage currentItem = idToMarketItem[currentId];
      items[currentIndex] = currentItem;
      currentIndex += 1;
    }
    return items;
  }

  /* Returns onlyl items that a user has purchased */
  function fetchMyNFTs() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].owner == msg.sender || idToMarketItem[i+1].seller == msg.sender) {
        itemCount += 1;
      }
    }

    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].owner == msg.sender || idToMarketItem[i+1].seller == msg.sender) {
        uint currentId = i + 1;
        MarketItem storage currentItem = idToMarketItem[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    return items;
  }

  /* Returns only items that a user has purchased */
  function fetchMyContracts() public view returns (ContractsItem[] memory) {
    uint totalItemCount = contractId;
    uint itemCount = 0;
    uint currentIndex = 0;

    // for (uint i = 0; i < totalItemCount; i++) {
    //   if (idTocontractItem[i + 1].owner == msg.sender) {
    //     itemCount += 1;
    //   }
    // }

    ContractsItem[] memory items = new ContractsItem[](totalItemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      // if (idTocontractItem[i + 1].owner == msg.sender) {
      uint currentId = i + 1;
      ContractsItem storage currentItem = idTocontractItem[currentId];
      items[currentIndex] = currentItem;
      currentIndex += 1;
      // }
    }
    return items;
  }

   /* Returns only items that a user has purchased */
  function fetchAllContracts() public view returns (ContractsItem[] memory) {
    uint totalItemCount = contractId;
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      itemCount += 1;
    }

    ContractsItem[] memory items = new ContractsItem[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      uint currentId = i + 1;
      ContractsItem storage currentItem = idTocontractItem[currentId];
      items[currentIndex] = currentItem;
      currentIndex += 1;
    }
    return items;
  }

  /* Returns only items a user has created */
  function fetchItemsCreated() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].seller == msg.sender) {
        itemCount += 1;
      }
    }

    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].seller == msg.sender) {
        uint currentId = i + 1;
        MarketItem storage currentItem = idToMarketItem[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    return items;
  }

  // sendViaCall
  function sendToContract(address payable _to) public payable {
      // Call returns a boolean value indicating success or failure.
      // This is the current recommended method to use.
      (bool sent, bytes memory data) = _to.call{value: msg.value}("");
      require(sent, "Failed to send Ether");
  }

  /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain. A signed voucher can be redeemed for a real NFT using the redeem function.
    // struct NFTVoucher {
    //     uint256[] tokenIds;
    //     string[] uris;
    //     address redeemer;
    //     bytes signature;
    // }

    /// @notice Returns a hash of the given NFTVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher An NFTVoucher to hash.
    // function _hash(NFTVoucher calldata voucher) internal view returns (bytes32) {
    //     return _hashTypedDataV4(keccak256(abi.encode(
    //     keccak256("NFTVoucher(uint256[] tokenIds,string[] uris,address redeemer)"),
    //     voucher.tokenIds,
    //     voucher.urls,
    //     voucher.redeemer
    //     )));
    // }

    /// @notice Returns the chain id of the current blockchain.
    /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
    ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
    // function getChainID() external view returns (uint256) {
    //     uint256 id;
    //     assembly {
    //         id := chainid()
    //     }
    //     return id;
    // }

    /// @notice Verifies the signature for a given NFTVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher An NFTVoucher describing an unminted NFT.
    // function _verify(NFTVoucher calldata voucher) internal view returns (address) {
    //     bytes32 digest = _hash(voucher);
    //     return ECDSA.recover(digest, voucher.signature);
    // }



}