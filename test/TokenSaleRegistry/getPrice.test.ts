import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Get Price", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const nextRoundPrice = BigInt("18400000000000000")
    const supply = 100000000
    const nextRoundSupply = 1700000

    beforeEach(async function () {
        ;[owner, user1, user2, user3] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
        await tokenSaleRegistry.configureSaleRound(price, supply)
        await tokenSaleRegistry.activateSale()
    })

    describe("Positive Scenarios", function () {
        it("Should return the price if the current round is open", async function () {
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
            await tokenSaleRegistry.startSaleRound(1)
            const currentPrice = await tokenSaleRegistry.getPrice()
            expect(currentPrice).to.equal(nextRoundPrice)
        })
    })

    describe("Negative Scenarios", function () {
        it("Should return zero if the current round is not open", async function () {
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.endSaleRound(1)
            const currentPrice = await tokenSaleRegistry.getPrice()
            expect(currentPrice).to.equal(0)
        })
    })
})
