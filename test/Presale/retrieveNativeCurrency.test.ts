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

describe("PresaleSNOVA - Retrieve Native Currency Functionality", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let presale: PresaleSNOVA
    let mockPriceFeed: MockAggregatorV3Interface
    let erc20Mock: ERC20Mock
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress

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
    })

    describe("Negative Scenarios", function () {
        it("Should revert if caller is not DEFAULT_ADMIN", async function () {
            await expect(presale.connect(user2).retrieveNativeCurrency()).to.be.revertedWithCustomError(
                presale,
                "AccessControlUnauthorizedAccount"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should successfully transfer presale ethereum balance to the DEFAULT_ADMIN wallet", async function () {
            const amountToSend = ethers.parseEther("1.0")
            await owner.sendTransaction({
                to: presale.target,
                value: amountToSend,
            })

            const balanceBefore = await ethers.provider.getBalance(owner)
            const balanceOfPresale = await ethers.provider.getBalance(presale)
            const txRecover = await presale.retrieveNativeCurrency()
            const txRecoverReceipt = await txRecover.wait()
            if (txRecoverReceipt === null) {
                throw new Error("Transaction receipt is null")
            }
            const gasUsedRecover = txRecoverReceipt.gasUsed
            const gasCostRecover = gasUsedRecover * txRecover.gasPrice
            const balanceAfter = await ethers.provider.getBalance(owner)

            const expectedBalance = balanceBefore + balanceOfPresale - gasCostRecover

            expect(balanceAfter).to.equal(
                expectedBalance,
                "The owner's balance after the operation does not match the expected balance considering the gas costs."
            )
        })

        it("Should emit NativeCurrencyRetrieved event", async function () {
            const balanceOfPresale = await ethers.provider.getBalance(presale.target)
            await expect(presale.retrieveNativeCurrency())
                .to.emit(presale, "NativeCurrencyRetrieved")
                .withArgs(balanceOfPresale)
        })
    })
})
