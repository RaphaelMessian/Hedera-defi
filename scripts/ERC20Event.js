console.clear();
const  {getClient, createAccount, createFungibleToken} = require("./utils");
const { AccountId, PrivateKey, TokenAssociateTransaction, TransferTransaction} = require("@hashgraph/sdk");
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

const rawdataUnderlyingToken = fs.readFileSync(`${__dirname}/../artifacts/contracts/ERC4626/lab49Vault/VaultToken.sol/VaultToken.json`);
const rawdataUnderlyingTokenJSon = JSON.parse(rawdataUnderlyingToken);
const underlyingTokenAbi = rawdataUnderlyingTokenJSon.abi;


async function main() {

    const testToken = await createFungibleToken("TestToken", "TT", operatorAccountId, operatorPrKey.publicKey, client, operatorPrKey);
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

    const transaction = await new TransferTransaction()
        .addTokenTransfer(testToken, operatorAccountId, -1)
        .addTokenTransfer(testToken, aliceAccountId, 1)
        .freezeWith(client);

    //Sign with the sender account private key
    const signTx = await transaction.sign(operatorPrKey);

    //Sign with the client operator private key and submit to a Hedera network
    const txResponse = await signTx.execute(client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);
    const record = await txResponse.getRecord(client);

    //Obtain the transaction consensus status
    const transactionStatus = receipt.status;

    console.log("The transaction consensus status " +transactionStatus.toString());
    console.log("The transaction consensus status " + record.transactionHash[0].toString());


    // let approve = await contractTestEvent.methods.approve(aliceAccountId.toSolidityAddress(), 10)
    // .send({ from: accountAddress, gas: 1000000 })
    //     .on("receipt", (receipt) => {
    //       console.log(`- Approval Transaction hash`, receipt.transactionHash);
    //     });
    // console.log(`- Approval`, approve);

    // let transfer = await contractTestEvent.methods.transfer(aliceAccountId.toSolidityAddress(), 10)
    // .send({ from: accountAddress, gas: 1000000 })
    //     .on("receipt", (receipt) => {
    //       console.log(`- Transfer Transaction hash`, receipt.transactionHash);
    //     });
    // console.log(`- Transfer`, transfer);

    // const testTokenEvent = new web3.eth.Contract(
    //     underlyingTokenAbi,
    //     "0x00000000000000000000000000000000004439a8"
    // );

    let getEvent = await contractTestEvent.getPastEvents('Transfer', {}, function(error, events) { 
        console.log("event", events); 
    }).then(function(events) {
    });
}
main();

