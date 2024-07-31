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

describe("PresaleSNOVA Contract - Nova Points Awarding Functionality", function () {
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
    const MAX = ethers.parseEther("1000000")
    const MIN = ethers.parseEther("50")
    const supply = 100000000
    const tokenDecimals = 18

    let updatedAtMockTimestamp: number
    let mockPrice: number
    let decimals: number
    let priceThreshold: number

    beforeEach(async function () {
        ;[owner, user1, user2, user3] = await ethers.getSigners()

        // Deploy TokenSaleRegistry
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        // Deploy Mock Price Feeds
        const mockPriceFeedFactory = new MockAggregatorV3Interface__factory(owner)
        updatedAtMockTimestamp = 1711647002
        mockPrice = 339292000000
        decimals = 8
        mockPriceFeed1 = await mockPriceFeedFactory.deploy(decimals, mockPrice, updatedAtMockTimestamp)
        mockPriceFeed2 = await mockPriceFeedFactory.deploy(decimals, mockPrice, updatedAtMockTimestamp)
        mockPriceFeed3 = await mockPriceFeedFactory.deploy(decimals, mockPrice, updatedAtMockTimestamp)

        // Deploy PresaleSNOVA
        const presaleFactory = new PresaleSNOVA__factory(owner)
        priceThreshold = updatedAtMockTimestamp + 1
        presale = await presaleFactory.deploy(tokenSaleRegistry, priceThreshold)

        // Deploy ERC20 Mocks
        const erc20MockFactory = new ERC20Mock__factory(owner)
        const mockSupply = ethers.parseEther("40000")
        erc20MockStable = await erc20MockFactory.deploy("MockStableToken", "MST", mockSupply)
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

    const transferAndApproveTokens = async (amounts: string[], user: SignerWithAddress) => {
        let totalAmount = BigInt(0)
        for (const amount of amounts) {
            totalAmount = totalAmount + ethers.parseEther(amount)
        }

        await erc20MockStable.transfer(user.address, totalAmount)
        await erc20MockStable.connect(user).approve(presale.target, totalAmount)
    }

    it("Should return correct number of Nova Points for multiple purchases for given token", async function () {
        await configureAndStartSaleRound()

        const amounts = ["50", "57", "140"]
        await transferAndApproveTokens(amounts, user2)

        await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

        for (const amount of amounts) {
            await presale
                .connect(user2)
                .purchaseTokens(user3.address, erc20MockStable.target, ethers.parseEther(amount))
        }

        const novaPoints = await presale.getNovaPoints(user2)
        expect(novaPoints).to.equal(1482)
    })

    it("Should return correct Nova Points for multiple purchases for native currency", async function () {
        await configureAndStartSaleRound()

        const amounts = ["0.016", "0.016", "0.017", "0.018"]
        await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

        for (const amount of amounts) {
            await presale
                .connect(user2)
                .purchaseTokens(user3.address, NATIVE_CURRENCY_ADDRESS, 0, { value: ethers.parseEther(amount) })
        }

        const novaPoints = await presale.getNovaPoints(user2)
        expect(novaPoints).to.equal(1362)
    })

    const testMultiplier = async (amount: string, expectedPoints: number) => {
        await configureAndStartSaleRound()

        await transferAndApproveTokens([amount], user2)
        await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

        await presale.connect(user2).purchaseTokens(user3.address, erc20MockStable.target, ethers.parseEther(amount))

        const novaPoints = await presale.getNovaPoints(user2)
        expect(novaPoints).to.equal(expectedPoints)
    }

    it("Should return correct number of Nova Points with 6 multiplier", async function () {
        await testMultiplier("147", 882)
    })

    it("Should return correct number of Nova Points with 7 multiplier", async function () {
        await testMultiplier("447", 3129)
    })

    it("Should return correct number of Nova Points with 8 multiplier", async function () {
        await testMultiplier("777", 6216)
    })

    it("Should return correct number of Nova Points with 9 multiplier", async function () {
        await testMultiplier("4447", 40023)
    })

    it("Should return correct number of Nova Points with 10 multiplier", async function () {
        await testMultiplier("7777", 77770)
    })

    it("Should return correct number of Nova Points with 13 multiplier", async function () {
        await testMultiplier("14447", 187811)
    })

    it("Should return correct number of Nova Points with 16 multiplier", async function () {
        await testMultiplier("17777", 284432)
    })

    it("Should return correct number of Nova Points with 20 multiplier", async function () {
        await testMultiplier("20007", 400140)
    })
})
