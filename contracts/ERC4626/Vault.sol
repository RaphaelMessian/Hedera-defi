// SPDX-License-Identifier: MIT

pragma solidity ^0.8;
pragma abicoder v2;

import {ERC20} from "./ERC20.sol";
import {IERC4626} from "./IERC4626.sol";
import {FixedPointMathLib} from "./FixedPointMathLib.sol";
import {SafeTransferLib} from "./SafeTransferLib.sol";
import "../common/safe-HTS/SafeHTS.sol";
import "../common/safe-HTS/IHederaTokenService.sol";

contract HederaVault is IERC4626 {

    using SafeTransferLib for ERC20;
    using FixedPointMathLib for uint256;
    using Bits for uint256;

    ERC20 public immutable asset;
    address newTokenAddress;
    uint public totalTokens;
    address[] tokenAddress;
    address public owner;

    event createdToken(address indexed createdTokenAddress);

    constructor (
        ERC20 _underlying,
        string memory _name,
        string memory _symbol
    ) payable ERC20(_name, _symbol, _underlying.decimals()) {
        SafeHTS.safeAssociateToken(address(_underlying), address(this));
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
        newTokenAddress = SafeHTS.safeCreateFungibleToken(newToken, 0, _underlying.decimals());
        emit createdToken(newTokenAddress);
        asset = _underlying;
    }

    struct UserInfo {
        uint num_shares;
        mapping(address => uint) lastClaimedAmountT;
        bool exist;
    }

    struct RewardsInfo {
        uint amount;
        bool exist;
    }

    mapping(address =>  UserInfo) public userContribution;
    mapping (address => RewardsInfo) public rewardsAddress;

    /*///////////////////////////////////////////////////////////////
                        DEPOSIT/WITHDRAWAL LOGIC
    //////////////////////////////////////////////////////////////*/

    function deposit(uint256 amount, address to) public override returns (uint256 shares) {
        require((shares = previewDeposit(amount)) != 0, "ZERO_SHARES");

        asset.approve(address(this), amount);

        asset.safeTransferFrom(msg.sender, address(this), amount);

        totalTokens += amount;

        SafeHTS.safeMintToken(newTokenAddress, uint64(amount), new bytes[](0));

        SafeHTS.safeTransferToken(newTokenAddress, address(this), msg.sender, int64(uint64(amount)));

        emit Deposit(msg.sender, to, amount, shares);

        afterDeposit(amount);
    }

    function mint(uint256 shares, address to) public override returns (uint256 amount) {
        _mint(to, amount = previewMint(shares));

        asset.approve(address(this), amount);

        totalTokens += amount;

        emit Deposit(msg.sender, to, amount, shares);

        asset.safeTransferFrom(msg.sender, address(this), amount);

        afterDeposit(amount);
    }

    function withdraw(
        uint256 amount,
        address to,
        address from
    ) public override returns (uint256 shares) {
        beforeWithdraw(amount);

        SafeHTS.safeTransferToken(newTokenAddress, msg.sender, address(this), int64(uint64(amount)));

        SafeHTS.safeBurnToken(newTokenAddress, uint64(amount), new int64[](0));

        // _burn(from, shares = previewWithdraw(amount));
        totalTokens -= amount;

        emit Withdraw(from, to, amount, shares);

        asset.safeTransfer(to, amount);
    }

    function redeem(
        uint256 shares,
        address to,
        address from
    ) public override returns (uint256 amount) {
        require((amount = previewRedeem(shares)) != 0, "ZERO_ASSETS");

        amount = previewRedeem(shares);
        _burn(from, shares);
        totalTokens -= amount;

        emit Withdraw(from, to, amount, shares);

        asset.safeTransfer(to, amount);
    }

    /*///////////////////////////////////////////////////////////////
                         INTERNAL HOOKS LOGIC
    //////////////////////////////////////////////////////////////*/

    function beforeWithdraw(uint256 amount) internal {
        // claimAllReward(0);
        userContribution[msg.sender].num_shares -= amount;
        totalTokens -= amount;
    }

    function afterDeposit(uint256 amount) internal {
        if(!userContribution[msg.sender].exist) {
            for(uint i; i < tokenAddress.length; i++){
                address token = tokenAddress[i];
                userContribution[msg.sender].lastClaimedAmountT[token] = rewardsAddress[token].amount;
            }
            userContribution[msg.sender].num_shares = amount;
            userContribution[msg.sender].exist = true;
            totalTokens += amount;
        } else {
            claimAllReward(0);
            userContribution[msg.sender].num_shares += amount;
            totalTokens += amount;
        }
    }

    /*///////////////////////////////////////////////////////////////
                        ACCOUNTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function totalAssets() public view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function assetsOf(address user) public view override returns (uint256) {
        return previewRedeem(balanceOf[user]);
    }

    function assetsPerShare() public view override returns (uint256) {
        return previewRedeem(10**decimals);
    }

    function maxDeposit(address) public pure override returns (uint256) {
        return type(uint256).max;
    }

    function maxMint(address) public pure override returns (uint256) {
        return type(uint256).max;
    }

    function maxWithdraw(address user) public view override returns (uint256) {
        return assetsOf(user);
    }

    function maxRedeem(address user) public view override returns (uint256) {
        return balanceOf[user];
    }

    function previewDeposit(uint256 amount) public view override returns (uint256 shares) {
        uint256 supply = totalSupply;

        return supply == 0 ? amount : amount.mulDivDown(1, totalAssets());
    }

    function previewMint(uint256 shares) public view override returns (uint256 amount) {
        uint256 supply = totalSupply;

        return supply == 0 ? shares : shares.mulDivUp(totalAssets(), totalSupply);
    }

    function previewWithdraw(uint256 amount) public view override returns (uint256 shares) {
        uint256 supply = asset.balanceOf(address(this));

        return supply == 0 ? amount : amount.mulDivUp(supply, totalAssets());
    }

    function previewRedeem(uint256 shares) public view override returns (uint256 amount) {
        uint256 supply = totalSupply;

        return supply == 0 ? shares : shares.mulDivDown(totalAssets(), totalSupply);
    }

    /*///////////////////////////////////////////////////////////////
                        REWARDS LOGIC
    //////////////////////////////////////////////////////////////*/

    function addReward(address _token, uint _amount) internal {
        require(_amount != 0, "please provide amount");
        require(totalTokens != 0, "no token staked yet");
        uint perShareRewards;
        perShareRewards = _amount.mulDivDown(1,totalTokens);
        if(!rewardsAddress[_token].exist) {
            tokenAddress.push(_token);
            rewardsAddress[_token].exist = true;
            rewardsAddress[_token].amount = perShareRewards;
            ERC20(_token).safeTransferFrom(address(msg.sender), address(this), _amount);
        } else {
            rewardsAddress[_token].amount += perShareRewards;
            ERC20(_token).safeTransferFrom(address(msg.sender), address(this), _amount);
        }     
    }

    function claimAllReward(uint _startPosition) public returns (uint, uint) { //claim
        for(uint i = _startPosition; i < tokenAddress.length && i < _startPosition + 10; i++){
            uint reward;
            address token = tokenAddress[i];
            reward = (rewardsAddress[token].amount - userContribution[msg.sender].lastClaimedAmountT[token]).mulDivDown(1,userContribution[msg.sender].num_shares);
            userContribution[msg.sender].lastClaimedAmountT[token] = rewardsAddress[token].amount;
            ERC20(token).safeTransferFrom(address(this), msg.sender, reward);
        }
        return (_startPosition, tokenAddress.length);
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

