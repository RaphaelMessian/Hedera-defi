// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "../common/hedera/HederaTokenService.sol";
import "../common/hedera/HederaResponseCodes.sol";
import "../common/IERC20.sol";

contract OrderBook is HederaTokenService {

    struct Order {
        uint Amount;
        uint Price;
        uint TimeStamp;
        address Trader;
        bytes Status;
    }

    Order[] Buys;
    Order[] Sells;
    IERC20 public ERC20Base; //USD
    IERC20 public ERC20Counter; //Gold
    address owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "not authorized");
        _;
    }

    constructor (address Base, address Counter) {
        HederaTokenService.associateToken(address(this), Base);
        ERC20Base = IERC20(Base);
        HederaTokenService.associateToken(address(this), Counter);
        ERC20Counter = IERC20(Counter);
        owner = msg.sender;
    }

    event BuyAdded(uint indexed Order_No, uint Amt, uint Price, address trader);

    event SellAdded(uint indexed Order_No, uint Amt, uint Price, address trader);

    event TradeAdd(uint indexed Order_No, uint Amt, uint Price, address maker, address taker);

    function addBuy(uint Amt, uint BuyPrice) public returns (uint) {
        HederaTokenService.transferToken(address(ERC20Base), msg.sender, address(this), int64(uint64(multiply(Amt, BuyPrice))));
        Buys.push(Order(Amt, BuyPrice, block.timestamp, msg.sender, 'A'));
        emit BuyAdded(Buys.length, Amt, BuyPrice, msg.sender);
        return Buys.length;
    } 

    function addSell(uint Amt, uint SellPrice) public returns (uint) {
        HederaTokenService.transferToken(address(ERC20Counter), msg.sender, address(this), int64(uint64(Amt)));
        Sells.push(Order(Amt , SellPrice , block.timestamp, msg.sender, 'A'));
        emit SellAdded(Sells.length, Amt, SellPrice, msg.sender);
        return Sells.length;
    }

    function viewLengthBuy() public view returns (uint) {
        return Buys.length;
    }

    function viewLengthSell() public view returns (uint) {
        return Sells.length;
    }

    function viewBuy(uint OrderNo) public view returns (uint, uint, uint, address) {
        return ( 
            Buys[OrderNo-1].Amount,
            Buys[OrderNo-1].Price,
            Buys[OrderNo-1].TimeStamp,
            Buys[OrderNo-1].Trader
        );
    }

    function viewSell(uint OrderNo) public view returns (uint, uint, uint, address) {
        return ( 
            Sells[OrderNo-1].Amount,
            Sells[OrderNo-1].Price,
            Sells[OrderNo-1].TimeStamp,
            Sells[OrderNo-1].Trader
        );
    }

    function buyOrder(uint OrderNo, uint Amt, uint TradePrice) public returns (uint, uint, address) {
        if (Sells[OrderNo-1].Amount == Amt) {
            require(TradePrice >= Sells[OrderNo-1].Price, "Invalid Price");
            HederaTokenService.transferToken(address(ERC20Base),  msg.sender, Sells[OrderNo-1].Trader, int64(uint64(multiply(Amt, Sells[OrderNo-1].Price))));
            Sells[OrderNo-1].Amount = 0;
            Sells[OrderNo-1].Status = 'T';
            HederaTokenService.transferToken(address(ERC20Counter),  address(this), msg.sender, int64(uint64(Amt)));
            emit TradeAdd(OrderNo, Amt, Sells[OrderNo-1].Price, Sells[OrderNo-1].Trader, msg.sender);
            return (OrderNo, Amt, msg.sender); 
        } else if (Sells[OrderNo-1].Amount > Amt) {
            require(TradePrice >= Sells[OrderNo-1].Price, "Invalid Price");
            HederaTokenService.transferToken(address(ERC20Base),  msg.sender, Sells[OrderNo-1].Trader, int64(uint64(multiply(Amt, Sells[OrderNo-1].Price))));
            Sells[OrderNo-1].Amount = Sells[OrderNo-1].Amount - Amt;
            Sells[OrderNo-1].Status = 'A';
            HederaTokenService.transferToken(address(ERC20Counter),  address(this), msg.sender, int64(uint64(Amt)));
            emit TradeAdd(OrderNo, Amt, Sells[OrderNo-1].Price,Sells[OrderNo-1].Trader,msg.sender);
            return (OrderNo, Amt, msg.sender); 
        }
    }

    function sellOrder(uint OrderNo, uint Amt, uint TradePrice) public returns (uint, uint, address) {
        if (Buys[OrderNo-1].Amount == Amt) {
            require(TradePrice <= Buys[OrderNo-1].Price, "Invalid Price");
            HederaTokenService.transferToken(address(ERC20Counter),  msg.sender, Buys[OrderNo-1].Trader, int64(uint64(Amt)));
            Buys[OrderNo-1].Amount = 0;
            Buys[OrderNo-1].Status = 'T';
            HederaTokenService.transferToken(address(ERC20Base),  address(this), msg.sender, int64(uint64(multiply(Amt, Buys[OrderNo-1].Price))));
            emit TradeAdd(OrderNo, Amt, Buys[OrderNo-1].Price, address(Buys[OrderNo-1].Trader), msg.sender);
            return (OrderNo, Amt, msg.sender); 
        } else if (Buys[OrderNo-1].Amount > Amt) {
            require(TradePrice <= Buys[OrderNo-1].Price, "Invalid Price");
            HederaTokenService.transferToken(address(ERC20Counter),  msg.sender, Buys[OrderNo-1].Trader, int64(uint64(Amt)));
            Buys[OrderNo-1].Amount = Buys[OrderNo-1].Amount - Amt;
            Buys[OrderNo-1].Status = 'A';
            HederaTokenService.transferToken(address(ERC20Base),  address(this), msg.sender, int64(uint64(multiply(Amt, Buys[OrderNo-1].Price))));
            emit TradeAdd(OrderNo, Amt, Buys[OrderNo-1].Price, Buys[OrderNo-1].Trader, msg.sender);
            return (OrderNo, Amt, msg.sender); 
        }
    }

    function decommission() public onlyOwner {
        uint i = 0;
        while ( i <= Buys.length || i <= Sells.length) {
            if( i <= Buys.length) {
                uint Amt = multiply(Buys[i].Amount, Buys[i].Price);
                HederaTokenService.transferToken(address(ERC20Base),  address(this), Buys[i].Trader, int64(uint64(Amt)));
                delete Buys[i];
            }
            if( i <= Sells.length) {
                HederaTokenService.transferToken(address(ERC20Counter),  address(this), Sells[i].Trader, int64(uint64(Sells[i].Amount)));
                delete Sells[i];
            }
            i++;
        }
    }
    
    // function divide(uint256 p0, uint256 p1) internal pure returns (uint256) {
    //     return ((p0 * getPrecisionValue()) / p1);
    // }

    function multiply(uint256 p0, uint256 p1) internal pure returns (uint256) {
        return ((p0 * p1) / getPrecisionValue());
    }

    function getPrecisionValue() internal pure returns (uint256) {
        return 100000000;
    }
} 