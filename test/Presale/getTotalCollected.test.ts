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

describe("PresaleSNOVA Contract - Total Collected Tokens Functionality", function () {
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

        // Deploy ERC20 Mocks
        const erc20MockFactory = new ERC20Mock__factory(owner)
        const mockSupply = ethers.parseEther("999")
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
            totalAmount += ethers.parseEther(amount)
        }

        await erc20MockStable.transfer(user.address, totalAmount)
        await erc20MockStable.connect(user).approve(presale.target, totalAmount)
    }

    it("Should return correct totalCollected for given token", async function () {
        await configureAndStartSaleRound()

        const amounts = ["50", "57", "140"]
        await transferAndApproveTokens(amounts, user2)

        await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

        for (const amount of amounts) {
            await presale
                .connect(user2)
                .purchaseTokens(user3.address, erc20MockStable.target, ethers.parseEther(amount))
        }

        const totalCollected = await presale.getTotalCollected(erc20MockStable.target)
        expect(totalCollected).to.equal(ethers.parseEther("247"))
    })

    it("Should return correct totalCollected for native currency", async function () {
        await configureAndStartSaleRound()

        const amounts = ["50", "57", "52"]
        await tokenSaleRegistry.grantRole(ethers.id("OPERATOR_ROLE"), presale)

        for (const amount of amounts) {
            await presale
                .connect(user2)
                .purchaseTokens(user3.address, NATIVE_CURRENCY_ADDRESS, 0, { value: ethers.parseEther(amount) })
        }
        await presale
            .connect(user2)
            .purchaseTokens(user3.address, NATIVE_CURRENCY_ADDRESS, 0, { value: ethers.parseEther("50") })

        const totalCollected = await presale.getTotalCollected(NATIVE_CURRENCY_ADDRESS)
        expect(totalCollected).to.equal(ethers.parseEther("209"))
    })
})
