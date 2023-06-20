import fs from "fs";
import path from "path";
import { Serializer } from "@roamin/local-koinos";
import * as Abi from "./periphery-abi.json";

// @ts-ignore koilib_types is needed when using koilib
Abi.koilib_types = Abi.types;

export const abi = Abi;
export const serializer = new Serializer(Abi.types)
export const wasm = fs.readFileSync(path.resolve(__dirname, "contract.wasm"))