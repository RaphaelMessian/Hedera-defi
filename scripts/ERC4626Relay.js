console.clear();
const  {getClient, createAccount, deployContract, createFungibleToken, mintToken, TokenBalance, TokenTransfer} = require("./utils");
const {Client, AccountId, PrivateKey, TokenId, ContractFunctionParameters, ContractExecuteTransaction, TokenAssociateTransaction, ContractId, ContractCreateTransaction, FileCreateTransaction} = require("@hashgraph/sdk");
const Web3 = require("web3");
require('dotenv').config({path: __dirname + '../.env'});
const fs = require('fs');

const web3 = new Web3(process.env.JSON_RPC_RELAY_URL);

let client = Client.forTestnet();
const operatorPrKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
const operatorAccountId = AccountId.fromString(process.env.OPERATOR_ID);

client.setOperator(
  operatorAccountId,
  operatorPrKey
);

// const operatorPrKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
// const operatorPuKey = operatorPrKey.publicKey;
// const operatorAccountId = AccountId.fromString(process.env.OPERATOR_ID);
// const ERC4626Contract = ContractId.fromString('0.0.3651811');
// const tokenId = TokenId.fromString("0.0.3651806");

const rawdataUnderlyingToken = fs.readFileSync(`${__dirname}/../artifacts/contracts/ERC4626/VaultToken.sol/VaultToken.json`);
const rawdataUnderlyingTokenJSon = JSON.parse(rawdataUnderlyingToken);
const underlyingTokenAbi = rawdataUnderlyingTokenJSon.abi;
const underlyingTokenbytecode = rawdataUnderlyingTokenJSon.bytecode;
const rawdataERC4626 = fs.readFileSync(`${__dirname}/../artifacts/contracts/ERC4626/Vault.sol/HederaVault.json`);
const rawdataERC4626ContractJSon = JSON.parse(rawdataERC4626);
const ERC4626ContractByteCode = rawdataERC4626ContractJSon.bytecode;
const ERC4626Abi = rawdataERC4626ContractJSon.abi;

async function main() {

    let underlyingTokenAddress;
    let simpleVaultAddress;

    const account = web3.eth.accounts.privateKeyToAccount(
        process.env.ETH_PRIVATE_KEY
        );
    const accountAddress = web3.utils.toChecksumAddress(account.address);
    web3.eth.defaultAccount = account.address;
    console.log("accountAddress", web3.utils.toChecksumAddress(accountAddress));

    web3.eth.accounts.wallet.add(account);

    const underlyingTokenContract = new web3.eth.Contract(underlyingTokenAbi);
    let underlyingToken = await underlyingTokenContract
        .deploy({
            data: underlyingTokenbytecode,
        })
        .send({
            from: accountAddress,
            gas: 300000,
            gaslimit: 4000000
        })
        .on("receipt", receipt => {
            console.log(`Contract deployed at address: ${receipt.contractAddress}`);
            underlyingTokenAddress = receipt.contractAddress;
        });

    const contractUnderlyingToken = new web3.eth.Contract(
        underlyingTokenAbi,
        underlyingTokenAddress
    );

    // let transfer = await contractUnderlyingToken.methods.transfer("0xb9E94Ba1753fD3E0e5f2A14894D53e1823a4B7D6", 100)
    //     .send({ from: "0x208b15dab9903be8d34336d0b7f930e5f0a76ec5", gas: 1000000}).on("receipt", (receipt) => {
    //         console.log(receipt);
    //         console.log("Transaction hash", receipt.transactionHash);
    //       });
    // console.log("transfer of underlying token", transfer);

    let result = await contractUnderlyingToken.methods.balanceOf("0xb9E94Ba1753fD3E0e5f2A14894D53e1823a4B7D6").call();
    console.log("TotalSupply of underlying token", result);

    const deploySimpleVault = new web3.eth.Contract(ERC4626Abi);
    let simpleVault = await deploySimpleVault
        .deploy({
            data: ERC4626ContractByteCode,
            arguments: [underlyingTokenAddress]
        })
        .send({
            from: accountAddress,
            gas: 1000000,
            gaslimit: 4000000
        })
        .on("receipt", receipt => {
            console.log(`Contract deployed at address: ${receipt.contractAddress}`);
            simpleVaultAddress = receipt.contractAddress;
        });

    let approveVault = await contractUnderlyingToken.methods.approve(simpleVaultAddress, 100)
        .send({ from: accountAddress, gas: 1000000 })
            .on("receipt", (receipt) => {
              console.log(receipt);
              console.log("Transaction hash", receipt.transactionHash);
            });
    console.log("Approval", approveVault);

    const contracSimpleVault = new web3.eth.Contract(
        ERC4626Abi,
        simpleVaultAddress
    );
        
    let deposit = await contracSimpleVault.methods.deposit(10, accountAddress)
        .send({ from: accountAddress,  gas: 1000000 })
            .on("receipt", (receipt) => {
                console.log(receipt);
                console.log("Transaction hash", receipt.transactionHash);
            });

    let totalAssets = await contracSimpleVault.methods.totalAssets().call();
    console.log("totalAssets on the vault", totalAssets);

};

/**
 * Decodes the result of a contract's function execution
 * @param functionName the name of the function within the ABI
 * @param resultAsBytes a byte array containing the execution result
 */
function decodeFunctionResult(functionName, resultAsBytes) {
    const functionAbi = abi.find(func => func.name === functionName);
    const functionParameters = functionAbi.outputs;
    const resultHex = '0x'.concat(Buffer.from(resultAsBytes).toString('hex'));
    const result = web3.eth.abi.decodeParameters(functionParameters, resultHex);
    return result;
}

/**
 * Encodes a function call so that the contract's function can be executed or called
 * @param functionName the name of the function to call
 * @param parameters the array of parameters to pass to the function
 */
function encodeFunctionCall(functionName, parameters) {
    const functionAbi = abi.find(func => (func.name === functionName && func.type === "function"));
    const encodedParametersHex = web3.eth.abi.encodeFunctionCall(functionAbi, parameters).slice(2);
    return Buffer.from(encodedParametersHex, 'hex');
}

/**
 * Decodes event contents using the ABI definition of the event
 * @param eventName the name of the event
 * @param log log data as a Hex string
 * @param topics an array of event topics
 */
function decodeEvent(eventName, log, topics) {
    const eventAbi = abi.find(event => (event.name === eventName && event.type === "event"));
    const decodedLog = web3.eth.abi.decodeLog(eventAbi.inputs, log, topics);
    return decodedLog;
}

async function deployERC4626Contract(contractId) {
    
    const constructorParameters = new ContractFunctionParameters()
        .addAddress(contractId.toSolidityAddress());
  
    const createERC4626Contract = await deployContract(client, ERC4626ContractByteCode, 1500000, operatorPrKey, constructorParameters);
    
    console.log(`- Contract created ${createERC4626Contract.toString()} ,Contract Address ${createERC4626Contract.toSolidityAddress()} -`);

    return createERC4626Contract;
}

main();