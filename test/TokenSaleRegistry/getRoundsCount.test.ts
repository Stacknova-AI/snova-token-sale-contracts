import { expect } from "chai"
import { TokenSaleRegistry, TokenSaleRegistry__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import "@nomicfoundation/hardhat-toolbox"
import { ethers } from "hardhat"

describe("TokenSaleRegistry - Rounds Count", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const initialPrice = BigInt("16000000000000000")
    const initialSupply = 100000000
    const nextRoundPrice = BigInt("18400000000000000")
    const nextRoundSupply = 1700000

    beforeEach(async function () {
        ;[owner, user1, user2, user3] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
        await tokenSaleRegistry.configureSaleRound(initialPrice, initialSupply)
        await tokenSaleRegistry.activateSale()
    })

    it("Should return the correct number of configured rounds", async function () {
        const additionalRounds = 7

        for (let i = 0; i < additionalRounds; i++) {
            await tokenSaleRegistry.configureSaleRound(nextRoundPrice, nextRoundSupply)
        }

        const roundsCount = await tokenSaleRegistry.getRoundsCount()
        expect(roundsCount).to.equal(1 + additionalRounds) // Initial round + additional rounds
    })

    it("Should return 1 when only the initial round is configured", async function () {
        const roundsCount = await tokenSaleRegistry.getRoundsCount()
        expect(roundsCount).to.equal(1)
    })

    it("Should return 0 when no rounds are configured", async function () {
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)

        const roundsCount = await tokenSaleRegistry.getRoundsCount()
        expect(roundsCount).to.equal(0)
    })
})
