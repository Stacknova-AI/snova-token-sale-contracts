import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Batch Authorize Participants", function () {
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
                tokenSaleRegistry
                    .connect(nonAdmin)
                    .batchAuthorizeParticipants([user1.address, user2.address, user3.address], [true, true, true])
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if the lengths of addresses and statuses do not match", async function () {
            await expect(
                tokenSaleRegistry.batchAuthorizeParticipants(
                    [user1.address, user2.address, user3.address],
                    [true, true]
                )
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrInvalidParameters")

            await expect(
                tokenSaleRegistry.batchAuthorizeParticipants([user1.address, user2.address], [true, true, true])
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrInvalidParameters")
        })
    })

    describe("Positive Scenarios", function () {
        it("Should authorize the users correctly", async function () {
            await tokenSaleRegistry.batchAuthorizeParticipants(
                [user1.address, user2.address, user3.address],
                [true, true, true]
            )

            const isAuth1 = await tokenSaleRegistry.isAuth(user1.address)
            const isAuth2 = await tokenSaleRegistry.isAuth(user2.address)
            const isAuth3 = await tokenSaleRegistry.isAuth(user3.address)

            expect(isAuth1).to.equal(true)
            expect(isAuth2).to.equal(true)
            expect(isAuth3).to.equal(true)
        })

        it("Should emit AuthUserUpdated event for each user", async function () {
            const participants = [user1.address, user2.address, user3.address]
            const statuses = [true, true, true]

            for (let i = 0; i < participants.length; i++) {
                await expect(tokenSaleRegistry.batchAuthorizeParticipants([participants[i]], [statuses[i]]))
                    .to.emit(tokenSaleRegistry, "AuthUserUpdated")
                    .withArgs(participants[i], statuses[i])
            }
        })
    })
})
