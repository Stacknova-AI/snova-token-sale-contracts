import { ethers, run } from "hardhat"
import { getEnvVariable } from "./helpers"
import { TokenSaleRegistry__factory, PresaleSNOVA__factory } from "../typechain"

const environment = process.env.NETWORK

if (!environment) {
    console.error("No NETWORK environment variable set. Please specify the network.")
    process.exit(1)
}

const MAIN_CURRENCY_PRICE_FEED = getEnvVariable("MAIN_CURRENCY_PRICE_FEED", environment)
const MAIN_CURRENCY_ADDRESS = getEnvVariable("MAIN_CURRENCY_ADDRESS", environment)
const USDT_ADDRESS = getEnvVariable("USDT_ADDRESS", environment)
const USDC_ADDRESS = getEnvVariable("USDC_ADDRESS", environment)
const DAI_ADDRESS = getEnvVariable("DAI_ADDRESS", environment)
const ZERO_ADDRESS = process.env.ZERO_ADDRESS || "0x0000000000000000000000000000000000000000"
const MAIN_CURRENCY_DECIMAL = getEnvVariable("MAIN_CURRENCY_DECIMAL", environment)
const USDT_DECIMAL = getEnvVariable("USDT_DECIMAL", environment)
const USDC_DECIMAL = getEnvVariable("USDC_DECIMAL", environment)
const DAI_DECIMAL = getEnvVariable("DAI_DECIMAL", environment)
const PRICE_THRESHOLD = getEnvVariable("PRICE_THRESHOLD", environment)
const GAS_PRICE = getEnvVariable("GAS_PRICE", environment)
const GAS_LIMIT = getEnvVariable("GAS_LIMIT", environment)

const MAX = ethers.parseEther("1000000")
const MIN = ethers.parseEther("50")
const firstRoundsPrice = ethers.parseEther("0.045")
const firstRoundSupply = ethers.parseEther("1700000")

const gasPrice = ethers.parseUnits(`${GAS_PRICE}`, "gwei")
const gasLimit = GAS_LIMIT

async function main() {
    const [signer] = await ethers.getSigners()
    const provider = ethers.provider
    let TokenSaleRegistry: any
    let PresaleSNOVA: any

    async function getLatestNonce(address: string) {
        return await provider.getTransactionCount(address, "latest")
    }

    async function sendTransactionWithRetry(txFunc: (nonce: number) => Promise<any>) {
        let attempts = 0
        let nonce = await getLatestNonce(signer.address)
        while (attempts < 125) {
            try {
                return await txFunc(nonce)
            } catch (error: any) {
                if (error.code === "NONCE_EXPIRED" || error.message.includes("nonce too low")) {
                    attempts++
                    nonce++
                    console.log(`Nonce error encountered. Retrying ${attempts}/3 with nonce ${nonce}...`)
                    await new Promise((f) => setTimeout(f, 3000))
                } else {
                    throw error
                }
            }
        }
        throw new Error("Failed to send transaction after multiple attempts due to nonce issues.")
    }

    try {
        console.log("Deploying TokenSaleRegistry...")
        await sendTransactionWithRetry(async (nonce) => {
            TokenSaleRegistry = await new TokenSaleRegistry__factory(signer).deploy(signer.address, {
                gasPrice,
                gasLimit,
                nonce,
            })
            console.log("TokenSaleRegistry contract deployed to:", TokenSaleRegistry.target)
            return TokenSaleRegistry
        })

        console.log("Deploying PresaleSNOVA...")
        await new Promise((f) => setTimeout(f, 150000))
        await sendTransactionWithRetry(async (nonce) => {
            PresaleSNOVA = await new PresaleSNOVA__factory(signer).deploy(TokenSaleRegistry.target, PRICE_THRESHOLD, {
                gasPrice,
                gasLimit,
                nonce,
            })
            console.log("PresaleSNOVA contract deployed to:", PresaleSNOVA.target)
            return PresaleSNOVA
        })

        console.log("Verifying TokenSaleRegistry...")
        await new Promise((f) => setTimeout(f, 10000))
        await run("verify:verify", {
            address: TokenSaleRegistry.target,
            contract: "contracts/TokenSaleRegistry.sol:TokenSaleRegistry",
            constructorArguments: [signer.address],
        })

        console.log("Verifying PresaleSNOVA...")
        await new Promise((f) => setTimeout(f, 10000))
        await run("verify:verify", {
            address: PresaleSNOVA.target,
            contract: "contracts/PresaleSNOVA.sol:PresaleSNOVA",
            constructorArguments: [TokenSaleRegistry.target, PRICE_THRESHOLD],
        })

        console.log("Whitelistening accepted currencies")
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await PresaleSNOVA.addCurrency(
                MAIN_CURRENCY_ADDRESS,
                MAIN_CURRENCY_PRICE_FEED,
                MAIN_CURRENCY_DECIMAL,
                false,
                { gasPrice, gasLimit, nonce }
            )
            await tx.wait()
        })
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await PresaleSNOVA.addCurrency(USDT_ADDRESS, ZERO_ADDRESS, USDT_DECIMAL, true, {
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await PresaleSNOVA.addCurrency(USDC_ADDRESS, ZERO_ADDRESS, USDC_DECIMAL, true, {
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await PresaleSNOVA.addCurrency(DAI_ADDRESS, ZERO_ADDRESS, DAI_DECIMAL, true, {
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })

        console.log("Configuring sale round...")
        await new Promise((f) => setTimeout(f, 10000))
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await TokenSaleRegistry.configureSaleRound(firstRoundsPrice, firstRoundSupply, {
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })

        console.log("Activating sale...")
        await new Promise((f) => setTimeout(f, 10000))
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await TokenSaleRegistry.activateSale({
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })

        console.log("Configuring sale round...")
        await new Promise((f) => setTimeout(f, 10000))
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await TokenSaleRegistry.configureSaleRound(firstRoundsPrice, firstRoundSupply, {
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })

        console.log("Starting sale round...")
        await new Promise((f) => setTimeout(f, 10000))
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await TokenSaleRegistry.startSaleRound(1, {
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })

        console.log("Updating maximum allocation...")
        await new Promise((f) => setTimeout(f, 10000))
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await TokenSaleRegistry.updateMaximumAllocation(MAX, { gasPrice, gasLimit, nonce })
            await tx.wait()
        })

        console.log("Updating minimum contribution...")
        await new Promise((f) => setTimeout(f, 10000))
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await TokenSaleRegistry.updateMinimumContribution(MIN, {
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })

        console.log("Updating authorization threshold...")
        await new Promise((f) => setTimeout(f, 10000))
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await TokenSaleRegistry.updateAuthorizationThreshold(MAX, {
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })

        console.log("Granting OPERATOR_ROLE to PresaleSNOVA...")
        await new Promise((f) => setTimeout(f, 10000))
        await sendTransactionWithRetry(async (nonce) => {
            const tx = await TokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), PresaleSNOVA.target, {
                gasPrice,
                gasLimit,
                nonce,
            })
            await tx.wait()
        })
    } catch (error: any) {
        console.error("Error encountered:", error)

        if (error.transactionHash) {
            console.log("Fetching transaction receipt for hash:", error.transactionHash)
            try {
                const txReceipt = await provider.getTransactionReceipt(error.transactionHash)
                if (txReceipt) {
                    console.error("Transaction failed with receipt:", txReceipt)
                }
            } catch (receiptError) {
                console.error("Error fetching transaction receipt:", receiptError)
            }
        } else {
            console.error("Error details:", error)
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Unhandled error:", error)
        process.exit(1)
    })
