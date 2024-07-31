import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Update Maximum Allocation", function () {
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
                tokenSaleRegistry.connect(nonAdmin).updateMaximumAllocation(adjustableMaximum)
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if the argument exceeds the constant MAX value", async function () {
            await expect(tokenSaleRegistry.updateMaximumAllocation(MAX + BigInt(1))).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrMax"
            )
        })

        it("Should revert if the argument is lower than the set minimum", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await tokenSaleRegistry.updateMinimumContribution(adjustableMinimum)
            await expect(
                tokenSaleRegistry.updateMaximumAllocation(adjustableMinimum - BigInt(1))
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "ErrMin")
        })
    })

    describe("Positive Scenarios", function () {
        it("Should set the maximum allocation correctly", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            const newMax = await tokenSaleRegistry.getMax()
            expect(newMax).to.equal(adjustableMaximum)
        })

        it("Should emit MaxUpdated event", async function () {
            await expect(tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum))
                .to.emit(tokenSaleRegistry, "MaxUpdated")
                .withArgs(adjustableMaximum)
        })
    })
})
