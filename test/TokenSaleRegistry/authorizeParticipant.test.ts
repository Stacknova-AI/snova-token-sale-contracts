import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Authorize Participant", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const supply = 100000000

    beforeEach(async function () {
        ;[owner, user1, nonAdmin] = await ethers.getSigners()
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
                tokenSaleRegistry.connect(nonAdmin).authorizeParticipant(user1.address, true)
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })
    })

    describe("Positive Scenarios", function () {
        it("Should authorize the user", async function () {
            await tokenSaleRegistry.authorizeParticipant(user1.address, true)
            const isAuth = await tokenSaleRegistry.isAuth(user1.address)
            expect(isAuth).to.equal(true)
        })

        it("Should emit AuthUserUpdated event", async function () {
            await expect(tokenSaleRegistry.authorizeParticipant(user1.address, true))
                .to.emit(tokenSaleRegistry, "AuthUserUpdated")
                .withArgs(user1.address, true)
        })
    })
})
