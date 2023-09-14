console.clear();
const  {deployContract, createFungibleToken} = require("../scripts/utils");
const {Client, AccountId, PrivateKey, ContractFunctionParameters} = require("@hashgraph/sdk");
const fs = require('fs');
require('dotenv').config({path: __dirname + '/'});

async function main() {

  let client = Client.forTestnet();
  const operatorPrKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
  const operatorAccountId = AccountId.fromString(process.env.OPERATOR_ID);

  client.setOperator(
    operatorAccountId,
    operatorPrKey
  ); 

  const createERC4626 = await createFungibleToken("ERC4626 on Hedera", "HERC4626", operatorAccountId, operatorPrKey.publicKey, client, operatorPrKey);

  const rawdataERC4626 = fs.readFileSync(`${__dirname}/../artifacts/contracts/ERC4626/Vault.sol/HederaVault.json`);
  const rawdataERC4626ContractJSon = JSON.parse(rawdataERC4626);
  const ERC4626ContractByteCode = rawdataERC4626ContractJSon.bytecode;
  const constructorParameters = new ContractFunctionParameters()
      .addAddress(createERC4626.toSolidityAddress());

  const createERC4626Contract = await deployContract(client, ERC4626ContractByteCode, 1500000, operatorPrKey, constructorParameters);
  
  console.log(`- Contract created ${createERC4626Contract.toString()} ,Contract Address ${createERC4626Contract.toSolidityAddress()} -`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
