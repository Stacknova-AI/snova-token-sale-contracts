import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory, ERC20Mock, ERC20Mock__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - retrieveTokens", function () {
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
            await expect(
                tokenSaleRegistry.connect(user2).retrieveTokens(erc20Mock.target, 100)
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if amount is greater than the contract balance", async function () {
            await expect(tokenSaleRegistry.retrieveTokens(erc20Mock.target, 100)).to.be.revertedWithCustomError(
                erc20Mock,
                "ERC20InsufficientBalance"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should transfer the requested token amount to the DEFAULT_ADMIN wallet", async function () {
            await erc20Mock.transfer(tokenSaleRegistry.target, 1000)
            const balanceOfOwnerBefore = await erc20Mock.balanceOf(owner.address)

            await tokenSaleRegistry.retrieveTokens(erc20Mock.target, 100)

            const balanceOfOwnerAfter = await erc20Mock.balanceOf(owner.address)
            expect(balanceOfOwnerAfter - balanceOfOwnerBefore).to.equal(100)
        })

        it("Should emit TokensRetrieved event", async function () {
            await erc20Mock.transfer(tokenSaleRegistry.target, 1000)

            await expect(tokenSaleRegistry.retrieveTokens(erc20Mock.target, 100))
                .to.emit(tokenSaleRegistry, "TokensRetrieved")
                .withArgs(erc20Mock.target, 100)
        })
    })
})
