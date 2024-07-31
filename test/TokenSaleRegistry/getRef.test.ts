import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Get Referral", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const supply = 100000000
    const addressZero = "0x0000000000000000000000000000000000000000"
    const globalPrimaryReward = 150
    const globalSecondaryRewards = 50

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
        const mockAddressOfToken = "0xF1838e675089e4DCA7A76BC70B1A39184A02beC4"
        const amount = 100
        const sold = 150

        async function initializeAndRecordSale(
            user: SignerWithAddress,
            ref: SignerWithAddress,
            primaryReward: number,
            secondaryReward: number
        ) {
            await tokenSaleRegistry.initializeReferralAccounts([ref.address], [primaryReward], [secondaryReward])
            await tokenSaleRegistry.processAndRecordSale(
                user.address,
                mockAddressOfToken,
                amount,
                sold,
                ref.address,
                primaryReward,
                secondaryReward
            )
        }

        it("Should get the correct referral address", async function () {
            await initializeAndRecordSale(user1, user2, 40, 20)
            const referral = await tokenSaleRegistry.getRef(user1.address, user2.address)
            expect(referral).to.equal(user2.address)
        })

        it("Should return the referral argument if not set but enabled", async function () {
            const referral = await tokenSaleRegistry.getRef(user1.address, user2.address)
            expect(referral).to.equal(user2.address)
        })

        it("Should return the stored referral if defined and enabled", async function () {
            await tokenSaleRegistry.initializeReferralAccounts(
                [user2.address],
                [globalPrimaryReward],
                [globalSecondaryRewards]
            )

            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                globalPrimaryReward,
                globalSecondaryRewards
            )

            await tokenSaleRegistry.connect(owner).authorizeParticipant(user1.address, true)

            const referral = await tokenSaleRegistry.getRef(user1.address, user2.address)
            expect(referral).to.equal(user2.address)
        })
    })

    describe("Negative Scenarios", function () {
        it("Should return address zero if the referral is disabled", async function () {
            const primaryRefRate = 50
            const secondaryRefRate = 70

            await tokenSaleRegistry.initializeReferralAccounts([user2.address], [primaryRefRate], [secondaryRefRate])
            await tokenSaleRegistry.disableReferral(user2.address)

            const referral = await tokenSaleRegistry.getRef(user2.address, user2.address)
            expect(referral).to.equal(addressZero)
        })
    })
})
