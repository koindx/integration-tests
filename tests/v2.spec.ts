/* eslint-disable @typescript-eslint/ban-ts-comment */
import os from "os";
import path from "path";
import { Contract, LocalKoinos, Token } from "@roamin/local-koinos";
import { core, periphery } from "../contracts";

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

const [ genesis, koin, coreWif, peripheryWif, dummyTokenA, dummyTokenB, acc1Wif, acc2Wif ] = localKoinos.getAccounts();

let CoreContract: Contract;
let PeripheryContract: Contract;
let dummyTKNA: Token;
let dummyTKNB: Token;

beforeAll(async () => {
  await localKoinos.startNode();
  await localKoinos.deployKoinContract({ mode: 'manual' });
  await localKoinos.mintKoinDefaultAccounts({ mode: 'manual' });
  await localKoinos.deployNameServiceContract({ mode: 'manual' });
  await localKoinos.setNameServiceRecord('koin', koin.address, { mode: 'manual' });
  await localKoinos.startBlockProduction();

  dummyTKNA = await localKoinos.deployTokenContract(dummyTokenA.wif);
  dummyTKNB = await localKoinos.deployTokenContract(dummyTokenB.wif);

  // deploy periphery
  PeripheryContract = await localKoinos.deployContract(
    peripheryWif.wif,
    periphery.wasm,
    // @ts-ignore abi is compatible
    periphery.abi,
    {}
  );
})

afterAll(async () => {
  // stop local-koinos node
  await localKoinos.stopNode();
});

describe('test deploy core contracts', () => {
  it('should reject if trying to upload a different hash', async () => {
    try {
      await localKoinos.deployContract(
        coreWif.wif,
        periphery.wasm,
        // @ts-ignore abi is compatible
        core.abi,
        {},
        {
          authorizesCallContract: true,
          authorizesTransactionApplication: true,
          authorizesUploadContract: true,
          nextOperations: [
            (await PeripheryContract.functions.create_pair({ tokenA: dummyTokenA.address, tokenB: dummyTokenB.address }, { sendTransaction: false, onlyOperation: true })).operation
          ]
        }
      );
    } catch (err) {
      expect(err.message).toEqual('{"error":"KOINDX: INVALID_HASH","code":1,"logs":["transaction reverted: KOINDX: INVALID_HASH"]}')
    }
  })

  it('should reject if authorities are not overridden', async () => {
    try {
      await localKoinos.deployContract(
        coreWif.wif,
        core.wasm,
        // @ts-ignore abi is compatible
        core.abi,
        {},
        {
          authorizesCallContract: true,
          authorizesTransactionApplication: false,
          authorizesUploadContract: true,
          nextOperations: [
            (await PeripheryContract.functions.create_pair({ tokenA: dummyTokenA.address, tokenB: dummyTokenB.address }, { sendTransaction: false, onlyOperation: true })).operation
          ]
        }
      );
    } catch (err) {
      expect(err.message).toEqual('{"error":"KOINDX: FAIL_AUTHORITY_OVERRIDES","code":1,"logs":["transaction reverted: KOINDX: FAIL_AUTHORITY_OVERRIDES"]}')
    }
  })

  it('should reject if there are more than 2 operations in the transaction', async () => {
    try {
      await localKoinos.deployContract(
        coreWif.wif,
        core.wasm,
        // @ts-ignore abi is compatible
        core.abi,
        {},
        {
          authorizesCallContract: true,
          authorizesTransactionApplication: true,
          authorizesUploadContract: true,
          nextOperations: [
            (await PeripheryContract.functions.create_pair({ tokenA: dummyTokenA.address, tokenB: dummyTokenA.address }, { sendTransaction: false, onlyOperation: true })).operation,
            (await PeripheryContract.functions.create_pair({ tokenA: dummyTokenA.address, tokenB: dummyTokenA.address }, { sendTransaction: false, onlyOperation: true })).operation
          ]
        }
      );
    } catch (err) {
      expect(err.message).toEqual('{"error":"KOINDX: MAX_OPERATIONS","code":1,"logs":["transaction reverted: KOINDX: MAX_OPERATIONS"]}')
    }
  })

  it('should reject if the same token is being uploaded', async () => {
    try {
      await localKoinos.deployContract(
        coreWif.wif,
        core.wasm,
        // @ts-ignore abi is compatible
        core.abi,
        {},
        {
          authorizesCallContract: true,
          authorizesTransactionApplication: true,
          authorizesUploadContract: true,
          nextOperations: [
            (await PeripheryContract.functions.create_pair({ tokenA: dummyTokenA.address, tokenB: dummyTokenA.address }, { sendTransaction: false, onlyOperation: true })).operation
          ]
        }
      );
    } catch (err) {
      expect(err.message).toEqual('{"error":"KOINDX: TOKENS_MUST_BE_DIFFERENT","code":1,"logs":["transaction reverted: KOINDX: TOKENS_MUST_BE_DIFFERENT"]}')
    }
  })
})

