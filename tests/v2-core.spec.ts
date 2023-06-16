/* eslint-disable @typescript-eslint/ban-ts-comment */
import os from "os";
import path from "path";
import { Contract, LocalKoinos, Serializer, Token } from "@roamin/local-koinos";
import * as abi from "./../contracts/v2-core/core-abi.json";

// @ts-ignore koilib_types is needed when using koilib
abi.koilib_types = abi.types;

jest.setTimeout(600000);

const serializer = new Serializer(abi.types);

// pre configs fopr windows paths
let options = {}
if(os.platform() == "win32") {
  options["dockerComposeFile"] = [path.resolve(__dirname, '../').replace(/\\/g, "/"), "node_modules", "@roamin", "local-koinos", "docker-compose.yml"].join("/")
  options["envFile"] = [path.resolve(__dirname, '../').replace(/\\/g, "/"), "node_modules", "@roamin", "local-koinos", ".env"].join("/")
  console.log(options)
}

if (process.env.ENV === 'LOCAL') {
  options["rpc"] = 'http://host.docker.internal:8080',
  options["amqp"] = 'amqp://host.docker.internal:5672'
}

let localKoinos = new LocalKoinos(options)

const [ koin ] = localKoinos.getAccounts();

beforeAll(async () => {
  // start local-koinos node
  try {
    await localKoinos.startNode();
  } catch (error) {
    console.log(error)
  }
  await localKoinos.deployKoinContract({ mode: 'manual' });
  await localKoinos.mintKoinDefaultAccounts({ mode: 'manual' });
  await localKoinos.deployNameServiceContract({ mode: 'manual' });
  await localKoinos.setNameServiceRecord('koin', koin.address, { mode: 'manual' });
  await localKoinos.startBlockProduction();
});

afterAll(async () => {
  // stop local-koinos node
  await localKoinos.stopNode();
});


describe('mint', () => {
  it('mint liquidity', async () => {
  })
})

describe('burn', () => {
  it('burn liquidity', async () => {
  })
})

describe('swap', () => {
  it('swap tokens', async () => {
  })
})