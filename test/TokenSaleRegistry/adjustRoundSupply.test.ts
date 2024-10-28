import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Adjust Round Supply", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const mockAddressOfToken = "0xF1838e675089e4DCA7A76BC70B1A39184A02beC4"
    const supply = 100000000

    beforeEach(async function () {
        ;[owner, user1, user2, nonAdmin] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()

        await tokenSaleRegistry.activateSale()
    })

    describe("Negative Scenarios", function () {
        it("Should revert if called by a non-admin", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.startSaleRound(0)
            const newSupply = 150
            await expect(
                tokenSaleRegistry.connect(nonAdmin).adjustRoundSupply(0, newSupply),
            ).to.be.revertedWithCustomError(tokenSaleRegistry, "AccessControlUnauthorizedAccount")
        })

        it("Should revert if sales are deactivated", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            const newSupply = 150
            await tokenSaleRegistry.deactivateSale()
            await expect(tokenSaleRegistry.adjustRoundSupply(0, newSupply)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrSaleNotActive",
            )
        })

        it("Should revert if the given round is in closed state", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.startSaleRound(0)
            await tokenSaleRegistry.endSaleRound(0)
            const newSupply = 150
            await expect(tokenSaleRegistry.adjustRoundSupply(0, newSupply)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrRoundEnded",
            )
        })

        it("Should revert if sold exceeds new supply", async function () {
            const amount = 100
            const sold = 150
            const primaryReward = 40
            const secondaryReward = 20
            const newSupply = 149
            await tokenSaleRegistry.configureSaleRound(price, supply)

            await tokenSaleRegistry.processAndRecordSale(
                user1.address,
                mockAddressOfToken,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward,
            )
            await expect(tokenSaleRegistry.adjustRoundSupply(0, newSupply)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrInsufficientRoundSupply",
            )
        })

        it("Should revert if the round index is not set", async function () {
            const newSupply = 150
            await expect(tokenSaleRegistry.adjustRoundSupply(1, newSupply)).to.be.revertedWithPanic(
                "0x32", // Array accessed at an out-of-bounds or negative index
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should update the round supply correctly", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.startSaleRound(0)
            const newSupply = 150
            await tokenSaleRegistry.adjustRoundSupply(0, newSupply)
            const roundData = await tokenSaleRegistry.getRound(0)
            expect(roundData.supply).to.equal(newSupply)
        })

        it("Should emit SaleRoundSupplyAdjusted event", async function () {
            await tokenSaleRegistry.configureSaleRound(price, supply)
            await tokenSaleRegistry.startSaleRound(0)
            const newSupply = 150
            await expect(tokenSaleRegistry.adjustRoundSupply(0, newSupply))
                .to.emit(tokenSaleRegistry, "SaleRoundSupplyAdjusted")
                .withArgs(0, newSupply)
        })
    })
})
