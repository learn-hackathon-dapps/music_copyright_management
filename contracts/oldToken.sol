// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
// import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
// import "./NFTMarket.sol";
// import "@openzeppelin/contracts/utils/ContextMixin.sol";


// Ownable, ContextMixin 
contract CopyrightNFT is Context, ERC1155, Ownable, Pausable  { //EIP712, AccessControl
    
    using Strings for uint256;
    // string public name;
    uint256 public total_supply;
    uint256 public minted_supply;
    string public name;
    // bool[] public minted;
    mapping(uint256 => address) public owners;
    mapping(address => uint256) public ownerShares;
    address public contractAddress;
    // address public _recipient;
    address[] public _recipients;
    uint256 public royalty_percentage;
    mapping(address => uint256) public payments;
    mapping(address => uint256) public paymentsAssigned;
    NFTVoucher public myVoucher;
    
    // string private constant SIGNING_DOMAIN = "LazyNFT-Voucher";
    // string private constant SIGNATURE_VERSION = "1";
    
    constructor() ERC1155(new string[](7)) 
        // EIP712("LazyNFT-Voucher", "1")
    {
        // minted_supply = 0;
        // total_supply = 14; // Hard cap to be passed in
        // royalty_percentage = 10; // Secondary Fees to be passed in
        // _recipient = owner();
    }

    // function createContractConstructor(address marketplaceAddress, uint256 supply, uint256 royaltyPercentage, uint256[] memory ids, address[] memory rightsHolders) public { //onlyOwner
    function createContractConstructor(address marketplaceAddress, uint256 supply, uint256 royaltyPercentage, string memory tokenName) public { //onlyOwner
        contractAddress = marketplaceAddress;
        setApprovalForAll(contractAddress, true);
        minted_supply = 0;
        total_supply = supply; // Hard cap
        royalty_percentage = royaltyPercentage; // Secondary Fees
        name = tokenName;
        // _recipient = owner();
        // require(ids.length == total_supply, "Not all shares accountable");
        // Set up for vouchers
        
    }

    function addVouchers(uint256[] memory ids, address[] memory rightsHolders) public {
        string[] memory uris = new string[](ids.length);
        _setURI(uris);
        for (uint256 i = 0; i < ids.length; i++) {
            owners[ids[i]] = rightsHolders[i];
            if (ownerShares[rightsHolders[i]]==0){
                _recipients.push(rightsHolders[i]);
            }
            ownerShares[rightsHolders[i]] += 1;
        }
    }

    // function setURI(string[] memory newuri)
    //     public 
    //     // onlyOwner 
    // {
    //     _setURI(newuri);
    // }

    // function createToken(string memory tokenURI) public returns (uint) {
    //     mint(msg.sender); // mint the token
    //     string[] memory uris = uri(minted_supply);
    //     uris[minted_supply] = tokenURI;
    //     setURI(uris); // generate the URI
    //     setApprovalForAll(contractAddress, true); // grant transaction permission to marketplace
    //     return minted_supply;
    // }

    // function createTokens(string[] memory tokenURIs, uint256[] memory ids, uint256[] memory amounts) public returns (uint[] memory) {
    //     mintBatch(msg.sender, ids, amounts); // batch mint the tokens
        
    //     // TODO check will this work for all the batch tokens
    //     string[] memory uris = uri(minted_supply);
    //     for (uint256 i = 0; i < ids.length; i++) {
    //         uris[ids[i]] = tokenURIs[i];
    //     }
    //     setURI(uris);
    //     // setURI(tokenURI); // generate the URI
    //     setApprovalForAll(contractAddress, true); // grant transaction permission to marketplace
    //     return ids; // Need to return all ids to create market items with them
    // }

    function pause() public {//onlyOwner {
        _pause();
    }

    function unpause() public {//onlyOwner {
        _unpause();
    }

    function getMintedSupply() public view returns (uint256) { return minted_supply; }

    // function mint(address account) public { // onlyOwner
    //     require((minted_supply + 1) <= total_supply, "ERC1155: will exceed token maximum editions");
    //     _mint(account, minted_supply, 1, "");
    //     minted_supply = minted_supply + 1;
    // }


    // function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) public { //onlyOwner
    //     require((minted_supply + ids.length) <= total_supply, "ERC1155: will exceed token maximum editions");
    //     _mintBatch(to, ids, amounts, "");
    //     minted_supply += ids.length;
    // }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal
        whenNotPaused
        override
    {
        /* Keep track of ownership for dividing out payments */
        if (to != contractAddress) {
            // updates mapping(uint256 => address) public owners & mapping(address => uint256) public ownerShares;
            if (from == address(0)) {
                // if address(0) then this is a minting
                // for (uint256 i = 0; i < ids.length; i++) {
                //     owners[ids[i]] = to;
                //     ownerShares[to] += 1;
                // }
            } else {
                // token transfer (remove old owner & add new)
                for (uint256 i = 0; i < ids.length; i++) {
                    address actualFrom = owners[ids[i]];
                    owners[ids[i]] = to;
                    ownerShares[actualFrom] -= 1;
                    ownerShares[to] += 1;
                }
            }
        }
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    //  /** @dev URI override for OpenSea traits compatibility. */
    // function uri(uint256 tokenId) override public view returns (string memory) {
    //     // Tokens minted above the supply cap will not have associated metadata.
    //     require(tokenId >= 1 && tokenId <= total_supply, "ERC1155Metadata: URI query for nonexistent token");
    //     return string(abi.encodePacked(_uriBase, Strings.toString(tokenId), ".json"));
    // }

    /** @dev Shares Dividends Implementation */

    // Function to receive Ether. msg.data must be empty
    receive() external payable {
        assignPayments(msg.value);
    }

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function getAmountDue(uint256 paymentAmount) public view returns (uint256) {
        uint256 sold_supply = ownerShares[owner()];
        uint256 amountDue = (paymentAmount * sold_supply) / total_supply; // Calculate Payment due from minted and total supply
        return amountDue;
    }

    function getAmountDuePayee(uint256 paymentAmount, address tokenOwner) private view returns (uint256) {
        // if (tokenOwner != owner()) {
        uint256 amountDue = (paymentAmount * ownerShares[tokenOwner]) / total_supply; // Calculate Payment due from owned shares and total supply
        return amountDue;
        // } else {
            // return 0;
        // }
    }

    function release(address payable account) public virtual {
        uint256 payment = payments[account];
        require(payment != 0, "ReleasePayment: account is not due payment");
        Address.sendValue(account, payment); //(x*1e18)
        payments[account] = 0;
    }

    // function releaseDue(address payable account) public virtual returns(uint256){ return payments[account]; }

    function assignPayments(uint256 paymentAmount)
        public
    {
        // Distribute Funds in accordance with the shares in balance due mapping
        for (uint256 i = 0; i < total_supply; i++) {
            // get amount due to owner
            address ownerAddress = owners[i];
            if (paymentsAssigned[ownerAddress] == 0) {
                paymentsAssigned[ownerAddress] = 1;
                payments[ownerAddress] += getAmountDuePayee(paymentAmount, ownerAddress);
            }
        }
        //reset each mapping. to 0
        for (uint256 i = 0; i < total_supply; i++) {
            paymentsAssigned[owners[i]] = 0;
        }
    }

    /** @dev EIP2981 royalties implementation. */

    // Maintain flexibility to modify royalties recipient (could also add basis points).
    // function setRoyalties(address newRecipient) external onlyOwner {
    //     require(newRecipient != address(0), "Royalties: new recipient is the zero address");
    //     _recipient = newRecipient;
    // }

    // EIP2981 standard royalties return.
    function royaltyInfo(uint256 tokenId, uint256 _salePrice) public view //uint256 _tokenId, 
        returns (address[] memory receiver, uint256 royaltyAmount)
    {
        return (_recipients, (_salePrice * royalty_percentage) / 100);
    }

    /* Lazy Minting Functionality */
    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain. A signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        uint256[] tokenIds;
        string[] uris;
        address redeemer;
        bytes signature;
    }

    // function redeem(NFTVoucher calldata voucher, uint256[] memory amounts) public returns (uint256[] memory) {
    function redeem(uint256[] memory tokenIds, string[] memory uris, uint256[] memory amounts, address redeemer) public returns (uint256[] memory) {

        // make sure that the signer is authorized to mint NFTsuint256 amounts
        // require(hasRole(MINTER_ROLE, signer), "Signature invalid or unauthorized");
        // make sure that the redeemer is paying enough to cover the buyer's cost
        // require(msg.value >= voucher.minPrice, "Insufficient funds to redeem");
        // make sure signature is valid and get the address of the signer
        // address signer = _verify(voucher);
        address signer = owner();
        // mintBatch(signer, voucher.tokenIds, amounts); // batch mint the tokens
        require((minted_supply + tokenIds.length) <= total_supply, "ERC1155: will exceed token maximum editions");
        _mintBatch(msg.sender, tokenIds, amounts, "");
        minted_supply += tokenIds.length;
        
        string[] memory myUris = uri(minted_supply);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            myUris[tokenIds[i]] = uris[i];
            // minted[voucher.tokenIds[i]] = true;
        }
        _setURI(myUris);
        setApprovalForAll(redeemer, true); // grant transaction permission to marketplace
        // safeBatchTransferFrom(signer, redeemer, tokenIds, amounts, "");
        safeBatchTransferFrom(msg.sender, redeemer, tokenIds, amounts, "");

        return tokenIds; // Need to return all ids to create market items with them
    }

    // function supportsInterface(bytes4 interfaceId) public view virtual override (AccessControl, ERC721) returns (bool) {
    //     return ERC721.supportsInterface(interfaceId) || AccessControl.supportsInterface(interfaceId);
    // }

     // /// @notice Returns a hash of the given NFTVoucher, prepared using EIP712 typed data hashing rules.
  // /// @param voucher An NFTVoucher to hash.
  // function _hash(NFTVoucher calldata voucher) internal view returns (bytes32) {
  //     return _hashTypedDataV4(keccak256(abi.encode(
  //     keccak256("NFTVoucher(uint256[] tokenIds,string[] uris,address redeemer)"),
  //     voucher.tokenIds,
  //     voucher.uris,
  //     voucher.redeemer
  //     )));
  // }

  /// @notice Returns the chain id of the current blockchain.
  /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
  ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
  function getChainID() external view returns (uint256) {
      uint256 id;
      assembly {
          id := chainid()
      }
      return id;
  }

  // /// @notice Verifies the signature for a given NFTVoucher, returning the address of the signer.
  // /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
  // /// @param voucher An NFTVoucher describing an unminted NFT.
  // function _verify(NFTVoucher calldata voucher) internal view returns (address) {
  //     bytes32 digest = _hash(voucher);
  //     return ECDSA.recover(digest, voucher.signature);
  // }

}
//marketplace addres example 0x36b58F5C1969B7b6591D752ea6F5486D069010AB