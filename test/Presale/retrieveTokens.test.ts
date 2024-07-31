import { ethers } from "hardhat"
import { expect } from "chai"
import {
    TokenSaleRegistry,
    TokenSaleRegistry__factory,
    ERC20Mock,
    ERC20Mock__factory,
    MockAggregatorV3Interface,
    MockAggregatorV3Interface__factory,
    PresaleSNOVA,
    PresaleSNOVA__factory,
} from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("PresaleSNOVA - Retrieve Tokens Functionality", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let presale: PresaleSNOVA
    let mockPriceFeed: MockAggregatorV3Interface
    let erc20Mock: ERC20Mock
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let amountOfERC20: number

    const updatedAtMockTimestamp = 1711647002
    const mockPrice = 339292000000
    const decimals = 8
    const priceThreshold = updatedAtMockTimestamp + 1

    beforeEach(async function () {
        ;[owner, user1, user2, user3] = await ethers.getSigners()

        // Deploy TokenSaleRegistry
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        // Deploy Mock Price Feed
        const mockPriceFeedFactory = new MockAggregatorV3Interface__factory(owner)
        mockPriceFeed = await mockPriceFeedFactory.deploy(decimals, mockPrice, updatedAtMockTimestamp)

        // Deploy PresaleSNOVA
        const presaleFactory = new PresaleSNOVA__factory(owner)
        presale = await presaleFactory.deploy(tokenSaleRegistry, priceThreshold)

        // Deploy ERC20 Mock Token
        const erc20MockFactory = new ERC20Mock__factory(owner)
        const mockSupply = ethers.parseUnits("999999", 18)
        erc20Mock = await erc20MockFactory.deploy("MockToken", "MOCK", mockSupply)

        amountOfERC20 = 100
    })

    describe("Negative Scenarios", function () {
        it("Should revert if caller is not DEFAULT_ADMIN", async function () {
            await expect(
                presale.connect(user2).retrieveTokens(erc20Mock.target, amountOfERC20)
            ).to.be.revertedWithCustomError(presale, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if amount is bigger than actual contract balance", async function () {
            await expect(presale.retrieveTokens(erc20Mock.target, amountOfERC20)).to.be.revertedWithCustomError(
                erc20Mock,
                "ERC20InsufficientBalance"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should successfully transfer token requested amount from presale to the DEFAULT_ADMIN wallet", async function () {
            const withdrawAmount = BigInt(amountOfERC20)

            await erc20Mock.transfer(presale.target, 1000)
            const balanceOfOwnerBefore = await erc20Mock.balanceOf(owner.address)
            await presale.retrieveTokens(erc20Mock.target, withdrawAmount)
            const balanceOfOwnerAfter = await erc20Mock.balanceOf(owner.address)
            expect(balanceOfOwnerAfter).to.equal(
                balanceOfOwnerBefore + withdrawAmount,
                "The owner's balance after the operation does not match the expected balance."
            )
        })

        it("Should emit TokensRetrieved event", async function () {
            const amount = 100
            const withdrawAmount = BigInt(amount)

            await erc20Mock.transfer(presale.target, 1000)

            await expect(presale.retrieveTokens(erc20Mock.target, withdrawAmount))
                .to.emit(presale, "TokensRetrieved")
                .withArgs(erc20Mock.target, withdrawAmount)
        })
    })
})
