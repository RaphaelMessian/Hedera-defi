console.clear();
const  {getClient, createAccount, deployContract, createFungibleToken, mintToken, TokenBalance, TokenTransfer} = require("./utils");
const {Client, AccountId, PrivateKey, TokenId, ContractFunctionParameters, ContractExecuteTransaction, TokenAssociateTransaction, ContractId} = require("@hashgraph/sdk");
require('dotenv').config({path: __dirname + '../.env'});
const fs = require('fs');
const Web3 = require('web3');

let client = getClient();
const web3 = new Web3;

const operatorPrKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
const operatorPuKey = operatorPrKey.publicKey;
const operatorAccountId = AccountId.fromString(process.env.OPERATOR_ID);
const orderBookContract = ContractId.fromString('0.0.49396210');

const rawdataTest = fs.readFileSync(`${__dirname}/../artifacts/contracts/OrderBook/orderbook.sol/OrderBook.json`);
const rawdataTestJSon = JSON.parse(rawdataTest);
const abi = rawdataTestJSon.abi

async function main() {
    // const aliceKey = PrivateKey.generateED25519();
    // const aliceAccountId = await createAccount(client, aliceKey, 40);
    // console.log(`- Alice account id created: ${aliceAccountId.toString()}`);
    // console.log(`- Alice key created: ${aliceKey.toString()}`);
    // const bobKey = PrivateKey.generateED25519();
    // const bobAccountId = await createAccount(client, bobKey, 40);
    // console.log(`- Bob account id created: ${bobAccountId.toString()}`);
    // console.log(`- Bob key created: ${bobKey.toString()}`);
    const usdTestToken = TokenId.fromString("0.0.49396207");
    const goldTestToken = TokenId.fromString("0.0.49396208");
    // const aliceClient = client.setOperator(aliceAccountId, aliceKey);
    // const tokenAssociate = await new TokenAssociateTransaction()
    //     .setAccountId(aliceAccountId)
    //     .setTokenIds([usdTestToken])
    //     .execute(aliceClient);

    // const tokenAssociateReceipt = await tokenAssociate.getReceipt(aliceClient);
    // console.log(`- tokenAssociateReceipt ${tokenAssociateReceipt.status.toString()}`);
    // const bobClient = client.setOperator(bobAccountId, bobKey);
    // const tokenAssociate2 = await new TokenAssociateTransaction()
    //     .setAccountId(bobAccountId)
    //     .setTokenIds([goldTestToken])
    //     .execute(bobClient);

    // const tokenAssociateReceipt2 = await tokenAssociate2.getReceipt(bobClient);
    // console.log(`- tokenAssociateReceipt2 ${tokenAssociateReceipt2.status.toString()}`);
    // client.setOperator(operatorAccountId, operatorPrKey);
    // const usdTokenTransfert = await TokenTransfer(usdTestToken, operatorAccountId, aliceAccountId, 50, client);
    // console.log(`- Token Transfert to Alice : ${usdTokenTransfert.status.toString()}`)
    // const goldTokenTransfert = await TokenTransfer(goldTestToken, operatorAccountId, bobAccountId, 50, client);
    // console.log(`- Token Transfert to Bob : ${goldTokenTransfert.status.toString()}`)

    const aliceAccountId = AccountId.fromString("0.0.49396211");
    const alicePrivateKey = PrivateKey.fromString("302e020100300506032b6570042204200221c5d2fcdd4195a938c762076e171d68d7629ce0a70248767f704b991f4d6c");
    const bobAccountId = AccountId.fromString("0.0.49396212");
    const bobKey = PrivateKey.fromString("302e020100300506032b657004220420cf5cafcea5c359ff0e47475f80cb76f356acd3aba03b260b01b0cf5ede6035ed");
    //const aliceClient = client.setOperator(aliceAccountId, alicePrivateKey);
    //const bobClient = client.setOperator(bobAccountId, bobKey);
    // const tokenAssociate3 = await new TokenAssociateTransaction()
    //     .setAccountId(bobAccountId)
    //     .setTokenIds([usdTestToken])
    //     .execute(bobClient);

    // const tokenAssociateReceipt3 = await tokenAssociate3.getReceipt(bobClient);
    // console.log(`- tokenAssociateReceipt ${tokenAssociateReceipt3.status.toString()}`);
    //await addBuy(orderBookContract, 3, 4, aliceClient);
    // await viewBuy(orderBookContract, 1, aliceClient);
    // // await viewLengthBuy(orderBookContract, aliceClient);
    //await addSell(orderBookContract, 5, 4, bobClient);
    // //await viewSell(orderBookContract, 1, bobClient);
    // //await viewLengthSell(orderBookContract, bobClient);
    client.setOperator(operatorAccountId, operatorPrKey);
    // await sellOrder(orderBookContract, 1, 3, 4, client);
    // await buyOrder(orderBookContract, 1, 3, 4, client);
    await decommission(orderBookContract, client);
 }

 async function addBuy(orderBookContract, amount, buyPrice, client) {
    let contractFunctionParameters = new ContractFunctionParameters()
        .addUint256(amount*1e8)
        .addUint256(buyPrice*1e8);

    const addBuyTx = await new ContractExecuteTransaction()
        .setContractId(orderBookContract)
        .setFunction("addBuy", contractFunctionParameters)
        .setGas(1500000)
        .execute(client);
    
    const addBuyReceipt = await addBuyTx.getReceipt(client);
    console.log(`- addBuyReceipt transaction ${addBuyReceipt.status.toString()}.`);
    const addBuyRecord = await addBuyTx.getRecord(client);
    console.log(`- logs ${JSON.stringify(addBuyRecord.contractFunctionResult.logs)}.`);
    addBuyRecord.contractFunctionResult.logs.forEach((log) => {
		// convert the log.data (uint8Array) to a string
		let logStringHex = "0x".concat(Buffer.from(log.data).toString("hex"));
        console.log(`- logStringHex ${logStringHex}.`);

		// get topics from log
		let logTopics = [];
		log.topics.forEach((topic) => {
			logTopics.push("0x".concat(Buffer.from(topic).toString("hex")));
		});
        const results = decodeEvent('BuyAdded', logStringHex, logTopics.slice(1));
        console.log(`- Order number ${results.Order_No}, amount ${results.Amt}, buy price ${results.Price}, trader ${results.trader}`);
    });
 }

 async function addSell(orderBookContract, amount, sellPrice, client) {
    let contractFunctionParameters = new ContractFunctionParameters()
        .addUint256(amount*1e8)
        .addUint256(sellPrice*1e8);

    const addSellTx = await new ContractExecuteTransaction()
        .setContractId(orderBookContract)
        .setFunction("addSell", contractFunctionParameters)
        .setGas(1500000)
        .execute(client);
    
    const addSellReceipt = await addSellTx.getReceipt(client);
    console.log(`- addSellReceipt transaction ${addSellReceipt.status.toString()}.`);
    const addSellRecord = await addSellTx.getRecord(client);
    console.log(`- logs ${JSON.stringify(addSellRecord.contractFunctionResult.logs)}.`);
    addSellRecord.contractFunctionResult.logs.forEach((log) => {
		// convert the log.data (uint8Array) to a string
		let logStringHex = "0x".concat(Buffer.from(log.data).toString("hex"));
        console.log(`- logStringHex ${logStringHex}.`);

		// get topics from log
		let logTopics = [];
		log.topics.forEach((topic) => {
			logTopics.push("0x".concat(Buffer.from(topic).toString("hex")));
		});
        const results = decodeEvent('SellAdded', logStringHex, logTopics.slice(1));
        console.log(`- Order number ${results.Order_No}, amount ${results.Amt}, sell price ${results.Price}, trader ${results.trader}`);
    });
 }

 async function buyOrder(orderBookContract, orderNo, amount, tradePrice, client) {
    let contractFunctionParameters = new ContractFunctionParameters()
        .addUint256(orderNo)
        .addUint256(amount*1e8)
        .addUint256(tradePrice*1e8);

    const buyOrderTx = await new ContractExecuteTransaction()
        .setContractId(orderBookContract)
        .setFunction("buyOrder", contractFunctionParameters)
        .setGas(1500000)
        .execute(client);
    
    const buyOrderReceipt = await buyOrderTx.getReceipt(client);
    console.log(`- buyOrderTx transaction ${buyOrderReceipt.status.toString()}.`);
    const buyOrderRecord = await buyOrderTx.getRecord(client);
    console.log(`- logs ${JSON.stringify(buyOrderRecord.contractFunctionResult.logs)}.`);
    buyOrderRecord.contractFunctionResult.logs.forEach((log) => {
		// convert the log.data (uint8Array) to a string
		let logStringHex = "0x".concat(Buffer.from(log.data).toString("hex"));
        console.log(`- logStringHex ${logStringHex}.`);

		// get topics from log
		let logTopics = [];
		log.topics.forEach((topic) => {
			logTopics.push("0x".concat(Buffer.from(topic).toString("hex")));
		});
        const results = decodeEvent('TradeAdd', logStringHex, logTopics.slice(1));
        console.log(`- Order number ${results.Order_No}, amount ${results.Amt}, trade price ${results.Price}, maker ${results.maker}, taker ${results.taker}`);
    });
 }

 async function sellOrder(orderBookContract, orderNo, amount, tradePrice, client) {
    let contractFunctionParameters = new ContractFunctionParameters()
        .addUint256(orderNo)
        .addUint256(amount*1e8)
        .addUint256(tradePrice*1e8);

    const sellOrderTx = await new ContractExecuteTransaction()
        .setContractId(orderBookContract)
        .setFunction("sellOrder", contractFunctionParameters)
        .setGas(1500000)
        .execute(client);
    
    const sellOrderReceipt = await sellOrderTx.getReceipt(client);
    console.log(`- sellOrderTx transaction ${sellOrderReceipt.status.toString()}.`);
    const sellOrderRecord = await sellOrderTx.getRecord(client);
    console.log(`- logs ${JSON.stringify(sellOrderRecord.contractFunctionResult.logs)}.`);
    sellOrderRecord.contractFunctionResult.logs.forEach((log) => {
		// convert the log.data (uint8Array) to a string
		let logStringHex = "0x".concat(Buffer.from(log.data).toString("hex"));
        console.log(`- logStringHex ${logStringHex}.`);

		// get topics from log
		let logTopics = [];
		log.topics.forEach((topic) => {
			logTopics.push("0x".concat(Buffer.from(topic).toString("hex")));
		});
        const results = decodeEvent('TradeAdd', logStringHex, logTopics.slice(1));
        console.log(`- Order number ${results.Order_No}, amount ${results.Amt}, trade price ${results.Price}, maker ${results.maker}, taker ${results.taker}`);
    });
 }

 async function viewLengthBuy(orderBookContract, client) {

    const viewLengthBuyTx = await new ContractExecuteTransaction()
        .setContractId(orderBookContract)
        .setFunction("viewLengthBuy")
        .setGas(1500000)
        .execute(client);
    
    const viewLengthBuyReceipt = await viewLengthBuyTx.getReceipt(client);
    console.log(`- viewLengthBuyRecord transaction ${viewLengthBuyReceipt.status.toString()}.`);
    const viewLengthBuyRecord = await viewLengthBuyTx.getRecord(client);
    console.log(`- viewLengthBuyRecord ${JSON.stringify(viewLengthBuyRecord.contractFunctionResult.getUint256(0))}.`);
 }

 async function viewLengthSell(orderBookContract, client) {

    const viewLengthSellTx = await new ContractExecuteTransaction()
        .setContractId(orderBookContract)
        .setFunction("viewLengthSell")
        .setGas(1500000)
        .execute(client);
    
    const viewLengthSellReceipt = await viewLengthSellTx.getReceipt(client);
    console.log(`- viewLengthSellTx transaction ${viewLengthSellReceipt.status.toString()}.`);
    const viewLengthBuyRecord = await viewLengthSellTx.getRecord(client);
    console.log(`- viewLengthSellTx ${JSON.stringify(viewLengthBuyRecord.contractFunctionResult.getUint256(0))}.`);
 }

 async function viewBuy(orderBookContract, orderNo, client) {

    let contractFunctionParameters = new ContractFunctionParameters()
        .addUint256(orderNo)

    const viewBuyTx = await new ContractExecuteTransaction()
        .setContractId(orderBookContract)
        .setFunction("viewBuy", contractFunctionParameters)
        .setGas(1500000)
        .execute(client);
    
    const viewBuyReceipt = await viewBuyTx.getReceipt(client);
    console.log(`- viewBuy transaction ${viewBuyReceipt.status.toString()}.`);
    const viewBuyRecord = await viewBuyTx.getRecord(client);
    console.log(`- Amount ${JSON.stringify(viewBuyRecord.contractFunctionResult.getUint256(0))}.`);
    console.log(`- Price ${JSON.stringify(viewBuyRecord.contractFunctionResult.getUint256(1))}.`);
    console.log(`- TimeStamp ${JSON.stringify(viewBuyRecord.contractFunctionResult.getUint256(2))}.`);
    console.log(`- Trader ${JSON.stringify(viewBuyRecord.contractFunctionResult.getAddress(3))}.`);
 }

 async function viewSell(orderBookContract, orderNo, client) {

    let contractFunctionParameters = new ContractFunctionParameters()
        .addUint256(orderNo)

    const viewSelllTx = await new ContractExecuteTransaction()
        .setContractId(orderBookContract)
        .setFunction("viewSell", contractFunctionParameters)
        .setGas(1500000)
        .execute(client);
    
    const viewSellReceipt = await viewSelllTx.getReceipt(client);
    console.log(`- viewSell transaction ${viewSellReceipt.status.toString()}.`);
    const viewSellRecord = await viewSelllTx.getRecord(client);
    console.log(`- Amount ${JSON.stringify(viewSellRecord.contractFunctionResult.getUint256(0))}.`);
    console.log(`- Price ${JSON.stringify(viewSellRecord.contractFunctionResult.getUint256(1))}.`);
    console.log(`- TimeStamp ${JSON.stringify(viewSellRecord.contractFunctionResult.getUint256(2))}.`);
    console.log(`- Trader ${JSON.stringify(viewSellRecord.contractFunctionResult.getAddress(3))}.`);
 }

 async function decommission(orderBookContract, client) {

    const decommissionTx = await new ContractExecuteTransaction()
        .setContractId(orderBookContract)
        .setFunction("decommission")
        .setGas(2500000)
        .execute(client);
    
    const decomissionReceipt = await decommissionTx.getReceipt(client);
    console.log(`- viewSell transaction ${decomissionReceipt.status.toString()}.`);
    // const decomissionRecord = await decommissionTx.getRecord(client);
    // console.log(`- Amount ${JSON.stringify(decomissionRecord.contractFunctionResult.getUint256(0))}.`);
    // console.log(`- Price ${JSON.stringify(decomissionRecord.contractFunctionResult.getUint256(1))}.`);
    // console.log(`- TimeStamp ${JSON.stringify(decomissionRecord.contractFunctionResult.getUint256(2))}.`);
    // console.log(`- Trader ${JSON.stringify(decomissionRecord.contractFunctionResult.getAddress(3))}.`);
 }



 function decodeEvent(eventName, log, topics) {
    const eventAbi = abi.find(event => (event.name === eventName && event.type === "event"));
    console.log("eventAbi", eventAbi);    
    const decodedLog = web3.eth.abi.decodeLog(eventAbi.inputs, log, topics);
    return decodedLog;
}

main();

 module.exports = {
    addBuy,
    addSell,
    buyOrder,
    sellOrder,
    viewBuy,
    viewSell,
    viewLengthBuy,
    viewLengthSell,
    decommission
}

