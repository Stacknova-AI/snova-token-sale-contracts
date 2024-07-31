import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Activate Sale", function () {
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
            await tokenSaleRegistry.deactivateSale()
            await expect(tokenSaleRegistry.connect(nonAdmin).activateSale()).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "AccessControlUnauthorizedAccount"
            )
        })

        it("Should revert if the sale is already active", async function () {
            await expect(tokenSaleRegistry.activateSale()).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrSaleAlreadyStarted"
            )
        })

        it("Should revert if new stage is not set after the previous one", async function () {
            await tokenSaleRegistry.deactivateSale()
            await expect(tokenSaleRegistry.activateSale()).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrSaleAlreadyStarted"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should be active after activating the sale", async function () {
            expect(await tokenSaleRegistry.isActive()).to.equal(true)
        })

        it("Should emit StateUpdated event", async function () {
            const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
            tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)
            await expect(tokenSaleRegistry.activateSale()).to.emit(tokenSaleRegistry, "StateUpdated").withArgs(`1`)
        })
    })
})
