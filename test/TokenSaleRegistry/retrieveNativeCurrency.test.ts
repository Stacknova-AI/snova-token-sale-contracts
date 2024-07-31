import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory, ERC20Mock, ERC20Mock__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - retrieveNativeCurrency", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let erc20Mock: ERC20Mock
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const supply = BigInt("1000000000000000000000000")

    beforeEach(async function () {
        ;[owner, user1, user2, user3] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)
        const erc20MockFactory = new ERC20Mock__factory(owner)
        const mockSupply = 999999
        erc20Mock = await erc20MockFactory.deploy("MockToken", "MOCK", mockSupply)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
        await tokenSaleRegistry.configureSaleRound(price, supply)
        await tokenSaleRegistry.activateSale()
    })

    describe("Negative Scenarios", function () {
        it("Should revert if caller is not DEFAULT_ADMIN", async function () {
            await expect(tokenSaleRegistry.connect(user2).retrieveNativeCurrency()).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "AccessControlUnauthorizedAccount"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should transfer contract's ether balance to the DEFAULT_ADMIN wallet", async function () {
            const amountToSend = ethers.parseEther("1.0")
            await owner.sendTransaction({
                to: tokenSaleRegistry,
                value: amountToSend,
            })

            const balanceBefore = await ethers.provider.getBalance(owner)
            const balanceOftokenSaleRegistry = await ethers.provider.getBalance(tokenSaleRegistry)
            const txRecover = await tokenSaleRegistry.retrieveNativeCurrency()
            const txRecoverReceipt = await txRecover.wait()
            if (txRecoverReceipt === null) {
                throw new Error("Transaction receipt is null")
            }
            const gasUsedRecover = txRecoverReceipt.gasUsed
            const gasCostRecover = gasUsedRecover * txRecover.gasPrice
            const balanceAfter = await ethers.provider.getBalance(owner)

            const expectedBalance = balanceBefore + balanceOftokenSaleRegistry - gasCostRecover

            expect(balanceAfter).to.equal(
                expectedBalance,
                "The owner's balance after the operation does not match the expected balance considering the gas costs."
            )
        })

        it("Should emit NativeCurrencyRetrieved event", async function () {
            const amountToSend = ethers.parseEther("1.0")
            await owner.sendTransaction({
                to: tokenSaleRegistry.target,
                value: amountToSend,
            })

            const balanceOfContract = await ethers.provider.getBalance(tokenSaleRegistry.target)

            await expect(tokenSaleRegistry.retrieveNativeCurrency())
                .to.emit(tokenSaleRegistry, "NativeCurrencyRetrieved")
                .withArgs(balanceOfContract)
        })
    })
})
