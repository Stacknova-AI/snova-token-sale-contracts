import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Update Authorization Threshold", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const supply = 100000000
    const MAX = ethers.parseEther("1000000")
    const MIN = ethers.parseEther("50")
    const adjustableMaximum = MAX - BigInt("10")
    const adjustableMinimum = MIN + BigInt("10")
    const limit = BigInt("1000000000000000000000")

    beforeEach(async function () {
        ;[owner, user1, user2, user3, nonAdmin] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
        await tokenSaleRegistry.configureSaleRound(price, supply)
        await tokenSaleRegistry.activateSale()
    })

    describe("Negative Scenarios", function () {
        it("Should revert if called by a non-admin", async function () {
            await expect(
                tokenSaleRegistry.connect(nonAdmin).updateAuthorizationThreshold(adjustableMinimum - BigInt("1"))
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if the amount is lower than the adjustable minimum amount", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await tokenSaleRegistry.updateMinimumContribution(adjustableMinimum)
            await expect(
                tokenSaleRegistry.updateAuthorizationThreshold(adjustableMinimum - BigInt("1"))
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrAuthLimitOutsideAllowedRange")
        })

        it("Should revert if the amount is higher than the adjustable maximum amount", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await tokenSaleRegistry.updateMinimumContribution(adjustableMinimum)
            await expect(
                tokenSaleRegistry.updateAuthorizationThreshold(adjustableMaximum + BigInt("1"))
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrAuthLimitOutsideAllowedRange")
        })

        it("Should revert if the adjustable maximum amount is not set", async function () {
            await expect(tokenSaleRegistry.updateAuthorizationThreshold(BigInt("1"))).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrAuthLimitOutsideAllowedRange"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should set a new authorization limit", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await tokenSaleRegistry.updateMinimumContribution(adjustableMinimum)
            await tokenSaleRegistry.updateAuthorizationThreshold(limit)
            const newAuthLimit = await tokenSaleRegistry.getAuthLimit()
            expect(newAuthLimit).to.equal(limit)
        })

        it("Should emit AuthorizationThresholdUpdated event", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await tokenSaleRegistry.updateMinimumContribution(adjustableMinimum)
            await expect(tokenSaleRegistry.updateAuthorizationThreshold(limit))
                .to.emit(tokenSaleRegistry, "AuthorizationThresholdUpdated")
                .withArgs(limit)
        })
    })
})
