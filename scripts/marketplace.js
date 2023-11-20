console.clear();
const  {getClient, createAccount, deployContract, createFungibleToken, mintToken, TokenBalance, TokenTransfer, tokenAssociate} = require("./utils");
const {Client, AccountId, PrivateKey, TokenId, ContractFunctionParameters, ContractExecuteTransaction, TokenAssociateTransaction, ContractId, ContractCreateTransaction, FileCreateTransaction} = require("@hashgraph/sdk");
const Web3 = require("web3");
require('dotenv').config({path: __dirname + '../.env'});
const fs = require('fs');;
const web3 = new Web3(process.env.JSON_RPC_RELAY_URL);

let client = Client.forTestnet();
const operatorPrKey = PrivateKey.fromStringECDSA(process.env.ETH_PRIVATE_KEY);
const operatorAccountId = AccountId.fromString(process.env.OPERATOR_ID_ALIAS);

client.setOperator(
  operatorAccountId,
  operatorPrKey
);

const rawdataMyToken = fs.readFileSync(`${__dirname}/../artifacts/contracts/marketplace.sol/MyToken.json`);
const myTokenJSon = JSON.parse(rawdataMyToken);
const myTokenAbi = myTokenJSon.abi;
const rawdataNFTMarketPlace = fs.readFileSync(`${__dirname}/../artifacts/contracts/marketplace.sol/NFTMarketplace.json`);
const nftMarketPlaceJSon = JSON.parse(rawdataNFTMarketPlace);
const nftMarketPlaceContractByteCode = nftMarketPlaceJSon.bytecode;
const nftMarketPlaceAbi = nftMarketPlaceJSon.abi;

async function main() {



    const address = ContractId.fromString("0.0.4471741").toSolidityAddress();
    console.log(address, "address");
       const account = web3.eth.accounts.privateKeyToAccount(
        process.env.ETH_PRIVATE_KEY
        );
    const accountAddress = web3.utils.toChecksumAddress(account.address);
    web3.eth.defaultAccount = account.address;
    console.log("accountAddress", web3.utils.toChecksumAddress(accountAddress));

    web3.eth.accounts.wallet.add(account);

    let nftMarketPlaceAddress;
    let nftCollectionAddress;

    const deployNFTMarketPlace = new web3.eth.Contract(nftMarketPlaceAbi);
    let nftMarketPlace = await deployNFTMarketPlace
        .deploy({
            data: nftMarketPlaceContractByteCode
        })
        .send({
            from: accountAddress,
            gas: 1000000,
            gaslimit: 4000000
        })
        .on("receipt", receipt => {
            console.log(receipt);
            console.log("contract address", receipt.contractAddress);
            nftMarketPlaceAddress = receipt.contractAddress;
        });

    // const contracNftMarketPlace = new web3.eth.Contract(
    //     nftMarketPlaceAbi,
    //     nftMarketPlaceAddress
    // );

    // let createNFTContract = await contracNftMarketPlace.methods.createNftContract("test","t", false)
    //     .send({ from: accountAddress, gas: 1000000 })
    //         .on("receipt", (receipt) => {
    //           console.log(receipt);
    //           console.log("Transaction hash", receipt.transactionHash);
    //           console.log("NFT contract address", receipt.events.collectionCreated.returnValues[1])
    //           nftCollectionAddress =  receipt.events.collectionCreated.returnValues[1];
    //         });
        
    // const contractNFTCollection = new web3.eth.Contract(
    //     myTokenAbi,
    //     nftCollectionAddress
    // );

    // let mintToken = await contractNFTCollection.methods.Mint(accountAddress, 1, "test")
    // .send({ from: accountAddress, gas: 1000000 })
    //     .on("receipt", (receipt) => {
    //       console.log(receipt);
    //       console.log("Transaction hash", receipt.transactionHash);
    //     });
    
    // let approveToken = await contractNFTCollection.methods.approve(nftMarketPlaceAddress, 1)
    // .send({ from: accountAddress, gas: 1000000 })
    //     .on("receipt", (receipt) => {
    //       console.log(receipt);
    //       console.log("Transaction hash", receipt.transactionHash);
    //     });
    
    // let transferToken = await contractNFTCollection.methods.transferFrom(accountAddress, nftMarketPlaceAddress, 1)
    // .send({ from: accountAddress, gas: 1000000 })
    // .on("receipt", (receipt) => {
    //   console.log(receipt);
    //   console.log("Transaction hash", receipt.transactionHash);
    // });
    
    // // let updateListingPrice = await contracNftMarketPlace.methods.updateListingPrice(10)
    // //     .send({ from: accountAddress, gas: 1000000 })
    // //         .on("receipt", (receipt) => {
    // //           console.log(receipt);
    // //           console.log("Transaction hash", receipt.transactionHash);
    // //     });   
        
    // let createMarketItem = await contracNftMarketPlace.methods.createMarketItem(nftMarketPlaceAddress, 1, 10, 1)
    //     .send({ from: accountAddress, gas: 10000000, value: 10 })
    //         .on("receipt", (receipt) => {
    //           console.log(receipt);
    //           console.log("Transaction hash", receipt.transactionHash);
    //     });   

};

main();