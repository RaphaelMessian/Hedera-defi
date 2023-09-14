console.clear();
const  {deployContract, createFungibleToken} = require("../scripts/utils");
const {Client, AccountId, PrivateKey, ContractFunctionParameters, TokenId} = require("@hashgraph/sdk");
const fs = require('fs');
require('dotenv').config({path: __dirname + '/'});

async function orderBookDeploy() {

  let client = Client.forTestnet();
  const operatorPrKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
  const operatorAccountId = AccountId.fromString(process.env.OPERATOR_ID);

  client.setOperator(
    operatorAccountId,
    operatorPrKey
  );

  const createUSDToken = await createFungibleToken("USD Test Token", "UTT", operatorAccountId, operatorPrKey.publicKey, client, operatorPrKey);
  const createGoldToken = await createFungibleToken("Gold Test Token", "GTT", operatorAccountId, operatorPrKey.publicKey, client, operatorPrKey);
  //const usdTestToken = TokenId.fromString("0.0.49396175");
  //const goldTestToken = TokenId.fromString("0.0.49396176");

  const constructorParameters = new ContractFunctionParameters()
    .addAddress(createUSDToken.toSolidityAddress())
    .addAddress(createGoldToken.toSolidityAddress());

  const rawdataOrderBook = fs.readFileSync(`${__dirname}/../artifacts/contracts/OrderBook/orderbook.sol/OrderBook.json`);
  const rawdataOrderBookContractJSon = JSON.parse(rawdataOrderBook);
  const orderBookContractByteCode = rawdataOrderBookContractJSon.bytecode;
  const createOrderBookContract = await deployContract(client, orderBookContractByteCode, 1646236, operatorPrKey, constructorParameters);

  console.log(`- orderBook Contract created ${createOrderBookContract.toString()} ,Contract Address ${createOrderBookContract.toSolidityAddress()} -`);

}

module.exports = {
    orderBookDeploy
};

orderBookDeploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
