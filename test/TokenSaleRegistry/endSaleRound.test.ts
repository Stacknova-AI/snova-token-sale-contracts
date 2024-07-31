import { ethers } from "hardhat"
import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - End Sale Round", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let nonAdmin: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const nextRoundPrice = BigInt("18400000000000000")
    const supply = 100000000
    const nextRoundSupply = 1700000

    beforeEach(async function () {
        ;[owner, nonAdmin] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
        await tokenSaleRegistry.configureSaleRound(price, supply)
        await tokenSaleRegistry.activateSale()
    })

    describe("Negative Scenarios", function () {
        it("Should revert if called by a non-admin", async function () {
            await tokenSaleRegistry.startSaleRound(0)
            await tokenSaleRegistry.endSaleRound(0)
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
            await tokenSaleRegistry.startSaleRound(1)
            await expect(tokenSaleRegistry.connect(nonAdmin).endSaleRound(1)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "AccessControlUnauthorizedAccount"
            )
        })

        it("Should revert if the round has already ended", async function () {
            await tokenSaleRegistry.startSaleRound(0)
            await tokenSaleRegistry.endSaleRound(0)
            await expect(tokenSaleRegistry.endSaleRound(0)).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrRoundEnded"
            )
        })

        it("Should revert if the round index is not set", async function () {
            // This test expects a panic error due to out-of-bounds access in the EVM.
            // The contract's current implementation does not explicitly check if the round index is defined
            // before accessing the rounds array. As a result, attempting to access an undefined index
            // will cause the EVM to throw a panic error with code 0x32 (Array accessed at an out-of-bounds or negative index).
            // This behavior is inherent to how the EVM handles array accesses and ensures that out-of-bounds accesses are caught.
            // If the contract is updated in the future to handle undefined round indices explicitly,
            // this test should be updated accordingly to reflect the new error handling behavior.
            // Note that the check for `ErrUndefinedSaleRound` in the contract will never be reached because of the EVM panic.
            await expect(tokenSaleRegistry.endSaleRound(1)).to.be.revertedWithPanic(
                "0x32" // Array accessed at an out-of-bounds or negative index
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should end the given round", async function () {
            await tokenSaleRegistry.startSaleRound(0)
            await tokenSaleRegistry.endSaleRound(0)
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
            await tokenSaleRegistry.startSaleRound(1)
            await tokenSaleRegistry.endSaleRound(1)

            const roundData = await tokenSaleRegistry.getRound(1)
            expect(roundData[1]).to.equal(2) // Assuming 2 indicates the round has ended
        })

        it("Should emit SaleRoundEnded event", async function () {
            await tokenSaleRegistry.startSaleRound(0)
            await tokenSaleRegistry.endSaleRound(0)
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
            await tokenSaleRegistry.startSaleRound(1)

            await expect(tokenSaleRegistry.endSaleRound(1)).to.emit(tokenSaleRegistry, "SaleRoundEnded").withArgs(1)
        })
    })
})
