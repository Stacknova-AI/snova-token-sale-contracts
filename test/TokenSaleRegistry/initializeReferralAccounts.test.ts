import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Initialize Referral Accounts", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const primaryRefRate = 165
    const secondaryRefRate = 70

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
                tokenSaleRegistry
                    .connect(nonAdmin)
                    .initializeReferralAccounts([owner.address], [primaryRefRate], [secondaryRefRate])
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if sales are deactivated", async function () {
            await tokenSaleRegistry.deactivateSale()
            await expect(
                tokenSaleRegistry.initializeReferralAccounts([owner.address], [primaryRefRate], [secondaryRefRate])
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrSaleNotActive")
        })

        it("Should revert if referral addresses length does not match primary referral rates length", async function () {
            await expect(
                tokenSaleRegistry.initializeReferralAccounts(
                    [owner.address, owner.address],
                    [primaryRefRate],
                    [secondaryRefRate, secondaryRefRate]
                )
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrInvalidParameters")
        })

        it("Should revert if referral addresses length does not match secondary referral rates length", async function () {
            await expect(
                tokenSaleRegistry.initializeReferralAccounts(
                    [owner.address, owner.address],
                    [primaryRefRate, primaryRefRate],
                    [secondaryRefRate]
                )
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrInvalidParameters")
        })

        it("Should revert if primary referral rates length does not match the argument", async function () {
            await expect(
                tokenSaleRegistry.initializeReferralAccounts(
                    [owner.address],
                    [primaryRefRate, primaryRefRate],
                    [secondaryRefRate]
                )
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrInvalidParameters")
        })

        it("Should revert if secondary referral rates length does not match the argument", async function () {
            await expect(
                tokenSaleRegistry.initializeReferralAccounts(
                    [owner.address],
                    [primaryRefRate],
                    [secondaryRefRate, secondaryRefRate]
                )
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrInvalidParameters")
        })
    })

    describe("Positive Scenarios", function () {
        it("Should correctly set and get primary referral commission rate", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([owner.address], [primaryRefRate], [secondaryRefRate])
            const commissionReferralRates = await tokenSaleRegistry.getRefRates(owner.address)
            expect(commissionReferralRates[0]).to.equal(primaryRefRate)
        })

        it("Should correctly set and get secondary referral commission rate", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([owner.address], [primaryRefRate], [secondaryRefRate])
            const commissionReferralRates = await tokenSaleRegistry.getRefRates(owner.address)
            expect(commissionReferralRates[1]).to.equal(secondaryRefRate)
        })

        it("Should emit ReferralAccountInitialized event upon setting referral accounts", async function () {
            await expect(
                tokenSaleRegistry.initializeReferralAccounts([owner.address], [primaryRefRate], [secondaryRefRate])
            )
                .to.emit(tokenSaleRegistry, "ReferralAccountInitialized")
                .withArgs(owner.address, primaryRefRate, secondaryRefRate)
        })
    })
})
