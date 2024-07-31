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

const ADDRESS_ZERO = ethers.ZeroAddress

describe("PresaleSNOVA Contract - Constructor", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let presale: PresaleSNOVA
    let mockPriceFeed: MockAggregatorV3Interface
    let owner: SignerWithAddress
    let priceThreshold: number

    beforeEach(async function () {
        ;[owner] = await ethers.getSigners()

        // Deploy TokenSaleRegistry
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        // Deploy Mock Price Feed
        const mockPriceFeedFactory = new MockAggregatorV3Interface__factory(owner)
        mockPriceFeed = await mockPriceFeedFactory.deploy(8, 339292000000, 2758936498234698)

        // Initialize price threshold
        priceThreshold = 10

        // Deploy PresaleSNOVA
        const presaleFactory = new PresaleSNOVA__factory(owner)
        presale = await presaleFactory.deploy(tokenSaleRegistry.target, priceThreshold)
    })

    describe("Argument Validation for Constructor", function () {
        it("Should revert if presale constructor argument is address zero", async function () {
            await expect(
                new PresaleSNOVA__factory(owner).deploy(ADDRESS_ZERO, priceThreshold)
            ).to.be.revertedWithCustomError(presale, "ErrNullAddress")
        })

        it("Should revert if price threshold is zero", async function () {
            await expect(
                new PresaleSNOVA__factory(owner).deploy(tokenSaleRegistry.target, 0)
            ).to.be.revertedWithCustomError(presale, "ErrInvalidPriceThreshold")
        })
    })

    describe("Correct Initialization", function () {
        it("Should set the tokenSaleRegistry properly", async function () {
            expect(await presale.getStorage()).to.equal(tokenSaleRegistry.target)
        })

        it("Should set the priceThreshold properly", async function () {
            expect(await presale.getPriceThreshold()).to.equal(priceThreshold)
        })
    })

    describe("Role Management", function () {
        it("Should grant the DEFAULT_ADMIN_ROLE to the deployer", async function () {
            const defaultAdminRole = await presale.DEFAULT_ADMIN_ROLE()
            expect(await presale.hasRole(defaultAdminRole, owner.address)).to.be.true
        })
    })
})
