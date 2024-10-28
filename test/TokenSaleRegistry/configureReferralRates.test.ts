import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Configure Referral Rates", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const primaryRefRate = 50
    const secondaryRefRate = 20

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
                tokenSaleRegistry.connect(nonAdmin).configureReferralRates(primaryRefRate, secondaryRefRate),
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if sales are deactivated", async function () {
            await tokenSaleRegistry.deactivateSale()
            await expect(
                tokenSaleRegistry.configureReferralRates(primaryRefRate, secondaryRefRate),
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrSaleNotActive")
        })

        it("Should revert if the sum of primary and secondary rates is more than 100%", async function () {
            const excessivePrimaryRefRate = 500
            const excessiveSecondaryRefRate = 501
            await expect(
                tokenSaleRegistry.configureReferralRates(excessivePrimaryRefRate, excessiveSecondaryRefRate),
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrReferralRatesExceedLimit")
        })
    })

    describe("Positive Scenarios", function () {
        it("Should correctly set the primary referral commission rate", async function () {
            await tokenSaleRegistry.configureReferralRates(primaryRefRate, secondaryRefRate)
            const commissionReferralRates = await tokenSaleRegistry.getGlobalRefRates()
            expect(commissionReferralRates[0]).to.equal(primaryRefRate)
        })

        it("Should correctly set the secondary referral commission rate", async function () {
            await tokenSaleRegistry.configureReferralRates(primaryRefRate, secondaryRefRate)
            const commissionReferralRates = await tokenSaleRegistry.getGlobalRefRates()
            expect(commissionReferralRates[1]).to.equal(secondaryRefRate)
        })

        it("Should emit ReferralRatesConfigured event", async function () {
            await expect(tokenSaleRegistry.configureReferralRates(primaryRefRate, secondaryRefRate))
                .to.emit(tokenSaleRegistry, "ReferralRatesConfigured")
                .withArgs(primaryRefRate, secondaryRefRate)
        })
    })
})
