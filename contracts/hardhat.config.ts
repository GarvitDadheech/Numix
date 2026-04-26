import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const RESOLVER_PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY ?? "";
const WORLD_CHAIN_RPC =
  process.env.WORLD_CHAIN_RPC ??
  "https://worldchain-mainnet.g.alchemy.com/public";

if (!RESOLVER_PRIVATE_KEY && process.env.HARDHAT_NETWORK === "worldchain") {
  throw new Error("RESOLVER_PRIVATE_KEY is not set in .env");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    worldchain: {
      url: WORLD_CHAIN_RPC,
      chainId: 480,
      accounts: RESOLVER_PRIVATE_KEY ? [RESOLVER_PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
