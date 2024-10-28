import { ethers } from "hardhat"
import { expect } from "chai"
import {
    TokenSaleRegistry,
    TokenSaleRegistry__factory,
    MockAggregatorV3Interface,
    MockAggregatorV3Interface__factory,
    PresaleSNOVA,
    PresaleSNOVA__factory,
} from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("PresaleSNOVA - Set Price Threshold Functionality", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let presale: PresaleSNOVA
    let mockPriceFeed1: MockAggregatorV3Interface
    let mockPriceFeed2: MockAggregatorV3Interface
    let mockPriceFeed3: MockAggregatorV3Interface
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress

    const updatedAtMockTimestamp = 1711647002
    const mockPrice = 339292000000
    const decimals = 8
    const initialPriceThreshold = updatedAtMockTimestamp + 1

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
        presale = await presaleFactory.deploy(tokenSaleRegistry, initialPriceThreshold)
    })

    describe("Negative Scenarios", function () {
        it("Should revert if called by a non-admin", async function () {
            await expect(presale.connect(user2).setPriceThreshold(1)).to.be.revertedWithCustomError(
                presale,
                "AccessControlUnauthorizedAccount",
            )
        })
        it("Should revert if price treshold is zero", async function () {
            await expect(presale.setPriceThreshold(0)).to.be.revertedWithCustomError(
                presale,
                "ErrInvalidPriceThreshold",
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should set price threshold successfully", async function () {
            const newPriceThreshold = 86400
            await presale.setPriceThreshold(newPriceThreshold)
            const priceThreshold = await presale.getPriceThreshold()
            expect(priceThreshold).to.equal(newPriceThreshold)
        })

        it("Should emit PriceThresholdUpdated event", async function () {
            const newPriceThreshold = 86400
            await expect(presale.setPriceThreshold(newPriceThreshold))
                .to.emit(presale, "PriceThresholdUpdated")
                .withArgs(newPriceThreshold)
        })
    })
})
