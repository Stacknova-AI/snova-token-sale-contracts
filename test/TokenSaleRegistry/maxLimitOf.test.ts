import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory, ERC20Mock, ERC20Mock__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Max Limit Of User", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let erc20Mock: ERC20Mock
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const supply = BigInt("1000000000000000000000000")
    const MAX = ethers.parseEther("1000000")
    const MIN = ethers.parseEther("50")
    const adjustableMaximum = MAX - BigInt("10")
    const adjustableMinimum = MIN + BigInt("10")
    const limit = BigInt("1000000000000000000000")

    beforeEach(async function () {
        ;[owner, user1, user2, user3] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)
        const erc20MockFactory = new ERC20Mock__factory(owner)
        const mockSupply = 999999
        erc20Mock = await erc20MockFactory.deploy("MockToken", "MOCK", mockSupply)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
        await tokenSaleRegistry.configureSaleRound(price, supply)
        await tokenSaleRegistry.activateSale()
    })

    describe("Positive Scenarios", function () {
        it("Should return the correct maximum limit for the user", async function () {
            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await tokenSaleRegistry.updateMinimumContribution(adjustableMinimum)
            await tokenSaleRegistry.updateAuthorizationThreshold(limit)

            const maxLimitOfUser2 = await tokenSaleRegistry.maxLimitOf(user2.address)
            expect(maxLimitOfUser2).to.equal(adjustableMaximum)
        })

        it("Should return the correct remaining limit for the user after a purchase", async function () {
            const amount = BigInt("350")
            const sold = 150
            const ref = user2.address
            const primaryReward = 45
            const secondaryReward = 20

            await tokenSaleRegistry.processAndRecordSale(
                user2.address,
                erc20Mock.target,
                amount,
                sold,
                ref,
                primaryReward,
                secondaryReward
            )

            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await tokenSaleRegistry.updateMinimumContribution(adjustableMinimum)
            await tokenSaleRegistry.authorizeParticipant(user2.address, true)
            await tokenSaleRegistry.updateAuthorizationThreshold(limit)

            const maxLimitOfUser2 = await tokenSaleRegistry.maxLimitOf(user2.address)
            expect(maxLimitOfUser2).to.equal(adjustableMaximum - amount)
        })
    })

    describe("Negative Scenarios", function () {
        it("Should return zero if the user's balance exceeds the set maximum", async function () {
            const amount = MAX
            const sold = 150
            const ref = user2.address
            const primaryReward = 45
            const secondaryReward = 20

            await tokenSaleRegistry.processAndRecordSale(
                user2.address,
                erc20Mock.target,
                amount,
                sold,
                ref,
                primaryReward,
                secondaryReward
            )

            await tokenSaleRegistry.updateMaximumAllocation(adjustableMaximum)
            await tokenSaleRegistry.updateMinimumContribution(adjustableMinimum)
            await tokenSaleRegistry.authorizeParticipant(user2.address, true)
            await tokenSaleRegistry.updateAuthorizationThreshold(limit)

            const maxLimitOfUser2 = await tokenSaleRegistry.maxLimitOf(user2.address)
            expect(maxLimitOfUser2).to.equal(0)
        })
    })
})
