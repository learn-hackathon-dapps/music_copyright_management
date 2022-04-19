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
contract CopyrightNFT is Context, ERC1155, AccessControl, ContextMixin { //EIP712, AccessControl
    
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
    
    constructor(address marketplaceAddress, uint256 supply, uint256 royaltyPercentage, string memory tokenName) ERC1155(new string[](7)) 
        // EIP712("LazyNFT-Voucher", "1")
    {
        contractAddress = marketplaceAddress;
        setApprovalForAll(contractAddress, true);
        minted_supply = 0;
        total_supply = supply; // Hard cap
        royalty_percentage = royaltyPercentage; // Secondary Fees
        name = tokenName;
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

    function pause() public {//onlyOwner {
        _pause();
    }

    function unpause() public {//onlyOwner {
        _unpause();
    }

    function getMintedSupply() public view returns (uint256) { return minted_supply; }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal
        whenNotPaused
        override
    {
        /* Keep track of ownership for dividing out payments */
        if (to != contractAddress) {
            // updates mapping(uint256 => address) public owners & mapping(address => uint256) public ownerShares;
            if (from != address(0)) {
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
        uint256 amountDue = (paymentAmount * ownerShares[tokenOwner]) / total_supply; // Calculate Payment due from owned shares and total supply
        return amountDue;
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
}