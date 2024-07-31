import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Start Sale Round", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const supply = 100000000
    const nextRoundPrice = BigInt("18400000000000000")

    beforeEach(async function () {
        ;[owner, nonAdmin] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
        await tokenSaleRegistry.configureSaleRound(price, supply)
        await tokenSaleRegistry.activateSale()
    })

    describe("Negative Scenarios", function () {
        it("Should revert if called by a non-admin", async function () {
            const nextRoundSupply = 1700000
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
            await expect(tokenSaleRegistry.connect(nonAdmin).startSaleRound(1)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "AccessControlUnauthorizedAccount"
            )
        })

        it("Should revert if sales are deactivated", async function () {
            await tokenSaleRegistry.deactivateSale()
            await expect(tokenSaleRegistry.startSaleRound(0)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrSaleNotActive"
            )
        })

        it("Should revert if the round has already started", async function () {
            await tokenSaleRegistry.startSaleRound(0)
            await expect(tokenSaleRegistry.startSaleRound(0)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrRoundStarted"
            )
        })

        it("Should revert if the round index is not set", async function () {
            await expect(tokenSaleRegistry.startSaleRound(1)).to.be.revertedWithPanic(
                "0x32" // Array accessed at an out-of-bounds or negative index
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should end the current round before starting the next round", async function () {
            const nextRoundSupply = 1700000
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
            await tokenSaleRegistry.startSaleRound(1)

            const newRoundPrice = BigInt("20000000000000000")
            const newRoundSupply = 3200000
            await tokenSaleRegistry.configureSaleRound(newRoundPrice, newRoundSupply)
            await tokenSaleRegistry.startSaleRound(2)

            const roundData = await tokenSaleRegistry.getRound(1)
            expect(roundData[1]).to.equal(2)
        })

        it("Should start the next round correctly", async function () {
            const nextRoundSupply = 1700000
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
            await tokenSaleRegistry.startSaleRound(1)

            const roundData = await tokenSaleRegistry.getRound(1)
            expect(roundData[1]).to.equal(1)
        })

        it("Should increment the current round counter", async function () {
            const nextRoundSupply = 1700000
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
            await tokenSaleRegistry.startSaleRound(1)

            const currentRound = await tokenSaleRegistry.getCurrentRound()
            expect(currentRound).to.equal(1)
        })

        it("Should emit SaleRoundStarted event", async function () {
            const nextRoundSupply = 1700000
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)

            await expect(tokenSaleRegistry.startSaleRound(1)).to.emit(tokenSaleRegistry, "SaleRoundStarted").withArgs(1)
        })
    })
})
