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

describe("PresaleSNOVA - Purchase Tokens for Somebody Functionality", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let presale: PresaleSNOVA
    let mockPriceFeed1: MockAggregatorV3Interface
    let mockPriceFeed2: MockAggregatorV3Interface
    let mockPriceFeed3: MockAggregatorV3Interface
    let erc20Mock: ERC20Mock
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress

    const NATIVE_CURRENCY_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    const price = BigInt("45000000000000000")
    const currencyPriceStatic = BigInt("100000000")
    const currencyPriceNotStatic = BigInt("339292000000")
    const tokenDecimals = 18
    const supply = BigInt("100000000000000000000000000000000000")
    const bigTokenDecimals = BigInt(10) ** BigInt(tokenDecimals)
    const totalSupply = supply * bigTokenDecimals
    const MAX = ethers.parseEther("1000000")
    const MIN = ethers.parseEther("50")

    const updatedAtMockTimestamp = 1711647002
    const mockPrice = 339292000000
    const decimals = 8
    const priceThreshold = updatedAtMockTimestamp + 1

    beforeEach(async function () {
        ;[owner, user1, user2, user3] = await ethers.getSigners()

        // Deploy TokenSaleRegistry
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        // Deploy Mock Price Feeds
        const mockPriceFeedFactory = new MockAggregatorV3Interface__factory(owner)
        mockPriceFeed1 = await mockPriceFeedFactory.deploy(decimals, mockPrice, updatedAtMockTimestamp)
        mockPriceFeed2 = await mockPriceFeedFactory.deploy(decimals, mockPrice, updatedAtMockTimestamp)
        mockPriceFeed3 = await mockPriceFeedFactory.deploy(decimals, mockPrice, updatedAtMockTimestamp)

        // Deploy PresaleSNOVA
        const presaleFactory = new PresaleSNOVA__factory(owner)
        presale = await presaleFactory.deploy(tokenSaleRegistry, priceThreshold)

        // Deploy ERC20 Mock
        const erc20MockFactory = new ERC20Mock__factory(owner)
        const mockSupply = ethers.parseEther("999")
        erc20Mock = await erc20MockFactory.deploy("MockToken", "MOCK", mockSupply)

        // Add Currencies to Presale
        await presale.addCurrency(erc20Mock.target, mockPriceFeed1.target, 6, true)
        await presale.addCurrency(NATIVE_CURRENCY_ADDRESS, mockPriceFeed3.target, 18, false)
    })

    describe("Negative Scenarios", function () {
        it("Should revert if currency is not whitelisted", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await tokenSaleRegistry.configureSaleRound(price, totalSupply.toString())
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.updateMaximumAllocation(MAX - BigInt("1"))
            await tokenSaleRegistry.updateMinimumContribution(MIN + BigInt("10"))
            await tokenSaleRegistry.updateAuthorizationThreshold(MAX - BigInt("100"))
            const amountInWei = ethers.parseUnits("100", 6)
            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await erc20Mock.transfer(user2.address, amountInWei)
            await erc20Mock.connect(user2).approve(presale.target, amountInWei)

            await presale.grantRole(ethers.id("PURCHASE_AGENT_ROLE"), user2)

            await expect(
                presale
                    .connect(user2)
                    .purchaseTokensFor(
                        user1.address,
                        user3.address,
                        "0x9E8Ea82e76262E957D4cC24e04857A34B0D8f062",
                        amountInWei,
                    ),
            ).to.be.revertedWithCustomError(presale, "ErrCurrencyNotWhitelisted")
        })

        it("Should revert if msg.value is not zero while token purchase is being proceeded", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await tokenSaleRegistry.configureSaleRound(price, totalSupply.toString())
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.updateMaximumAllocation(MAX - BigInt("1"))
            await tokenSaleRegistry.updateMinimumContribution(MIN + BigInt("10"))
            await tokenSaleRegistry.updateAuthorizationThreshold(MAX - BigInt("100"))
            const amountInWei = ethers.parseUnits("100", 6)
            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await erc20Mock.transfer(user2.address, amountInWei)
            await erc20Mock.connect(user2).approve(presale.target, amountInWei)

            await presale.grantRole(ethers.id("PURCHASE_AGENT_ROLE"), user2)

            await expect(
                presale
                    .connect(user2)
                    .purchaseTokensFor(user1.address, user3.address, NATIVE_CURRENCY_ADDRESS, amountInWei, {
                        value: amountInWei,
                    }),
            ).to.be.revertedWithCustomError(presale, "ErrAmountValidation")
        })

        it("Should revert if amount_ is not zero while native currency purchase is being proceeded", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await tokenSaleRegistry.configureSaleRound(price, totalSupply.toString())
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.updateMaximumAllocation(MAX - BigInt("1"))
            await tokenSaleRegistry.updateMinimumContribution(MIN + BigInt("10"))
            await tokenSaleRegistry.updateAuthorizationThreshold(MAX - BigInt("100"))
            const amountInWei = ethers.parseUnits("100", 6)
            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await erc20Mock.transfer(user2.address, amountInWei)
            await erc20Mock.connect(user2).approve(presale.target, amountInWei)

            await presale.grantRole(ethers.id("PURCHASE_AGENT_ROLE"), user2)

            await expect(
                presale
                    .connect(user2)
                    .purchaseTokensFor(user1.address, user3.address, NATIVE_CURRENCY_ADDRESS, amountInWei, {
                        value: amountInWei,
                    }),
            ).to.be.revertedWithCustomError(presale, "ErrAmountValidation")
        })

        it("Should revert if not PURCHASE_AGENT calling purchaseTokensFor()", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await tokenSaleRegistry.configureSaleRound(price, totalSupply.toString())
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.updateMaximumAllocation(MAX - BigInt("1"))
            await tokenSaleRegistry.updateMinimumContribution(MIN + BigInt("10"))
            await tokenSaleRegistry.updateAuthorizationThreshold(MAX - BigInt("100"))
            const amountInEther = "1"
            const amountInWei = ethers.parseEther(amountInEther)
            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)
            await presale.grantRole(ethers.id("PURCHASE_AGENT_ROLE"), user2)
            await expect(
                presale.connect(user3).purchaseTokensFor(user1.address, user2.address, erc20Mock.target, amountInWei, {
                    value: amountInWei,
                }),
            ).to.be.revertedWithCustomError(presale, "AccessControlUnauthorizedAccount")
        })

        it("Should successfully allow ONRAMP perform purchaseTokensFor() with native coin", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await tokenSaleRegistry.configureSaleRound(price, totalSupply.toString())
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.updateMaximumAllocation(MAX - BigInt("1"))
            await tokenSaleRegistry.updateMinimumContribution(MIN + BigInt("10"))
            await tokenSaleRegistry.updateAuthorizationThreshold(MAX - BigInt("100"))
            const amountInEther = "100"
            const amountInWei = ethers.parseEther(amountInEther)
            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await presale.grantRole(ethers.id("PURCHASE_AGENT_ROLE"), user2)

            await expect(
                presale.connect(user2).purchaseTokensFor(user1.address, user3.address, erc20Mock.target, amountInWei, {
                    value: amountInWei,
                }),
            ).to.be.revertedWithCustomError(presale, "ErrValueValidation")
        })
    })

    describe("Positive Scenarios", function () {
        const configureAndStartSaleRound = async () => {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await tokenSaleRegistry.configureSaleRound(price, totalSupply.toString())
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.updateMaximumAllocation(MAX - BigInt("1"))
            await tokenSaleRegistry.updateMinimumContribution(MIN + BigInt("10"))
            await tokenSaleRegistry.updateAuthorizationThreshold(MAX - BigInt("100"))
        }

        const transferAndApproveTokens = async (amount: string, user: SignerWithAddress, token: ERC20Mock) => {
            const amountInWei = ethers.parseUnits(amount, 6)
            await token.transfer(user.address, amountInWei)
            await token.connect(user).approve(presale.target, amountInWei)
            return amountInWei
        }

        it("Should successfully allow ONRAMP perform purchaseTokensFor() with tokens", async function () {
            await configureAndStartSaleRound()
            const amountInWei = await transferAndApproveTokens("100", user2, erc20Mock)

            const amountOfSNOVAsold = BigInt("2222222222222222222222")
            const currentRound = 1
            const investmentInUSD = BigInt("100000000000000000000")
            const novaPointsAwarded = BigInt("600")

            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)
            await presale.grantRole(ethers.id("PURCHASE_AGENT_ROLE"), user2)

            await expect(
                presale.connect(user2).purchaseTokensFor(user1.address, user3.address, erc20Mock.target, amountInWei),
            )
                .to.emit(presale, "TokensPurchased")
                .withArgs(
                    user1,
                    user3,
                    amountInWei,
                    price,
                    amountOfSNOVAsold,
                    currentRound,
                    investmentInUSD,
                    currencyPriceStatic,
                    novaPointsAwarded,
                )
        })

        it("Should successfully allow ONRAMP perform purchaseTokensFor() with native coin", async function () {
            await configureAndStartSaleRound()

            const amountOfSNOVAsold = BigInt("7539822222222222222222222")
            const currentRound = 1
            const amountInEther = "100"
            const amountInWei = ethers.parseEther(amountInEther)
            const investmentInUSD = BigInt("339292000000000000000000")
            const novaPointsAwarded = BigInt("6785840")

            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)
            await presale.grantRole(ethers.id("PURCHASE_AGENT_ROLE"), user2)

            await expect(
                presale.connect(user2).purchaseTokensFor(user1.address, user3.address, NATIVE_CURRENCY_ADDRESS, 0, {
                    value: amountInWei,
                }),
            )
                .to.emit(presale, "TokensPurchased")
                .withArgs(
                    user1,
                    user3,
                    amountInWei,
                    price,
                    amountOfSNOVAsold,
                    currentRound,
                    investmentInUSD,
                    currencyPriceNotStatic,
                    novaPointsAwarded,
                )
        })
    })
})
