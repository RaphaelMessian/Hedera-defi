pragma solidity ^0.8.0;

import {ERC20} from "./ERC20.sol";

contract basicERC20 is ERC20 {

    constructor() ERC20("BasicERC20", "BE20", 8){
        _mint(msg.sender,1000*10**8);
    }
}