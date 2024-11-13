import { expect } from "chai"
import { ethers } from "hardhat"
import { TokenSaleRegistry, TokenSaleRegistry__factory, ERC20Mock, ERC20Mock__factory } from "../../typechain"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

describe("TokenSaleRegistry - Claim Referral Rewards", function () {
    let tokenSaleRegistry: TokenSaleRegistry
    let erc20Mock: ERC20Mock
    let erc20Mock2: ERC20Mock
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let defaultAdminRole: string
    let operatorRole: string
    const price = BigInt("16000000000000000")
    const supply = BigInt("1000000000000000000000000")
    const primaryRefRate = 50
    const secondaryRefRate = 70
    const ethereumInternal = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

    beforeEach(async function () {
        ;[owner, user1, user2, user3] = await ethers.getSigners()
        const tokenSaleRegistryFactory = new TokenSaleRegistry__factory(owner)
        tokenSaleRegistry = await tokenSaleRegistryFactory.deploy(owner.address)
        const erc20MockFactory = new ERC20Mock__factory(owner)
        const mockSupply = 999999
        erc20Mock = await erc20MockFactory.deploy("MockToken", "MOCK", mockSupply)
        erc20Mock2 = await erc20MockFactory.deploy("MockToken2", "MOCK2", mockSupply)

        defaultAdminRole = await tokenSaleRegistry.DEFAULT_ADMIN_ROLE()
        operatorRole = await tokenSaleRegistry.OPERATOR_ROLE()
        await tokenSaleRegistry.configureSaleRound(price, supply)
        await tokenSaleRegistry.activateSale()
    })

    describe("Negative Scenarios", function () {
        it("Should revert if the addresses array is empty", async function () {
            await expect(tokenSaleRegistry.claimRef([])).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrEmptyTokenList",
            )
        })

        it("Should revert if the sender is not defined as a referral", async function () {
            await expect(tokenSaleRegistry.claimRef([user3.address])).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrUndefinedReferralAccount",
            )
        })

        it("Should revert if the sender is defined as a referral but is disabled", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([owner.address], [primaryRefRate], [secondaryRefRate])
            await tokenSaleRegistry.disableReferral(owner.address)
            await expect(tokenSaleRegistry.claimRef([user3.address])).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "ErrReferralNotEnabled",
            )
        })

        it("Should revert if contract's Ethereum balance is zero while claiming Ethereum", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user2.address], [primaryRefRate], [secondaryRefRate])
            const amount = 100
            const sold = 150
            const primaryReward = 40
            const secondaryReward = 20

            await tokenSaleRegistry.processAndRecordSale(
                user2.address,
                ethereumInternal,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward,
            )

            await expect(tokenSaleRegistry.connect(user2).claimRef([ethereumInternal])).to.be.revertedWithCustomError(
                tokenSaleRegistry,
                "InsufficientBalance"
            )
        })
    })

    describe("Positive Scenarios", function () {
        it("Should reset referral balances after claiming", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user2.address], [primaryRefRate], [secondaryRefRate])
            const amount = 100
            const sold = 150
            const primaryReward = 40
            const secondaryReward = 20

            await tokenSaleRegistry.processAndRecordSale(
                user2.address,
                erc20Mock.target,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward,
            )

            await erc20Mock.transfer(tokenSaleRegistry.target, 999999)
            await tokenSaleRegistry.connect(user2).claimRef([erc20Mock.target])
            const refsBalanceOfUser = await tokenSaleRegistry.refBalanceOf(user2.address, erc20Mock.target)
            expect(refsBalanceOfUser).to.equal(0)
        })

        it("Should continue processing the list of tokens to claim rewards, even if some tokens have no rewards to claim", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user2.address], [primaryRefRate], [secondaryRefRate])
            const amount = 100
            const sold = 150
            const primaryReward = 40
            const secondaryReward = 20

            await tokenSaleRegistry.processAndRecordSale(
                user2.address,
                erc20Mock.target,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward,
            )

            await erc20Mock.transfer(tokenSaleRegistry.target, 999999)
            await tokenSaleRegistry.connect(user2).claimRef([erc20Mock.target, erc20Mock2.target])
            const refsBalanceOfUser = await tokenSaleRegistry.refBalanceOf(user2.address, erc20Mock2.target)
            expect(refsBalanceOfUser).to.equal(0)
        })

        it("Should successfully claim tokens", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user2.address], [primaryRefRate], [secondaryRefRate])
            const amount = 100
            const sold = 150
            const primaryReward = 45
            const secondaryReward = 20

            await tokenSaleRegistry.processAndRecordSale(
                user2.address,
                erc20Mock.target,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward,
            )

            await erc20Mock.transfer(tokenSaleRegistry.target, 999999)
            await tokenSaleRegistry.connect(user2).claimRef([erc20Mock.target])
            const balanceOfUser = await erc20Mock.balanceOf(user2.address)
            expect(balanceOfUser).to.equal(primaryReward)
        })

        it("Should successfully claim Ethereum", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user2], [primaryRefRate], [secondaryRefRate])
            let ethereumInternal = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
            let amount = 100
            let sold = 150
            let ref = user2
            let primaryReward = ethers.parseEther("1.0")
            let secondaryReward = 20
            await tokenSaleRegistry.processAndRecordSale(
                user2,
                ethereumInternal,
                amount,
                sold,
                ref,
                primaryReward,
                secondaryReward,
            )
            const amountToSend = ethers.parseEther("1.0")
            await owner.sendTransaction({
                to: tokenSaleRegistry,
                value: amountToSend,
            })

            const balanceBeforeClaiming = await ethers.provider.getBalance(user2)
            const balanceToBeClaimed = await tokenSaleRegistry.refBalanceOf(user2, ethereumInternal)

            await ethers.provider.getBalance(tokenSaleRegistry)

            const tx = await tokenSaleRegistry.connect(user2).claimRef([ethereumInternal])
            const txReceipt = await tx.wait()
            if (txReceipt === null) {
                throw new Error("Transaction receipt is null")
            }
            const gasUsed = txReceipt.gasUsed
            const gasCost = gasUsed * tx.gasPrice
            expect(await ethers.provider.getBalance(user2)).to.equal(
                BigInt(balanceBeforeClaiming) + BigInt(balanceToBeClaimed) - gasCost,
            )
        })
        it("Should emit ReferralRewardsClaimed event", async function () {
            await tokenSaleRegistry.initializeReferralAccounts([user2.address], [primaryRefRate], [secondaryRefRate])
            const amount = 100
            const sold = 150
            const primaryReward = 40
            const secondaryReward = 20

            await tokenSaleRegistry.processAndRecordSale(
                user2.address,
                erc20Mock.target,
                amount,
                sold,
                user2.address,
                primaryReward,
                secondaryReward,
            )

            await erc20Mock.transfer(tokenSaleRegistry.target, 999999)
            await expect(tokenSaleRegistry.connect(user2).claimRef([erc20Mock.target]))
                .to.emit(tokenSaleRegistry, "ReferralRewardsClaimed")
                .withArgs(user2.address, erc20Mock.target, primaryReward)
        })
    })
})
