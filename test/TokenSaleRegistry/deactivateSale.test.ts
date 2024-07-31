import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Deactivate Sale", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string

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
            await expect(tokenSaleRegistry.connect(nonAdmin).deactivateSale()).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "AccessControlUnauthorizedAccount"
            )
        })

        it("Should revert if called from a None state", async function () {
            const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
            tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)
            await expect(tokenSaleRegistry.deactivateSale()).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrSaleNotActive"
            )
        })

        it("Should revert if sales are already deactivated", async function () {
            await tokenSaleRegistry.deactivateSale()
            await expect(tokenSaleRegistry.deactivateSale()).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrSaleNotActive"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should return false when calling isActive() after deactivation", async function () {
            await tokenSaleRegistry.deactivateSale()
            expect(await tokenSaleRegistry.isActive()).to.equal(false)
        })

        it("Should return true when calling isInactive() after deactivation", async function () {
            await tokenSaleRegistry.deactivateSale()
            expect(await tokenSaleRegistry.isInactive()).to.equal(true)
        })

        it("Should emit StateUpdated event on deactivation", async function () {
            await expect(tokenSaleRegistry.deactivateSale()).to.emit(tokenSaleRegistry, "StateUpdated").withArgs("2")
        })
    })
})
