console.clear();
const  {getClient, createAccount, deployContract, createFungibleToken, mintToken, TokenBalance, TokenTransfer, tokenAssociate} = require("./utils");
const {Client, AccountId, PrivateKey, TokenId, ContractFunctionParameters, ContractExecuteTransaction, TokenAssociateTransaction, ContractId, ContractCreateTransaction, FileCreateTransaction} = require("@hashgraph/sdk");
const Web3 = require("web3");
require('dotenv').config({path: __dirname + '../.env'});
const fs = require('fs');;
const web3 = new Web3(process.env.JSON_RPC_RELAY_URL);
var BN = web3.utils.BN;

let client = Client.forTestnet();
const operatorPrKey = PrivateKey.fromStringECDSA(process.env.ETH_PRIVATE_KEY);
const operatorAccountId = AccountId.fromString(process.env.OPERATOR_ID_ALIAS);

client.setOperator(
  operatorAccountId,
  operatorPrKey
);

const rawdataUnderlyingToken = fs.readFileSync(`${__dirname}/../artifacts/contracts/ERC4626/lab49Vault/VaultToken.sol/VaultToken.json`);
const rawdataUnderlyingTokenJSon = JSON.parse(rawdataUnderlyingToken);
const underlyingTokenAbi = rawdataUnderlyingTokenJSon.abi;
const rawdataBasicHedera4626 = fs.readFileSync(`${__dirname}/../artifacts/contracts/ERC4626/Hedera4626/SimpleVault.sol/SimpleVault.json`);
const rawdataBasicHedera4626ContractJSon = JSON.parse(rawdataBasicHedera4626);
const basicHedera4626ContractByteCode = rawdataBasicHedera4626ContractJSon.bytecode;
const basicHedera4626Abi = rawdataBasicHedera4626ContractJSon.abi;

async function main() {

    const createStackingToken = await createFungibleToken("Stacking Token", "ST", operatorAccountId, operatorPrKey.publicKey, client, operatorPrKey);

    let underlyingTokenAddress = createStackingToken.toSolidityAddress();
    let createdTokenAddress;
    let simpleVaultAddress;

    const account = web3.eth.accounts.privateKeyToAccount(
        process.env.ETH_PRIVATE_KEY
        );
    const accountAddress = web3.utils.toChecksumAddress(account.address);
    web3.eth.defaultAccount = account.address;
    console.log("accountAddress", web3.utils.toChecksumAddress(accountAddress));

    web3.eth.accounts.wallet.add(account);

    // const underlyingTokenContract = new web3.eth.Contract(underlyingTokenAbi);
    // let underlyingToken = await underlyingTokenContract
    //     .deploy({
    //         data: underlyingTokenbytecode,
    //     })
    //     .send({
    //         from: accountAddress,
    //         gas: 3000000,
    //         gaslimit: 4000000
    //     })
    //     .on("receipt", receipt => {
    //         console.log(`Contract deployed at address: ${receipt.contractAddress}`);
    //         underlyingTokenAddress = receipt.contractAddress;
    //     });

    const contractUnderlyingToken = new web3.eth.Contract(
        underlyingTokenAbi,
        underlyingTokenAddress
    );

    const deploySimpleVault = new web3.eth.Contract(basicHedera4626Abi);
    let simpleVault = await deploySimpleVault
        .deploy({
            data: basicHedera4626ContractByteCode,
            arguments: [underlyingTokenAddress, 'test', 'T']
        })
        .send({
            from: accountAddress,
            gas: 1000000,
            gaslimit: 4000000,
            value: web3.utils.toBN(20_000_000_000_000_000_000)
        })
        .on("receipt", receipt => {
            console.log("Contract Address", receipt.contractAddress);
            simpleVaultAddress = receipt.contractAddress;
        });

    const contracSimpleVault = new web3.eth.Contract(
        basicHedera4626Abi,
        simpleVaultAddress
    );

    let getTokenAddress = await contracSimpleVault.getPastEvents('createdToken', {}, function(error, events) { 
        console.log(events); 
    }).then(function(events) {
        createdTokenAddress = events[0].returnValues.createdTokenAddress
        console.log("tokenAddress", events[0].returnValues.createdTokenAddress)
    });

    const newCreatedToken = new web3.eth.Contract(
        underlyingTokenAbi,
        createdTokenAddress
    ); 

    const tokenAssociation = await tokenAssociate(client, operatorAccountId, TokenId.fromSolidityAddress(createdTokenAddress), operatorPrKey);

    let approveVault = await contractUnderlyingToken.methods.approve(simpleVaultAddress, 100)
        .send({ from: accountAddress, gas: 1000000 })
            .on("receipt", (receipt) => {
              console.log(receipt);
              console.log("Transaction hash", receipt.transactionHash);
            });
    console.log("Approval", approveVault);
        
    let deposit = await contracSimpleVault.methods._deposit(10, accountAddress)
        .send({ from: accountAddress,  gas: 1000000 })
            .on("receipt", (receipt) => {
                console.log(receipt);
                console.log("Transaction hash", receipt.transactionHash);
            });

    // let totalAssets = await contracSimpleVault.methods.totalAssets().call();
    // console.log("totalAssets on the vault", totalAssets);

    // // let result2 = await contracSimpleVault.methods.balanceOf(accountAddress).call();
    // // console.log("balance of underlying token", result2);

    // // let result1 = await contracSimpleVault.methods.totalSupply().call();
    // // console.log("TotalSupply of underlying token", result1);

    let approveVaultForWithdraw = await newCreatedToken.methods.approve(simpleVaultAddress, 10)
    .send({ from: accountAddress, gas: 1000000 })
        .on("receipt", (receipt) => {
          console.log(receipt);
          console.log("Transaction hash", receipt.transactionHash);
        });
    console.log("Approval for Withdraw", approveVaultForWithdraw);

    let withdraw = await contracSimpleVault.methods._withdraw(10, accountAddress)
    .send({ from: accountAddress,  gas: 1000000 })
        .on("receipt", (receipt) => {
            console.log(receipt);
            console.log("Transaction hash", receipt.transactionHash);
        });

};

main();