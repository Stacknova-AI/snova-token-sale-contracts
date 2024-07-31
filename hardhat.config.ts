import { HardhatUserConfig } from "hardhat/config"
import { getEnvVariable } from "./scripts/helpers"
import "@nomicfoundation/hardhat-toolbox"
import "@typechain/hardhat"
import "@nomicfoundation/hardhat-chai-matchers"
import "@nomicfoundation/hardhat-ethers"
import "@nomiclabs/hardhat-solhint"
import "solidity-docgen"
import "hardhat-contract-sizer"
import "@matterlabs/hardhat-zksync-solc"
import "@matterlabs/hardhat-zksync-deploy"
import * as dotenv from "dotenv"

dotenv.config()

const NETWORK = process.env.NETWORK || "eth"
if (!NETWORK) {
    console.error("No NETWORK environment variable set. Please specify the network.")
    process.exit(1)
}

const { DEPLOYER_PRIVATE_KEY, INVESTOR_PRIVATE_KEY, REFFERAL_PRIVATE_KEY } = process.env

const getAccounts = () => {
    return [
        ...(DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : []),
        ...(INVESTOR_PRIVATE_KEY ? [INVESTOR_PRIVATE_KEY] : []),
        ...(REFFERAL_PRIVATE_KEY ? [REFFERAL_PRIVATE_KEY] : []),
    ]
}

const createNetworkConfig = (url: string) => ({
    url,
    accounts: getAccounts(),
})

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            viaIR: true,
        },
    },
    typechain: {
        outDir: "typechain",
        target: "ethers-v6",
    },
    contractSizer: {
        alphaSort: false,
        disambiguatePaths: true,
        runOnCompile: true,
        strict: false,
        only: [],
    },
    networks: {
        hardhat: {
            initialBaseFeePerGas: 10,
        },
        eth: createNetworkConfig("https://rpc.ankr.com/eth"),
        bsc: createNetworkConfig("https://rpc.ankr.com/bsc"),
        polygon: createNetworkConfig("https://rpc.ankr.com/polygon"),
        arbitrum: createNetworkConfig("https://rpc.ankr.com/arbitrum"),
        avalanche: createNetworkConfig("https://rpc.ankr.com/avalanche"),
        op: createNetworkConfig("https://rpc.ankr.com/optimism"),
        base: createNetworkConfig("https://rpc.ankr.com/base"),
    },
    etherscan: {
        apiKey: getEnvVariable("SCAN_API_KEY", NETWORK),
    },
}

export default config