describe('test the main methods', () => {
  beforeAll(async () => {
    // deploy core
    CoreContract = await localKoinos.deployContract(
      coreWif.wif,
      core.wasm,
      // @ts-ignore abi is compatible
      core.abi,
      {},
      {
        authorizesCallContract: true,
        authorizesTransactionApplication: true,
        authorizesUploadContract: true,
        nextOperations: [
          (await PeripheryContract.functions.create_pair({ tokenA: dummyTokenA.address, tokenB: dummyTokenB.address }, { sendTransaction: false, onlyOperation: true })).operation
        ]
      }
    );

    // mint liquidity to users
    let mintTKN
    mintTKN = await dummyTKNA.mint(acc1Wif.address, "100000000000000");
    await mintTKN.transaction?.wait();
    mintTKN = await dummyTKNB.mint(acc1Wif.address, "100000000000000");
    await mintTKN.transaction?.wait();
    mintTKN = await dummyTKNA.mint(acc2Wif.address, "100000000000000");
    await mintTKN.transaction?.wait();
    mintTKN = await dummyTKNB.mint(acc2Wif.address, "100000000000000");
    await mintTKN.transaction?.wait();
  });

  it('mint liquidity', async () => {

    // Minimum liquidity error
    try {
      await PeripheryContract.functions.add_liquidity({
        tokenA: dummyTKNA.address(),
        tokenB: dummyTKNB.address(),
        amountADesired: "2500",
        amountBDesired: "1000",
        amountAMin: "2499",
        amountBMin: "999"
      }, {
        payer: acc1Wif.address,
        beforeSend: async (tx) => {
          await acc1Wif.signer.signTransaction(tx);
        }
      })
    } catch (err) {
      expect(err.message).toEqual('{"error":"could not subtract 10000 from 1581","code":1,"logs":["transaction reverted: could not subtract 10000 from 1581"]}')
    }

    // add liquidity user number 1
    let res = await PeripheryContract.functions.add_liquidity({
      tokenA: dummyTKNA.address(),
      tokenB: dummyTKNB.address(),
      amountADesired: "2500000000",
      amountBDesired: "1000000000",
      amountAMin: "2499000000",
      amountBMin: "999000000"
    }, {
      payer: acc1Wif.address,
      beforeSend: async (tx) => { await acc1Wif.signer.signTransaction(tx) }
    })
    await res.transaction?.wait();
    res = await CoreContract.functions.get_reserves({});
    expect(res?.result?.kLast).toEqual("2500000000000000000");
    expect(res?.result?.reserveA).toEqual("2500000000");
    expect(res?.result?.reserveB).toEqual("1000000000");
    res = await CoreContract.functions.total_supply({});
    expect(res?.result?.value).toEqual("1581138830");
    res = await CoreContract.functions.balance_of({ owner: acc1Wif.address });
    expect(res?.result?.value).toEqual("1581128830");

    // The token calculation is wrong
    try {
      await PeripheryContract.functions.add_liquidity({
        tokenA: dummyTKNB.address(),
        tokenB: dummyTKNA.address(),
        amountADesired: "25000000",
        amountBDesired: "10000000",
        amountAMin: "24990000",
        amountBMin: "9990000"
      }, {
        payer: acc2Wif.address,
        beforeSend: async (tx) => { await acc2Wif.signer.signTransaction(tx) }
      })
    } catch (err) {
      expect(err.message).toEqual('{"error":"KOINDX: INSUFFICIENT_A_AMOUNT","code":1,"logs":["transaction reverted: KOINDX: INSUFFICIENT_A_AMOUNT"]}')
    }

    // add liquidity user number 2
    res = await PeripheryContract.functions.add_liquidity({
      tokenA: dummyTKNA.address(),
      tokenB: dummyTKNB.address(),
      amountADesired: "25000000",
      amountBDesired: "10000000",
      amountAMin: "24990000",
      amountBMin: "9990000"
    }, {
      payer: acc2Wif.address,
      beforeSend: async (tx) => { await acc2Wif.signer.signTransaction(tx) }
    })
    await res.transaction?.wait();
    res = await CoreContract.functions.get_reserves({});
    expect(res?.result?.kLast).toEqual("2550250000000000000");
    expect(res?.result?.reserveA).toEqual("2525000000");
    expect(res?.result?.reserveB).toEqual("1010000000");
    res = await CoreContract.functions.total_supply({});
    expect(res?.result?.value).toEqual("1596950218");
    res = await CoreContract.functions.balance_of({ owner: acc2Wif.address });
    expect(res?.result?.value).toEqual("15811388");
  })

  it('burn liquidity', async () => {

    let res = await CoreContract.functions.approve({
      owner: acc1Wif.address,
      spender: peripheryWif.address,
      value: "96950218"
    })
    await res.transaction?.wait();
    console.log(res)



  })

  it('swap tokens', async () => {
  })
})
