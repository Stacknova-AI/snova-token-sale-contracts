import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Disable Referral", function () {
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
    const primaryRefRate = 50
    const secondaryRefRate = 70

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
                tokenSaleRegistry.connect(nonAdmin).disableReferral(user3.address)
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if the referral is not defined", async function () {
            await expect(tokenSaleRegistry.disableReferral(user3.address)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrUndefinedReferralAccount"
            )
        })

        it("Should revert if the referral is already disabled", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user3.address], [primaryRefRate], [secondaryRefRate])
            await tokenSaleRegistry.disableReferral(user3.address)
            await expect(tokenSaleRegistry.disableReferral(user3.address)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrReferralNotEnabled"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should disable the referral successfully", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user3.address], [primaryRefRate], [secondaryRefRate])
            await tokenSaleRegistry.disableReferral(user3.address)
            const referral = await tokenSaleRegistry.getReferralStruct(user3.address)
            expect(referral.enabled).to.equal(false)
        })

        it("Should emit ReferralDisabled event", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user3.address], [primaryRefRate], [secondaryRefRate])
            await expect(tokenSaleRegistry.disableReferral(user3.address))
                .to.emit(tokenSaleRegistry, "ReferralDisabled")
                .withArgs(user3.address)
        })
    })
})
