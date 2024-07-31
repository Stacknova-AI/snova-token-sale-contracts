import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Process and Record Sale", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const nextRoundPrice = BigInt("18400000000000000")
    const supply = 100000000
    const mockAddressOfToken = "0xF1838e675089e4DCA7A76BC70B1A39184A02beC4"
    const zeroAddress = "0x0000000000000000000000000000000000000000"

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
        const amount = 100
        const sold = 150
        const primaryReward = 40
        const secondaryReward = 20

        it("Should revert if called by a non-admin", async function () {
            await expect(
                tokenSaleRegistry
                    .connect(nonAdmin)
                    .processAndRecordSale(
                        user1.address,
                        mockAddressOfToken,
                        amount,
                        sold,
                        user2.address,
                        primaryReward,
                        secondaryReward
                    )
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should not revert if there is no referral (address(0))", async function () {
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                zeroAddress,
                primaryReward,
                secondaryReward
            )
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                25,
                zeroAddress,
                primaryReward,
                secondaryReward
            )
            const totalSold = await tokenSaleRegistry.getTotalSold()
            expect(totalSold).to.equal(175)
        })
    })

    describe("Positive Scenarios", function () {
        const amount = 100
        const sold = 150
        const primaryReward = 40
        const secondaryReward = 20

        it("Should update the user's funds balance after a sale", async function () {
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward
            )
            const fundsOfUser = await tokenSaleRegistry.getFundsOfUser(user1.address)
            expect(fundsOfUser).to.equal(amount)
        })

        it("Should increment the total sold value", async function () {
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward
            )
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                25,
                user2.address,
                primaryReward,
                secondaryReward
            )
            const totalSold = await tokenSaleRegistry.getTotalSold()
            expect(totalSold).to.equal(175)
        })

        it("Should increment the current round's sold value", async function () {
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward
            )
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                25,
                user2.address,
                primaryReward,
                secondaryReward
            )
            const currentRound = await tokenSaleRegistry.getCurrentRound()
            const roundData = await tokenSaleRegistry.getRound(currentRound)
            expect(roundData.sold).to.equal(175)
        })

        it("Should update the user's balance in the current round", async function () {
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward
            )
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                25,
                user2.address,
                primaryReward,
                secondaryReward
            )
            const currentRound = await tokenSaleRegistry.getCurrentRound()
            const balanceOfUserInCurrentRound = await tokenSaleRegistry.balanceOf(user1.address, currentRound)
            expect(balanceOfUserInCurrentRound).to.equal(175)

            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, 1700000)
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                330,
                user2.address,
                primaryReward,
                secondaryReward
            )
            const newCurrentRound = await tokenSaleRegistry.getCurrentRound()
            const newBalanceOfUserInCurrentRound = await tokenSaleRegistry.balanceOf(user1.address, newCurrentRound)
            expect(newBalanceOfUserInCurrentRound).to.equal(330)
        })

        it("Should set the referral correctly", async function () {
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward
            )
            const referral = await tokenSaleRegistry.getRef(user1.address, user2.address)
            expect(referral).to.equal(user2.address)
        })

        it("Should update the referral balance", async function () {
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward
            )
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                25,
                user2.address,
                primaryReward,
                secondaryReward
            )
            const referralBalance = await tokenSaleRegistry.refBalanceOf(user2.address, mockAddressOfToken)
            expect(referralBalance).to.equal(2 * primaryReward)
        })

        it("Should update the referral token balance with different rewards", async function () {
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward
            )
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                25,
                user2.address,
                35,
                12
            )
            const referralBalance = await tokenSaleRegistry.refBalanceOf(user2.address, mockAddressOfToken)
            expect(referralBalance).to.equal(75)
        })

        it("Should update the referral TOKEN balance correctly", async function () {
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward
            )
            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                25,
                user2.address,
                35,
                12
            )
            const referralBalance = await tokenSaleRegistry.refBalanceOf(
                user2.address,
                "0x0000000000000000000000000000000000000001"
            )
            expect(referralBalance).to.equal(32)
        })

        it("Should emit ReferralAccountInitialized event", async function () {
            const globalRefRates = await tokenSaleRegistry.getGlobalRefRates()
            await expect(
                tokenSaleRegistry.processAndRecordSale(
                    user1.address,
                    mockAddressOfToken,
                    amount,
                    sold,
                    user2.address,
                    primaryReward,
                    secondaryReward
                )
            )
                .to.emit(tokenSaleRegistry, "ReferralAccountInitialized")
                .withArgs(user2.address, globalRefRates[0], globalRefRates[1])
        })
    })
})
