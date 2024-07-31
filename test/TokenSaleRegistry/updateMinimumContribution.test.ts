import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Update Minimum Contribution", function () {
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
    const MAX = ethers.parseEther("10000000")
    const MIN = ethers.parseEther("49")
    const adjustableMaximum = MAX - BigInt("10")
    const adjustableMinimum = MIN + BigInt("10")

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
                tokenSaleRegistry.connect(nonAdmin).updateMinimumContribution(adjustableMinimum)
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if the argument is lower than the constant MIN value", async function () {
            await expect(tokenSaleRegistry.updateMinimumContribution(MIN - BigInt(1))).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrMin"
            )
        })

        it("Should revert if the argument is higher than the set maximum", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await expect(
                tokenSaleRegistry.updateMinimumContribution(adjustableMaximum + BigInt(1))
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrMax")
        })
    })

    describe("Positive Scenarios", function () {
        it("Should set the minimum contribution correctly", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await tokenSaleRegistry.updateMinimumContribution(adjustableMinimum)
            const newMin = await tokenSaleRegistry.getMin()
            expect(newMin).to.equal(adjustableMinimum)
        })

        it("Should emit MinUpdated event", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await expect(tokenSaleRegistry.updateMinimumContribution(adjustableMinimum))
                .to.emit(tokenSaleRegistry, "MinUpdated")
                .withArgs(adjustableMinimum)
        })
    })
})
