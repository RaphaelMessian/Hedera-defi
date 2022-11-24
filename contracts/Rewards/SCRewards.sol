// SPDX-License-Identifier: MIT

pragma solidity ^0.8;
pragma abicoder v2;

import "../common/safe-HTS/HederaResponseCodes.sol";
import "../common/IERC20.sol";
import "../common/safe-HTS/SafeHTS.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";


contract SCRewards {

    using PRBMathUD60x18 for uint256;

    IERC20 public stakingToken;
    uint256 public constant ONE_DAY = 1 days;
    uint256 lockPeriod;

    uint public totalTokens;
    address[] tokenAddress;
    
    address public owner;

    struct UserInfo {
        uint num_shares;
        mapping(address => uint) lastClaimedAmountT;
        uint lockTimeStart;
        bool exist;
    }

    struct RewardsInfo {
        uint amount;
        bool exist;
    }

    mapping(address =>  UserInfo) public userContribution;
    mapping (address => RewardsInfo) public rewardsAddress;

    constructor(uint256 _lockPeriod) { //number of blocks
        owner = msg.sender;
        lockPeriod = _lockPeriod*ONE_DAY;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not authorized");
        _;
    }

    function initialize(address _stakingToken) external onlyOwner{
        require(_stakingToken != address(0), "stakingToken != address(0)");
        SafeHTS.safeAssociateToken(_stakingToken, address(this));
        stakingToken = IERC20(_stakingToken);
    }

    function addStakeAccount(uint _amount) internal { 
        require(_amount != 0, "please provide amount");
        if(!userContribution[msg.sender].exist) {
            SafeHTS.safeTransferToken(address(stakingToken), msg.sender, address(this), int64(uint64(_amount)));
            userContribution[msg.sender].num_shares = _amount;
            userContribution[msg.sender].exist = true;
            userContribution[msg.sender].lockTimeStart = block.timestamp;
            totalTokens += _amount;
        } else {
            SafeHTS.safeTransferToken(address(stakingToken), msg.sender, address(this), int64(uint64(_amount)));
            userContribution[msg.sender].num_shares += _amount;
            totalTokens += _amount;
        }
    }

    function addReward(address _token, uint _amount) internal onlyOwner { //deposit
        require(_amount != 0, "please provide amount");
        uint perShareRewards;
        perShareRewards = _amount.div(totalTokens);
        if(!rewardsAddress[_token].exist) {
            tokenAddress.push(_token);
            rewardsAddress[_token].exist = true;
            rewardsAddress[_token].amount = perShareRewards;
            SafeHTS.safeAssociateToken(_token, address(this));
            SafeHTS.safeTransferToken(address(_token), address(owner), address(this), int64(uint64(_amount)));
        } else {
            rewardsAddress[_token].amount += perShareRewards;
            SafeHTS.safeTransferToken(address(_token), address(owner), address(this), int64(uint64(_amount)));
        }     
    }

    function addToken(address _token, uint _amount) public {
        require(_amount != 0, "please provide amount");
        if(_token == address(stakingToken)) {
            addStakeAccount(_amount);
        } else {
            addReward(_token, _amount);
        }
    }

    function withdraw(uint _startPosition, uint _amount) public {
        require(_amount != 0, "please provide amount");
        claimAllReward(_startPosition);
        SafeHTS.safeTransferToken(address(stakingToken), address(this), address(msg.sender), int64(uint64(_amount)));
        userContribution[msg.sender].num_shares -= _amount;
        totalTokens -= _amount;
    }

    // function unlock(uint _amount) public {
    //     require(_amount != 0, "please provide amount");
    //     if(userContribution[msg.sender].lockTimeStart + lockPeriod < block.timestamp){

    //     }
    //     withdraw(_amount);
    // }

    
    function claimSpecificsReward(address[] memory _token) public returns (uint){ //claim
        for(uint i; i < _token.length; i++){
            uint reward;
            address token = tokenAddress[i];
            if(userContribution[msg.sender].lastClaimedAmountT[token] != 0){
                reward = (rewardsAddress[token].amount - userContribution[msg.sender].lastClaimedAmountT[token]).mul(userContribution[msg.sender].num_shares);
            } else {
                SafeHTS.safeAssociateToken(token, address(msg.sender));
                reward = rewardsAddress[token].amount.mul(userContribution[msg.sender].num_shares);
            }
            userContribution[msg.sender].lastClaimedAmountT[token] = rewardsAddress[token].amount;
            SafeHTS.safeTransferToken(address(token), address(this), address(msg.sender), int64(uint64(reward)));
        }
        return tokenAddress.length;
    }

    function claimAllReward(uint _startPosition) public returns (uint, uint){ //claim
        for(uint i = _startPosition; i < tokenAddress.length && i < _startPosition + 10; i++){
            uint reward;
            address token = tokenAddress[i];
            if(userContribution[msg.sender].lastClaimedAmountT[token] == 0) {
                SafeHTS.safeAssociateToken(token, address(msg.sender));
            }
            reward = (rewardsAddress[token].amount - userContribution[msg.sender].lastClaimedAmountT[token]).mul(userContribution[msg.sender].num_shares);
            userContribution[msg.sender].lastClaimedAmountT[token] = rewardsAddress[token].amount;
            SafeHTS.safeTransferToken(address(token), address(this), address(msg.sender), int64(uint64(reward)));
        }
        return (_startPosition, tokenAddress.length);
    }

    function getLockedAmount() public view returns (uint) {
        return userContribution[msg.sender].num_shares;
    }

    // function getRewards() public view returns () { //add limit
    //      for(uint i; i < tokenAddress.length; i++){
    //         uint reward;
    //         address token = tokenAddress[i];
    //         reward = (rewardsAddress[token].amount - userContribution[msg.sender].lastClaimedAmountT[token]).mul(userContribution[msg.sender].num_shares);

    //     }
    // }
}


