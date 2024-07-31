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

describe("PresaleSNOVA Contract - Price Feed Managing Functionality", function () {
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

    it("Should return correct price feed address for given token address", async function () {
        const priceFeed = await presale.getPriceFeed(erc20MockNotStable.target)
        expect(priceFeed).to.equal(mockPriceFeed2.target)
    })

    it("Should return correct price feed address for native currency address", async function () {
        const priceFeed = await presale.getPriceFeed(NATIVE_CURRENCY_ADDRESS)
        expect(priceFeed).to.equal(mockPriceFeed3.target)
    })
})
