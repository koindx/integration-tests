/* eslint-disable @typescript-eslint/ban-ts-comment */
import os from "os";
import path from "path";
import { Contract, LocalKoinos, Serializer, Token } from "@roamin/local-koinos";
import { core, periphery } from "./../contracts";

jest.setTimeout(600000);

// pre configs fopr windows paths
let options = {}
if(os.platform() == "win32") {
  options["dockerComposeFile"] = [path.resolve(__dirname, '../').replace(/\\/g, "/"), "node_modules", "@roamin", "local-koinos", "docker-compose.yml"].join("/")
  options["envFile"] = [path.resolve(__dirname, '../').replace(/\\/g, "/"), "node_modules", "@roamin", "local-koinos", ".env"].join("/")
}

if (process.env.ENV === 'LOCAL') {
  options["rpc"] = 'http://host.docker.internal:8080',
  options["amqp"] = 'amqp://host.docker.internal:5672'
}

let localKoinos = new LocalKoinos(options)

const [ genesis, koin, coreWif, peripheryWif, dummyTokenA, dummyTokenB, account1 ] = localKoinos.getAccounts();

let CoreContract: Contract;
let PeripheryContract: Contract;


describe('test the main methods', () => {
  beforeAll(async () => {
    await localKoinos.startNode();
    await localKoinos.deployKoinContract({ mode: 'manual' });
    await localKoinos.mintKoinDefaultAccounts({ mode: 'manual' });
    await localKoinos.deployNameServiceContract({ mode: 'manual' });
    await localKoinos.setNameServiceRecord('koin', koin.address, { mode: 'manual' });
    await localKoinos.deployTokenContract(dummyTokenA.wif);
    await localKoinos.deployTokenContract(dummyTokenB.wif);
    await localKoinos.startBlockProduction();

    // deploy periphery
    PeripheryContract = await localKoinos.deployContract(
      peripheryWif.wif,
      periphery.wasm,
      // @ts-ignore abi is compatible
      periphery.abi,
      { mode: 'manual' }
    );
    // deploy core
    CoreContract = await localKoinos.deployContract(
      coreWif.wif,
      core.wasm,
      // @ts-ignore abi is compatible
      core.abi,
      { mode: 'manual' },
      {
        authorizesCallContract: true,
        authorizesTransactionApplication: true,
        authorizesUploadContract: true,
        nextOperations: [
          (await PeripheryContract.functions.create_pair(
            {tokenA: dummyTokenA.address, tokenB: dummyTokenB.address },
            {
              onlyOperation: true,
              payer: account1.signer.getAddress()
            }
          )).operation
        ],
        beforeSend: async (tx) => {
          console.log(tx)
          await account1.signer.signTransaction(tx);
        }
      }
    );

    console.log("llego aqui")
  });
  
  afterAll(async () => {
    // // stop local-koinos node
    // await localKoinos.stopNode();
  });

  it('mint liquidity', async () => {
  })

  it('burn liquidity', async () => {
  })

  it('swap tokens', async () => {
  })
})
