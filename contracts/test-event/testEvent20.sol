pragma solidity ^0.8.0;

import {ERC20} from "./ERC20.sol";
import "../common/hedera/HederaTokenService.sol";
import "../common/hedera/HederaTokenService.sol";
import {SafeTransferLib} from "./SafeTransferLib.sol";

contract testEvent20 is HederaTokenService {

    ERC20 tokenAddress;
    using SafeTransferLib for ERC20;

    constructor(address _token) {
       HederaTokenService.associateToken(address(this), _token);
       tokenAddress = ERC20(_token);
    }

    function testEventHTS(address _token, uint amount) public { 
        HederaTokenService.transferToken(address(_token), address(msg.sender), address(this), int64(uint64(amount)));
    }

    function testEventERC20(uint amount) public { 
        tokenAddress.safeTransferFrom(address(msg.sender), address(this), amount);
    }

}