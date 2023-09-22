console.clear();
const  {getClient, createAccount, createFungibleToken} = require("./utils");
const { AccountId, PrivateKey, TokenAssociateTransaction} = require("@hashgraph/sdk");
require('dotenv').config({path: __dirname + '../.env'});
const Web3 = require("web3");
const fs = require('fs');
const web3 = new Web3(process.env.JSON_RPC_RELAY_URL);

let client = getClient();

const operatorPrKey = PrivateKey.fromStringECDSA(process.env.ETH_PRIVATE_KEY);
const operatorAccountId = AccountId.fromString(process.env.OPERATOR_ID_ALIAS);
client.setOperator(
    operatorAccountId,
    operatorPrKey
  );

const alicePrKey = PrivateKey.fromString(process.env.ALICE_KEY);
const aliceAccountId = AccountId.fromString(process.env.ALICE_ACCOUNT_ALIAS)

const rawdataUnderlyingToken = fs.readFileSync(`${__dirname}/../artifacts/contracts/ERC4626/lab49Vault/VaultToken.sol/VaultToken.json`);
const rawdataUnderlyingTokenJSon = JSON.parse(rawdataUnderlyingToken);
const underlyingTokenAbi = rawdataUnderlyingTokenJSon.abi;

const rawdataOrdebookV2 = fs.readFileSync(`${__dirname}/../artifacts/contracts/OrderBook/OrderBookV2.sol/OrderBookV2.json`);
const orderbookV2JSon = JSON.parse(rawdataOrdebookV2);
const orderbookV2Bytecode = orderbookV2JSon.bytecode;
const orderbookV2Abi = orderbookV2JSon.abi;

async function main() {


    // const aliceKey = PrivateKey.generateED25519();
    // const aliceAccountId = await createAccount(client, aliceKey, 40);
    const account = web3.eth.accounts.privateKeyToAccount(process.env.ETH_PRIVATE_KEY);
    const accountAddress = web3.utils.toChecksumAddress(account.address);
    web3.eth.defaultAccount = account.address;
    console.log(`- accountAddress`, web3.utils.toChecksumAddress(accountAddress));
    web3.eth.accounts.wallet.add(account);

    const aliceAccount = web3.eth.accounts.privateKeyToAccount(process.env.ALICE_ETH_PRIVATE_KEY);
    const aliceAccountAddress = web3.utils.toChecksumAddress(aliceAccount.address);
    web3.eth.defaultAccount = aliceAccount.address;
    console.log(`- Alice accountAddress`, web3.utils.toChecksumAddress(aliceAccountAddress));
    web3.eth.accounts.wallet.add(aliceAccount);

    //Create gold token for the operator
    const goldToken = await createFungibleToken("goldToken", "GT", operatorAccountId, operatorPrKey.publicKey, client, operatorPrKey);
    //Create quote token (stable coin) for Alice
    client.setOperator(aliceAccountId, alicePrKey);
    const stableCoin = await createFungibleToken("stableToken","ST", aliceAccountId, alicePrKey.publicKey, client, alicePrKey);

    const tokenAssociateForAlice = await new TokenAssociateTransaction()
        .setAccountId(aliceAccountId)
        .setTokenIds([goldToken])
        .execute(client);

    const tokenAssociateForAliceReceipt = await tokenAssociateForAlice.getReceipt(client);
    console.log(`- Alice token Associate status ${tokenAssociateForAliceReceipt.status.toString()}`);
    
    client.setOperator(operatorAccountId, operatorPrKey);
    const tokenAssociateOperator = await new TokenAssociateTransaction()
    .setAccountId(operatorAccountId)
    .setTokenIds([stableCoin])
    .execute(client);

    const tokenAssociateOperatorReceipt = await tokenAssociateOperator.getReceipt(client);
    console.log(`- Operator token Associate status ${tokenAssociateOperatorReceipt.status.toString()}`);

    let goldTokenAddress = goldToken.toSolidityAddress();

    let stableCoinAddress = stableCoin.toSolidityAddress();
    
    const contractGoldToken = new web3.eth.Contract(
        underlyingTokenAbi,
        goldTokenAddress
    );

    const contractStableCoin = new web3.eth.Contract(
        underlyingTokenAbi,
        stableCoinAddress
    );

    let orderBookV2Address;

    const orderBookV2Contract = new web3.eth.Contract(orderbookV2Abi);
    let deployOrbookV2 = await orderBookV2Contract
        .deploy({
            data: orderbookV2Bytecode
        })
        .send({
            from: accountAddress,
            gas: 1000000,
            gaslimit: 4000000
        })
        .on("receipt", receipt => {
            console.log(receipt);
            console.log("contract address",receipt.contractAddress)
            orderBookV2Address = receipt.contractAddress;
        });

    const contracOrderBookV2 = new web3.eth.Contract(
        orderbookV2Abi,
        orderBookV2Address
    );

    let approveForSellOrder = await contractGoldToken.methods.approve(orderBookV2Address, 100)
    .send({ from: accountAddress, gas: 1000000 })
        .on("receipt", (receipt) => {
          console.log(receipt);
          console.log("Transaction hash", receipt.transactionHash);
        });

    let postSellOrder =  await contracOrderBookV2.methods.placeOrder(1, 10, goldTokenAddress, stableCoinAddress, false)
    .send({ from: accountAddress,  gas: 1000000 })
        .on("receipt", (receipt) => {
            console.log(receipt);
            console.log("Transaction hash", receipt.transactionHash);
        });

    let approveForBuyOrder = await contractStableCoin.methods.approve(orderBookV2Address, 100)
    .send({ from: aliceAccountAddress, gas: 1000000 })
        .on("receipt", (receipt) => {
            console.log(receipt);
            console.log("Transaction hash", receipt.transactionHash);
    });

    let postBuyOrder =  await contracOrderBookV2.methods.placeOrder(1, 7, goldTokenAddress, stableCoinAddress, true)
    .send({ from: aliceAccountAddress,  gas: 1000000 })
        .on("receipt", (receipt) => {
            console.log(receipt);
            console.log("Transaction hash", receipt.transactionHash);
        });

    let postBuyOrder2 =  await contracOrderBookV2.methods.placeOrder(1, 3, goldTokenAddress, stableCoinAddress, true)
        .send({ from: aliceAccountAddress,  gas: 1000000 })
            .on("receipt", (receipt) => {
                console.log(receipt);
                console.log("Transaction hash", receipt.transactionHash);
            });

}
main();

