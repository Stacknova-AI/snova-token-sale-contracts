import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Update Funds Wallet", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const supply = 100000000
    const zeroAddress = "0x0000000000000000000000000000000000000000"

    beforeEach(async function () {
        ;[owner, user1, user2, user3, nonAdmin] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
        await tokenSaleRegistry.configureSaleRound(price, supply)
        await tokenSaleRegistry.activateSale()
    })

    describe("Negative Scenarios", function () {
        it("Should revert if called by a non-admin", async function () {
            await expect(
                tokenSaleRegistry.connect(nonAdmin).updateFundsWallet(user2.address)
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if the treasury address is the zero address", async function () {
            await expect(tokenSaleRegistry.updateFundsWallet(zeroAddress)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrNullAddress"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should set a new treasury address", async function () {
            await tokenSaleRegistry.updateFundsWallet(user2.address)
            const newTreasury = await tokenSaleRegistry.getFundsWallet()
            expect(newTreasury).to.equal(user2.address)
        })

        it("Should emit FundsManagementWalletUpdated event", async function () {
            await expect(tokenSaleRegistry.updateFundsWallet(user1.address))
                .to.emit(tokenSaleRegistry, "FundsManagementWalletUpdated")
                .withArgs(user1.address)
        })
    })
})
