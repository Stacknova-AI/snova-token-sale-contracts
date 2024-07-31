import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Referral Rates", function () {
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

    const mockAddressOfToken = "0xF1838e675089e4DCA7A76BC70B1A39184A02beC4"
    const amount = 100
    const sold = 150

    async function initializeAndRecordSale(ref: SignerWithAddress, primaryReward: number, secondaryReward: number) {
        await tokenSaleRegistry.initializeReferralAccounts([ref.address], [primaryReward], [secondaryReward])

        await tokenSaleRegistry.processAndRecordSale(
            user1.address,
            mockAddressOfToken,
            amount,
            sold,
            ref.address,
            primaryReward,
            secondaryReward
        )
    }

    describe("Positive Scenarios", function () {
        it("Should get global referral rates when lower rates are set", async function () {
            await initializeAndRecordSale(user2, 40, 20)
            const referralRates = await tokenSaleRegistry.getRefRates(user2.address)

            expect(referralRates[0]).to.equal(globalPrimaryReward)
            expect(referralRates[1]).to.equal(globalSecondaryRewards)
        })

        it("Should get specifically set referral rates when higher than global rates", async function () {
            await initializeAndRecordSale(user2, 165, 20)
            const referralRates = await tokenSaleRegistry.getRefRates(user2.address)

            expect(referralRates[0]).to.equal(165)
            expect(referralRates[1]).to.equal(globalSecondaryRewards)
        })

        it("Should get mixed global and specific referral rates", async function () {
            await initializeAndRecordSale(user2, 30, 75)
            const referralRates = await tokenSaleRegistry.getRefRates(user2.address)

            expect(referralRates[0]).to.equal(globalPrimaryReward)
            expect(referralRates[1]).to.equal(75)
        })

        it("Should get specifically set high referral rates", async function () {
            await initializeAndRecordSale(user2, 185, 75)
            const referralRates = await tokenSaleRegistry.getRefRates(user2.address)

            expect(referralRates[0]).to.equal(185)
            expect(referralRates[1]).to.equal(75)
        })

        it("Should return global referral rates if referral is not defined", async function () {
            const referralRates = await tokenSaleRegistry.getRefRates(user2.address)

            expect(referralRates[0]).to.equal(globalPrimaryReward)
            expect(referralRates[1]).to.equal(globalSecondaryRewards)
        })
    })

    describe("Referral Management", function () {
        it("Should return referral address if referral is set", async function () {
            const ref = await tokenSaleRegistry.getRef(user1.address, user2.address)
            expect(ref).to.equal(user2.address)
        })

        it("Should return address zero if referral is disabled", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user2.address], [50], [70])
            await tokenSaleRegistry.disableReferral(user2.address)
            const ref = await tokenSaleRegistry.getRef(user2.address, user2.address)

            expect(ref).to.equal(addressZero)
        })
    })
})
