import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Adjust Round Pricing", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const initialPrice = BigInt("16000000000000000")
    const initialSupply = 100000000

    beforeEach(async function () {
        ;[owner, nonAdmin] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()

        await tokenSaleRegistry.activateSale()
    })

    describe("Negative Scenarios", function () {
        it("Should revert if called by a non-admin", async function () {
            await tokenSaleRegistry.configureSaleRound(initialPrice, initialSupply)
            const newPrice = BigInt("20000000000000000")
            await expect(
                tokenSaleRegistry.connect(nonAdmin).adjustRoundPricing(0, newPrice),
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if sales are deactivated", async function () {
            await tokenSaleRegistry.configureSaleRound(initialPrice, initialSupply)
            await tokenSaleRegistry.deactivateSale()
            await expect(tokenSaleRegistry.adjustRoundPricing(0, initialPrice)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrSaleNotActive",
            )
        })

        it("Should revert if the round is undefined", async function () {
            await tokenSaleRegistry.configureSaleRound(initialPrice, initialSupply)
            await expect(tokenSaleRegistry.adjustRoundPricing(1, initialPrice)).to.be.reverted
        })

        it("Should revert if the round is open", async function () {
            await tokenSaleRegistry.configureSaleRound(initialPrice, initialSupply)
            await tokenSaleRegistry.startSaleRound(0)
            await expect(tokenSaleRegistry.adjustRoundPricing(0, initialPrice)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrRoundStarted",
            )
        })

        it("Should revert if the new round pricing is zero", async function () {
            await tokenSaleRegistry.configureSaleRound(initialPrice, initialSupply)
            await expect(tokenSaleRegistry.adjustRoundPricing(0, 0)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrInvalidPrice",
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should update the price in the _rounds array", async function () {
            await tokenSaleRegistry.configureSaleRound(initialPrice, initialSupply)
            const newPrice = BigInt("18400000000000000")
            await tokenSaleRegistry.adjustRoundPricing(0, newPrice)
            const roundData = await tokenSaleRegistry.getRound(0)
            expect(roundData.price).to.equal(newPrice)
        })

        it("Should emit SaleRoundPricingAdjusted event", async function () {
            await tokenSaleRegistry.configureSaleRound(initialPrice, initialSupply)
            const newPrice = BigInt("20000000000000000")
            await expect(tokenSaleRegistry.adjustRoundPricing(0, newPrice))
                .to.emit(tokenSaleRegistry, "SaleRoundPricingAdjusted")
                .withArgs(0, newPrice)
        })
    })
})
