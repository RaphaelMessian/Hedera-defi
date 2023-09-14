console.clear();
const  {getClient, createAccount, createNFT, mintToken} = require("./utils");
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

const rawdataUnderlyingToken = fs.readFileSync(`${__dirname}/../artifacts/contracts/ERC721.sol/ERC721.json`);
const rawdataUnderlyingTokenJSon = JSON.parse(rawdataUnderlyingToken);
const underlyingTokenAbi = rawdataUnderlyingTokenJSon.abi;

async function main() {

    const testToken = await createNFT("TestToken", "TT", operatorAccountId, operatorPrKey.publicKey, client, operatorPrKey);
    await mintToken(testToken, client, 0, operatorPrKey);

    const aliceKey = PrivateKey.generateED25519();
    const aliceAccountId = await createAccount(client, aliceKey, 10);
    console.log(`- Alice account id created: ${aliceAccountId.toString()}`);
    console.log(`- Alice account id created: ${aliceKey.toString()}`);
    
    let testTokenAddress = testToken.toSolidityAddress();
    
    const account = web3.eth.accounts.privateKeyToAccount(
      process.env.ETH_PRIVATE_KEY
      );
  const accountAddress = web3.utils.toChecksumAddress(account.address);
  web3.eth.defaultAccount = account.address;
  console.log(`- accountAddress`, web3.utils.toChecksumAddress(accountAddress));

  web3.eth.accounts.wallet.add(account);

  const contractTestEvent = new web3.eth.Contract(
      underlyingTokenAbi,
      testTokenAddress
  );

  const aliceClient = client.setOperator(aliceAccountId, aliceKey);

  const tokenAssociate = await new TokenAssociateTransaction()
      .setAccountId(aliceAccountId)
      .setTokenIds([testToken])
      .execute(aliceClient);

  const tokenAssociateReceipt = await tokenAssociate.getReceipt(aliceClient);
  console.log(`- tokenAssociateReceipt ${tokenAssociateReceipt.status.toString()}`);

  let approve = await contractTestEvent.methods.approve(aliceAccountId.toSolidityAddress(), 1)
  .send({ from: accountAddress, gas: 1000000 })
      .on("receipt", (receipt) => {
        console.log(`- Approval Transaction hash`, receipt.transactionHash);
      });
  console.log(`- Approval`, approve);

  let transfer = await contractTestEvent.methods.transferFrom(accountAddress, aliceAccountId.toSolidityAddress(), 1)
  .send({ from: accountAddress, gas: 1000000 })
      .on("receipt", (receipt) => {
        console.log(`- Transfer Transaction hash`, receipt.transactionHash);
      });
  console.log(`- Transfer`, transfer);

}
main();

