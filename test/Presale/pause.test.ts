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

describe("PresaleSNOVA - Pause and Unpause Functionality", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let presale: PresaleSNOVA
    let mockPriceFeed: MockAggregatorV3Interface
    let erc20Mock: ERC20Mock
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress

    const price = ethers.parseEther("0.045")
    const soldSnova = ethers.parseEther("1111.111111111111111111")
    const investmentInUSD = ethers.parseEther("50")
    const currencyPriceStatic = BigInt("100000000")
    const supply = ethers.parseEther("100000000000000000000000000000000000")
    const novaPointsAwarded = 300
    const MAX = ethers.parseEther("1000000")
    const MIN = ethers.parseEther("50")
    const updatedAdMockTimestamp = 1711647002
    const mockPrice = 339292000000
    const decimals = 8
    const priceThreshold = updatedAdMockTimestamp + 1

    beforeEach(async function () {
        ;[owner, user1, user2, user3] = await ethers.getSigners()

        // Deploy TokenSaleRegistry
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        // Deploy Mock Price Feed
        const mockPriceFeedFactory = new MockAggregatorV3Interface__factory(owner)
        mockPriceFeed = await mockPriceFeedFactory.deploy(decimals, mockPrice, updatedAdMockTimestamp)

        // Deploy PresaleSNOVA
        const presaleFactory = new PresaleSNOVA__factory(owner)
        presale = await presaleFactory.deploy(tokenSaleRegistry.target, priceThreshold)

        // Deploy ERC20 Mock Token
        const erc20MockFactory = new ERC20Mock__factory(owner)
        erc20Mock = await erc20MockFactory.deploy("MockToken", "MOCK", ethers.parseEther("999"))

        // Add Currency to Presale
        await presale.addCurrency(erc20Mock.target, mockPriceFeed.target, 18, true)
    })

    describe("Negative Scenarios", function () {
        it("Should revert if non-admin tries to pause the buying", async function () {
            await expect(presale.connect(user3).pause()).to.be.revertedWithCustomError(
                presale,
                "AccessControlUnauthorizedAccount"
            )
        })

        it("Should revert if non-admin tries to unpause the buying", async function () {
            await presale.pause()
            await expect(presale.connect(user3).unpause()).to.be.revertedWithCustomError(
                presale,
                "AccessControlUnauthorizedAccount"
            )
        })

        it("Should revert buying if presale is paused", async function () {
            await presale.pause()
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.updateMaximumAllocation(MAX)
            await tokenSaleRegistry.updateMinimumContribution(MIN)
            await tokenSaleRegistry.updateAuthorizationThreshold(MAX - BigInt("100"))
            const amountInEther = "51"
            const amountInWei = ethers.parseEther(amountInEther)

            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale.target)

            await expect(
                presale.connect(user2).purchaseTokens(user3.address, erc20Mock.target, amountInWei)
            ).to.be.revertedWithCustomError(presale, "EnforcedPause")
        })
    })

    describe("Positive Scenarios", function () {
        it("Should allow buying again if unpaused", async function () {
            await presale.pause()
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.updateMaximumAllocation(MAX)
            await tokenSaleRegistry.updateMinimumContribution(MIN)
            await tokenSaleRegistry.updateAuthorizationThreshold(MAX - BigInt("100"))
            const amountInEther = "50"
            const amountInWei = ethers.parseEther(amountInEther)
            const currentRound = 1

            await presale.unpause()

            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale.target)

            await erc20Mock.transfer(user2.address, amountInWei)
            await erc20Mock.connect(user2).approve(presale.target, amountInWei)

            await expect(presale.connect(user2).purchaseTokens(user3.address, erc20Mock.target, amountInWei))
                .to.emit(presale, "TokensPurchased")
                .withArgs(
                    user2.address,
                    user3.address,
                    amountInWei,
                    price,
                    soldSnova,
                    currentRound,
                    investmentInUSD,
                    currencyPriceStatic,
                    novaPointsAwarded
                )
        })
    })
})
