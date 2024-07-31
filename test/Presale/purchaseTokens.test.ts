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

describe("PresaleSNOVA - Purchase Tokens Functionality", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let presale: PresaleSNOVA
    let mockPriceFeed1: MockAggregatorV3Interface
    let mockPriceFeed2: MockAggregatorV3Interface
    let mockPriceFeed3: MockAggregatorV3Interface
    let erc20MockStable: ERC20Mock
    let erc20MockNotStable: ERC20Mock
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress

    const NATIVE_CURRENCY_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    const price = BigInt("45000000000000000")
    const currencyPriceStatic = BigInt("100000000")
    const currencyPriceNotStatic = BigInt("339292000000")
    const tokenDecimals = 18
    const supply = 100000000
    const updatedAtMockTimestamp = 1711647002
    const mockPrice = 339292000000
    const decimals = 8
    const priceThreshold = updatedAtMockTimestamp + 1
    const MAX = ethers.parseEther("1000000")
    const MIN = ethers.parseEther("50")
    const amountInEther = "0.1"
    const amountInWei = ethers.parseEther(amountInEther)

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

        // Deploy ERC20 Mocks
        const erc20MockFactory = new ERC20Mock__factory(owner)
        const mockSupply = ethers.parseEther("999")
        erc20MockStable = await erc20MockFactory.deploy("MockToken", "MOCK", mockSupply)
        erc20MockNotStable = await erc20MockFactory.deploy("MockToken", "MOCK", mockSupply)

        // Add Currencies to Presale
        await presale.addCurrency(erc20MockStable.target, mockPriceFeed1.target, 18, true)
        await presale.addCurrency(erc20MockNotStable.target, mockPriceFeed2.target, 18, false)
        await presale.addCurrency(NATIVE_CURRENCY_ADDRESS, mockPriceFeed3.target, 18, false)
    })

    const configureAndStartSaleRound = async () => {
        await tokenSaleRegistry.configureSaleRound(price, supply)
        await tokenSaleRegistry.activateSale()

        const bigSupply = BigInt(100000000000000000000000000000000000)
        const bigTokenDecimals = BigInt(10) ** BigInt(tokenDecimals)
        const totalSupply = bigSupply * bigTokenDecimals

        await tokenSaleRegistry.configureSaleRound(price, totalSupply.toString())
        await tokenSaleRegistry.startSaleRound(1)
        await tokenSaleRegistry.updateMaximumAllocation(MAX)
        await tokenSaleRegistry.updateMinimumContribution(MIN)
        await tokenSaleRegistry.updateAuthorizationThreshold(MAX - BigInt("100"))
    }

    const transferAndApproveTokens = async (amount: string, user: SignerWithAddress, token: ERC20Mock) => {
        const amountInWei = ethers.parseEther(amount)
        await token.transfer(user.address, amountInWei)
        await token.connect(user).approve(presale.target, amountInWei)
        return amountInWei
    }

    describe("Negative Scenarios", function () {
        it("Should revert if caller is referral", async function () {
            await expect(
                presale.connect(user3).purchaseTokens(user3.address, erc20MockStable.target, amountInWei)
            ).to.be.revertedWithCustomError(presale, "ErrReferral")
        })

        it("Should revert if amount is zero", async function () {
            await expect(
                presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, 0)
            ).to.be.revertedWithCustomError(presale, "ErrAmountZero")
        })

        it("Should revert if tokenSaleRegistry contract is in not active state", async function () {
            await expect(
                presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, amountInWei)
            ).to.be.revertedWithCustomError(presale, "ErrSaleNotActive")
        })

        it("Should revert if round is in closed state", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await expect(
                presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, amountInWei)
            ).to.be.revertedWithCustomError(presale, "ErrRoundClosed")
        })

        it("Should revert if data from priceFeed is not acceptable by price threshold", async function () {
            await configureAndStartSaleRound()
            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)
            await mockPriceFeed1.setLatestRoundData(mockPrice - 260, updatedAtMockTimestamp + 5)
            await presale.setPriceThreshold(1)

            await expect(
                presale.connect(user2).purchaseTokens(user3.address, erc20MockNotStable.target, amountInWei)
            ).to.be.revertedWithCustomError(presale, "ErrPriceThreshold")
        })

        it("Should revert if funds are below limit per user", async function () {
            await configureAndStartSaleRound()
            await tokenSaleRegistry.updateMinimumContribution(MIN + BigInt("10"))
            await expect(
                presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, amountInWei)
            ).to.be.revertedWithCustomError(presale, "ErrMin")
        })

        it("Should revert if funds are above limit per user", async function () {
            await configureAndStartSaleRound()
            const amountInEther = "400"
            const amountInWei = ethers.parseEther(amountInEther)
            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await expect(
                presale.connect(user2).purchaseTokens(user3.address, NATIVE_CURRENCY_ADDRESS, 0, {
                    value: amountInWei,
                })
            ).to.be.revertedWithCustomError(presale, "ErrMax")
        })

        it("Should revert if currency is not whitelisted", async function () {
            await configureAndStartSaleRound()
            const amountInEther = "400"
            const amountInWei = ethers.parseEther(amountInEther)
            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await expect(
                presale.connect(user2).purchaseTokens(user3.address, "0x9E8Ea82e76262E957D4cC24e04857A34B0D8f062", 0, {
                    value: amountInWei,
                })
            ).to.be.revertedWithCustomError(presale, "ErrCurrencyNotWhitelisted")
        })

        it("Should revert if msg.value is not zero while token purchase is being proceeded", async function () {
            await configureAndStartSaleRound()
            const amountInWei = await transferAndApproveTokens("400", user2, erc20MockStable)

            await expect(
                presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, amountInWei, {
                    value: amountInWei,
                })
            ).to.be.revertedWithCustomError(presale, "ErrValueValidation")
        })

        it("Should revert if amount_ is not zero while native currency purchase is being proceeded", async function () {
            await configureAndStartSaleRound()
            const amountInEther = "400"
            const amountInWei = ethers.parseEther(amountInEther)
            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await expect(
                presale.connect(user2).purchaseTokens(user3.address, NATIVE_CURRENCY_ADDRESS, amountInWei, {
                    value: amountInWei,
                })
            ).to.be.revertedWithCustomError(presale, "ErrAmountValidation")
        })

        it("Should revert if sold amount is about to go above round allocation", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.activateSale()
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.startSaleRound(1)
            const amountInEther = "1"
            const amountInWei = ethers.parseEther(amountInEther)
            let mockAddressOfToken = "0xF1838e675089e4DCA7A76BC70B1A39184A02beC4"
            let amount = 100
            let sold = 150
            let ref = user2
            let primaryReward = 40
            let secondaryReward = 20
            sold = 25
            await tokenSaleRegistry.processAndRecordSale(
                user1,
                mockAddressOfToken,
                amount,
                sold,
                ref,
                primaryReward,
                secondaryReward
            )
            await expect(
                presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, amountInWei)
            ).to.be.revertedWithCustomError(presale, "ErrRoundAllocation")
        })
    })

    describe("Positive Scenarios", function () {
        it("Should emit TokensPurchased event after successful purchase with tokens", async function () {
            await configureAndStartSaleRound()
            const amountInWei = await transferAndApproveTokens("100", user2, erc20MockStable)

            const amountOfSNOVAsold = BigInt("2222222222222222222222")
            const currentRound = 1
            const investmentInUSD = BigInt("100000000000000000000")
            const novaPointsAwarded = BigInt("600")

            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await expect(presale.connect(user2).purchaseTokens(ethers.ZeroAddress, erc20MockStable.target, amountInWei))
                .to.emit(presale, "TokensPurchased")
                .withArgs(
                    user2,
                    ethers.ZeroAddress,
                    amountInWei,
                    price,
                    amountOfSNOVAsold,
                    currentRound,
                    investmentInUSD,
                    currencyPriceStatic,
                    novaPointsAwarded
                )
        })

        it("Should emit TokensPurchased event after successful purchase with native coin", async function () {
            await configureAndStartSaleRound()

            const amountOfSNOVAsold = BigInt("7539822222222222222222222")
            const currentRound = 1

            const amountInEther = "100"
            const amountInWei = ethers.parseEther(amountInEther)
            const investmentInUSD = BigInt("339292000000000000000000")
            const novaPointsAwarded = BigInt("6785840")

            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await expect(
                presale.connect(user2).purchaseTokens(ethers.ZeroAddress, NATIVE_CURRENCY_ADDRESS, 0, {
                    value: amountInWei,
                })
            )
                .to.emit(presale, "TokensPurchased")
                .withArgs(
                    user2,
                    ethers.ZeroAddress,
                    amountInWei,
                    price,
                    amountOfSNOVAsold,
                    currentRound,
                    investmentInUSD,
                    currencyPriceNotStatic,
                    novaPointsAwarded
                )
        })

        it("Should emit NovaPointsAwarded event after successful purchase with tokens", async function () {
            await configureAndStartSaleRound()
            const amountInWei = await transferAndApproveTokens("100", user2, erc20MockStable)

            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await expect(presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, amountInWei))
                .to.emit(presale, "NovaPointsAwarded")
                .withArgs(user2, 600)
        })

        it("Should emit NovaPointsAwarded event after successful purchase with tokens for referrer", async function () {
            await configureAndStartSaleRound()
            const amountInWei = await transferAndApproveTokens("100", user2, erc20MockStable)

            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await expect(presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, amountInWei))
                .to.emit(presale, "NovaPointsAwarded")
                .withArgs(user3, 120)
        })

        it("Should emit ReferralRegistered event after successful purchase with tokens for referrer", async function () {
            await configureAndStartSaleRound()
            const amountInWei = await transferAndApproveTokens("100", user2, erc20MockStable)

            await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

            await expect(presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, amountInWei))
                .to.emit(presale, "ReferralRegistered")
                .withArgs(user3.address)
        })
    })
})
