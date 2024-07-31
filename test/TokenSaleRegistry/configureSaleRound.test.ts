import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Configure Sale Round", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const supply = 100000000

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
            await expect(
                tokenSaleRegistry.connect(nonAdmin).configureSaleRound(price, supply)
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if sales are deactivated", async function () {
            await tokenSaleRegistry.deactivateSale()
            await expect(tokenSaleRegistry.configureSaleRound(price, supply)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrSaleNotActive"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should add a new round to the _rounds array", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            const roundData = await tokenSaleRegistry.getRound(0)
            expect(roundData.supply).to.equal(supply)
        })

        it("Should emit SaleRoundConfigured event", async function () {
            await expect(tokenSaleRegistry.configureSaleRound(price, supply))
                .to.emit(tokenSaleRegistry, "SaleRoundConfigured")
                .withArgs(price, supply)
        })
    })
})
