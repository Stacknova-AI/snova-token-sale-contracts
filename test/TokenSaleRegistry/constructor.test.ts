import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Constructor", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string

    beforeEach(async function () {
        ;[owner] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
    })

    describe("Constructor", function () {
        it("Should set the treasury address correctly", async function () {
            expect(await tokenSaleRegistry.getFundsWallet()).to.equal(owner.address)
        })

        it("Should grant the DEFAULT_ADMIN_ROLE to the deployer", async function () {
            expect(await tokenSaleRegistry.hasRole(defaultAdminRole, owner.address)).to.be.true
        })

        it("Should grant the OPERATOR_ROLE to the deployer", async function () {
            expect(await tokenSaleRegistry.hasRole(operatorRole, owner.address)).to.be.true
        })

        it("Should revert deployment with zero address as treasury", async function () {
            const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
            await expect(tokenSaleRegistryFactory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrNullAddress"
            )
        })
    })
})
