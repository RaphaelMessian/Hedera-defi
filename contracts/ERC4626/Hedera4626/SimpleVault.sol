//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {BasicHedera4626} from "./BasicHedera4626.sol";
import {ERC20} from "../ERC20.sol";
import "../../common/safe-HTS/SafeHTS.sol";
import "../../common/safe-HTS/IHederaTokenService.sol";

contract SimpleVault is BasicHedera4626 {

    using Bits for uint256;
    // a mapping that checks if a user has deposited the token
    mapping(address => uint256) public shareHolder;

    constructor(
        ERC20 _asset,
        string memory _name,
        string memory _symbol
    ) payable BasicHedera4626(_asset, _name, _symbol) {
        SafeHTS.safeAssociateToken(address(_asset), address(this));
        uint256 supplyKeyType;
        uint256 adminKeyType;

        IHederaTokenService.KeyValue memory supplyKeyValue;
        supplyKeyType = supplyKeyType.setBit(4);
        supplyKeyValue.delegatableContractId = address(this);

        IHederaTokenService.KeyValue memory adminKeyValue;
        adminKeyType = adminKeyType.setBit(0);
        adminKeyValue.delegatableContractId = address(this);

        IHederaTokenService.TokenKey[]
            memory keys = new IHederaTokenService.TokenKey[](2);

        keys[0] = IHederaTokenService.TokenKey(supplyKeyType, supplyKeyValue);
        keys[1] = IHederaTokenService.TokenKey(adminKeyType, adminKeyValue);

        IHederaTokenService.Expiry memory expiry;
        expiry.autoRenewAccount = address(this);
        expiry.autoRenewPeriod = 8000000;

        IHederaTokenService.HederaToken memory newToken;
        newToken.name = _name;
        newToken.symbol = _symbol;
        newToken.treasury = address(this);
        newToken.expiry = expiry;
        newToken.tokenKeys = keys;
        newTokenAddress = SafeHTS.safeCreateFungibleToken(newToken, 0, _asset.decimals());
        emit createdToken(newTokenAddress);
    }

    /**
     * @notice function to deposit assets and receive vault tokens in exchange
     * @param _assets amount of the asset token
     */
    function _deposit(uint _assets, address receiver) public {
        // checks that the deposited amount is greater than zero.
        require(_assets > 0, "Deposit less than Zero");
        // calling the deposit function from the ERC-4626 library to perform all the necessary functionality
        deposit(_assets, receiver);
        // Increase the share of the user
        shareHolder[msg.sender] += _assets;
    }

    /**
     * @notice Function to allow msg.sender to withdraw their deposit plus accrued interest
     * @param _shares amount of shares the user wants to convert
     * @param _receiver address of the user who will receive the assets
     */
    function _withdraw(uint _shares, address _receiver) public {
        // checks that the deposited amount is greater than zero.
        require(_shares > 0, "withdraw must be greater than Zero");
        // Checks that the _receiver address is not zero.
        require(_receiver != address(0), "Zero Address");
        // checks that the caller is a shareholder
        require(shareHolder[msg.sender] > 0, "Not a share holder");
        // checks that the caller has more shares than they are trying to withdraw.
        require(shareHolder[msg.sender] >= _shares, "Not enough shares");
        // Calculate the total asset amount as the sum of the share amount plus 10% of the share amount.
        uint256 assets = _shares;
        // calling the redeem function from the ERC-4626 library to perform all the necessary functionality
        redeem(assets, _receiver, msg.sender);
        // Decrease the share of the user
        shareHolder[msg.sender] -= _shares;
    }

    // returns total number of assets
    function totalAssets() public view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    // returns total balance of user
    function totalAssetsOfUser(address _user) public view returns (uint256) {
        return asset.balanceOf(_user);
    }
}

library Bits {
    uint256 internal constant ONE = uint256(1);

    // Sets the bit at the given 'index' in 'self' to '1'.
    // Returns the modified value.
    function setBit(uint256 self, uint8 index) internal pure returns (uint256) {
        return self | (ONE << index);
    }
}
