// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {TokenSaleRegistry} from "./TokenSaleRegistry.sol";

/**
 * @title Pre-sale Contract for SNOVA Tokens
 * @dev Manages the pre-sale phase of SNOVA tokens, incorporating price feeds for dynamic pricing and allowing for contributions
 * in the native currency and other stablecoins (USDT, USDC, DAI). This contract leverages the OpenZeppelin library for role management,
 * token safety, reentrancy checks, and operational controls (pause/unpause). It is closely tied to the TokenSaleRegistry, from which
 * it retrieves information about token sale rounds and referral incentives, ensuring consistent and secure transaction processing.
 *
 * Key functionalities include token purchasing, token and native currency recovery, and configuration of operational parameters.
 */
contract PresaleSNOVA is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Address for address payable;

    bytes32 public constant PURCHASE_AGENT_ROLE = keccak256("PURCHASE_AGENT_ROLE");
    address internal constant NATIVE_CURRENCY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    struct Currency {
        AggregatorV3Interface priceFeed;
        uint256 decimals; // 18 or 6 depends on token and network
        bool useStaticPrice; // If true, use a static price of $1
        uint256 totalCollected; // Total collected amount of the currency
    }

    TokenSaleRegistry private _presaleStorage;
    mapping(address => Currency) private _currencies; // Mapping to store whitelisted currencies for purchase
    mapping(address => uint256) private _novaPoints; // Mapping to store Nova Points for each user
    mapping(address => uint256) private _referralCount; // Mapping to store referral count for each user
    mapping(address => bool) private _hasPurchased; // Mapping to track if a user has already made a purchase
    mapping(address => address) private _referrer; // Mapping to track referrer for each user
    uint256 private _priceThresholdSeconds;

    /**
     * @notice Emitted when the price threshold time is updated.
     * @param priceFeedTimeThreshold New threshold in seconds for price feed update times.
     */
    event PriceThresholdUpdated(uint256 priceFeedTimeThreshold);

    /**
     * @notice Emitted when native currency is retrieved from the contract.
     * @param amount The amount of native currency retrieved.
     */
    event NativeCurrencyRetrieved(uint256 amount);

    /**
     * @notice Emitted when ERC20 tokens are retrieved from the contract.
     * @param token The address of the ERC20 token retrieved.
     * @param amount The amount of tokens retrieved.
     */
    event TokensRetrieved(address token, uint256 amount);

    /**
     * @notice Emitted when tokens are purchased during the pre-sale.
     * @param user The address of the user who purchased the tokens.
     * @param ref The referral address provided.
     * @param amount The amount of native currency used for the purchase.
     * @param price The price of the token at the moment of purchase.
     * @param sold The number of tokens sold in the transaction.
     * @param round The current round of the sale during which the purchase was made.
     * @param investmentUSD The amount the user invested in USD.
     * @param currencyPrice The price of the currency during the purchase.
     * @param novaPoints The number of Nova Points awarded.
     */
    event TokensPurchased(
        address indexed user,
        address indexed ref,
        uint256 amount,
        uint256 price,
        uint256 sold,
        uint256 round,
        uint256 investmentUSD,
        int256 currencyPrice,
        uint256 novaPoints
    );

    /**
     * @notice Emitted when Nova Points are awarded to a user or referrer.
     * @param user The address of the user receiving the Nova Points.
     * @param points The number of Nova Points awarded.
     */
    event NovaPointsAwarded(address indexed user, uint256 points);

    /**
     * @notice Emitted when a referral is registered.
     * @param referrer The address of the referrer.
     */
    event ReferralRegistered(address indexed referrer);

    /**
     * @notice Thrown when trying to purchase with a currency that is not whitelisted.
     */
    error ErrCurrencyNotWhitelisted();

    /**
     * @notice Thrown when attempting an operation while the sale is not active.
     */
    error ErrSaleNotActive();

    /**
     * @notice Thrown when attempting to interact with a sale round that is closed.
     */
    error ErrRoundClosed();

    /**
     * @notice Thrown when a null address is provided where a valid address is required.
     */
    error ErrNullAddress();

    /**
     * @notice Thrown when an invalid decimals value is provided.
     */
    error ErrInvalidDecimals();

    /**
     * @notice Thrown when the `amount_` parameter is not 0 for native currency purchases.
     */
    error ErrAmountValidation();

    /**
     * @notice Thrown when `msg.value` is not 0 for ERC20 token purchases.
     */
    error ErrValueValidation();

    /**
     * @notice Thrown when the price threshold is set to an invalid value.
     */
    error ErrInvalidPriceThreshold();

    /**
     * @notice Thrown when the presale price is invalid (e.g., zero).
     */
    error ErrInvalidPrice();

    /**
     * @notice Thrown when an allocation error occurs in a sale round due to supply limits.
     */
    error ErrRoundAllocation();

    /**
     * @notice Thrown when the price feed update is beyond the acceptable time threshold.
     */
    error ErrPriceThreshold();

    /**
     * @notice Thrown when a user address provided is a null address.
     */
    error ErrUserNullAddress();

    /**
     * @notice Thrown when the native currency amount for a purchase is zero.
     */
    error ErrAmountZero();

    /**
     * @notice Thrown when an invalid referral is used.
     */
    error ErrReferral();

    /**
     * @notice Thrown when a transfer of funds fails.
     */
    error ErrTransferFailure();

    /**
     * @notice Thrown when the amount provided is below the minimum required.
     * @param amount_ The amount provided.
     * @param min_ The minimum required amount.
     */
    error ErrMin(uint256 amount_, uint256 min_);

    /**
     * @notice Thrown when the amount provided exceeds the maximum allowed.
     * @param amount_ The amount provided.
     * @param max_ The maximum allowed amount.
     */
    error ErrMax(uint256 amount_, uint256 max_);

    /**
     * @notice Initializes a new PresaleSNOVA contract with necessary configuration.
     * @dev Sets up roles, price feed interface, and initial thresholds.
     * Assigns the DEFAULT_ADMIN_ROLE to the deployer, ensuring control over critical functions.
     * @param storage_ Address of the TokenSaleRegistry, storing sale rounds and referral details.
     * @param priceThresholdSeconds_ Time threshold to validate the recency of price updates.
     */
    constructor(address payable storage_, uint256 priceThresholdSeconds_) {
        if (storage_ == address(0)) {
            revert ErrNullAddress();
        }
        if (priceThresholdSeconds_ == 0) {
            revert ErrInvalidPriceThreshold();
        }

        _presaleStorage = TokenSaleRegistry(storage_);
        _priceThresholdSeconds = priceThresholdSeconds_;

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
     * @notice Adds a new currency and its associated price feed.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * Validates the `tokenAddress_` and `decimals_`.
     * @param tokenAddress_ The address of the ERC20 token.  Use `NATIVE_CURRENCY_ADDRESS` (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) to represent the native currency.
     * @param priceFeed_ The address of the new price feed, or zero address for static price.
     * @param decimals_ The decimals used by the currency.
     * @param useStaticPrice_ If true, use a static price of $1 instead of a price feed.
     * Reverts with `ErrNullAddress` if `tokenAddress_` is zero.
     * Reverts with `ErrInvalidDecimals` if `decimals_` is zero or greater than 18.
     */
    function addCurrency(
        address tokenAddress_,
        address priceFeed_,
        uint256 decimals_,
        bool useStaticPrice_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tokenAddress_ == address(0)) {
            revert ErrNullAddress();
        }
        if (decimals_ == 0 || decimals_ > 18) {
            revert ErrInvalidDecimals();
        }
        _addCurrency(tokenAddress_, priceFeed_, decimals_, useStaticPrice_);
    }

    /**
     * @notice Pauses the contract, preventing operations like token purchase.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses the contract, allowing operations like token purchase to resume.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Purchases tokens using the specified currency directly sent to the contract.
     * @dev Validates the `tokenAddress_` to ensure it is not the zero address unless it's the native currency address.
     * @param ref_ Optional referral address provided by the user to potentially earn referral bonuses.
     * @param tokenAddress_ The address of the ERC20 token used for purchase, or the native currency address.
     * @param amount_ The amount of currency to be used for purchase. For native currency, this should be 0 as `msg.value` is used.
     * @notice Reverts with `ErrNullAddress` if `tokenAddress_` is the zero address and not the native currency address.
     * Reverts if the currency is not whitelisted, the sale is not active, or the round is closed.
     */
    function purchaseTokens(address ref_, address tokenAddress_, uint256 amount_) external payable nonReentrant {
        if (tokenAddress_ == address(0)) {
            revert ErrNullAddress();
        }
        if (_currencies[tokenAddress_].decimals == 0) {
            revert ErrCurrencyNotWhitelisted();
        }
        if (tokenAddress_ == NATIVE_CURRENCY_ADDRESS) {
            if (amount_ != 0) {
                revert ErrAmountValidation();
            }
            _processPurchase(_msgSender(), ref_, tokenAddress_, msg.value, false);
        } else {
            if (msg.value != 0) {
                revert ErrValueValidation();
            }
            _processPurchase(_msgSender(), ref_, tokenAddress_, amount_, false);
        }
    }

    /**
     * @notice Enables a designated purchase agent to buy tokens on behalf of another user using the specified currency sent with the transaction.
     * This action must comply with the terms set for the current sale round in the TokenSaleRegistry.
     * @dev This function can be invoked by any user possessing the `PURCHASE_AGENT_ROLE` when the contract is not paused.
     * It is designed to facilitate purchases where the actual buyer cannot interact directly with the contract.
     * @param user_ The address of the user for whom the tokens are being purchased.
     * @param ref_ Optional referral address provided to potentially earn referral bonuses.
     * @param tokenAddress_ The address of the ERC20 token used for purchase, or zero address for native currency.
     * @param amount_ The amount of currency to be used for purchase. For native currency, this should be 0 as `msg.value` is used.
     * @notice Reverts if the currency is not whitelisted, the sale is not active, or the round is closed.
     */
    function purchaseTokensFor(
        address user_,
        address ref_,
        address tokenAddress_,
        uint256 amount_
    ) external payable onlyRole(PURCHASE_AGENT_ROLE) nonReentrant {
        if (_currencies[tokenAddress_].decimals == 0) {
            revert ErrCurrencyNotWhitelisted();
        }

        if (tokenAddress_ == NATIVE_CURRENCY_ADDRESS) {
            if (amount_ != 0) {
                revert ErrAmountValidation();
            }
            _processPurchase(user_, ref_, tokenAddress_, msg.value, true);
        } else {
            if (msg.value != 0) {
                revert ErrValueValidation();
            }
            _processPurchase(user_, ref_, tokenAddress_, amount_, true);
        }
    }

    /**
     * @notice Updates the time threshold for considering the price feed valid.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * @param priceThresholdSeconds_ The new time threshold in seconds.
     * Emits a {PriceThresholdUpdated} event on successful update.
     */
    function setPriceThreshold(uint256 priceThresholdSeconds_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (priceThresholdSeconds_ == 0) {
            revert ErrInvalidPriceThreshold();
        }
        _priceThresholdSeconds = priceThresholdSeconds_;
        emit PriceThresholdUpdated(priceThresholdSeconds_);
    }

    /**
     * @notice Retrieves native currency sent to the contract.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * @notice Requires successful transfer to the caller.
     * Emits a {NativeCurrencyRetrieved} event on successful retrieval.
     */
    function retrieveNativeCurrency() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        Address.sendValue(payable(_msgSender()), balance);
        emit NativeCurrencyRetrieved(balance);
    }

    /**
     * @notice Retrieves ERC20 tokens sent to the contract.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * @param token_ The address of the ERC20 token to retrieve.
     * @param amount_ The amount of tokens to retrieve.
     * Emits a {TokensRetrieved} event on successful retrieval.
     */
    function retrieveTokens(address token_, uint256 amount_) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        IERC20(token_).safeTransfer(_msgSender(), amount_);
        emit TokensRetrieved(token_, amount_);
    }

    /**
     * @notice Retrieves the address of the token sale storage contract.
     * @dev Returns the current address stored in `_presaleStorage`.
     * @return address The address of the token sale registry.
     */
    function getStorage() external view returns (address) {
        return address(_presaleStorage);
    }

    /**
     * @notice Returns the total amount of token or native currency collected through sales.
     * @dev Accesses the Currency from `_currencies` to provide the total collected funds.
     * @return uint256 The total amount of token or native currency collected.
     */
    function getTotalCollected(address tokenAddress_) external view returns (uint256) {
        Currency memory currency = _currencies[tokenAddress_];
        return currency.totalCollected;
    }

    /**
     * @notice Gets the current threshold for price updates, in seconds.
     * @dev Returns the time period in seconds that is considered acceptable for a price update delay.
     * @return uint256 The current price update threshold in seconds.
     */
    function getPriceThreshold() external view returns (uint256) {
        return _priceThresholdSeconds;
    }

    /**
     * @notice Returns the referral count for a user.
     * @param user_ The address of the user to retrieve the referral count for.
     * @return uint256 The referral count for the specified user.
     */
    function getReferralCount(address user_) external view returns (uint256) {
        return _referralCount[user_];
    }

    /**
     * @notice Retrieves the address of the price feed contract used for pricing information.
     * @dev Returns the current address stored in `_currencies`.
     * @param tokenAddress_ The address of the ERC20 token used for price feed, or zero address for native currency.
     * @return address The address of the price feed contract.
     */
    function getPriceFeed(address tokenAddress_) external view returns (address) {
        return address(_currencies[tokenAddress_].priceFeed);
    }

    /**
     * @notice Returns the Nova Points balance for a user.
     * @param user_ The address of the user to retrieve the Nova Points balance for.
     * @return uint256 The Nova Points balance for the specified user.
     */
    function getNovaPoints(address user_) external view returns (uint256) {
        return _novaPoints[user_];
    }

    /**
     * @notice Adds a new currency and its associated price feed to the internal storage.
     * @param tokenAddress_ The address of the ERC20 token to be added as a new currency.
     *                      Use `NATIVE_CURRENCY_ADDRESS` (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) to represent the native currency.
     * @param priceFeed_ The address of the `AggregatorV3Interface` price feed contract.
     *                    If `useStaticPrice_` is `true`, this can be the zero address.
     *                    For the native currency, a valid price feed should be provided unless `useStaticPrice_` is `true`.
     * @param decimals_ The number of decimals the currency uses. Typically aligns with the ERC20 token's decimals.
     *                  For the native currency, use the standard decimal representation (e.g., 18 for Ether).
     * @param useStaticPrice_ Determines whether to use a static price of $1 for the currency instead of fetching from a price feed.
     */
    function _addCurrency(address tokenAddress_, address priceFeed_, uint256 decimals_, bool useStaticPrice_) internal {
        _currencies[tokenAddress_] = Currency(AggregatorV3Interface(priceFeed_), decimals_, useStaticPrice_, 0);
    }

    /**
     * @dev Internal function to handle the purchase of tokens during the pre-sale.
     * This function orchestrates several key operations:
     * - Validation of the input parameters and state conditions to ensure the purchase can proceed.
     * - Interaction with the TokenSaleRegistry to retrieve and validate the current sale round.
     * - Calculation of the number of tokens that can be bought based on the native currency provided and the current token price.
     * - Handling of referral rewards if a valid referral is provided.
     * - Transfer of funds to the treasury and issuance of tokens and referral rewards.
     * - Calculation and awarding of Nova Points to the user.
     * - Calculation and awarding of Nova Points to the referrer, if applicable.
     * Each step involves checks and balances to ensure transaction integrity and security.
     * @param user_ The address of the user who is making the purchase.
     * @param ref_ Optional referral address that may entitle the referrer to rewards, if applicable.
     * @param tokenAddress_ The address of the ERC20 token used for purchase, or zero address for native currency.
     * @param amount_ The amount of currency to be used for purchase.
     * @param max_ Indicates whether the transaction should respect the maximum limit for contributions.
     * @return uint256 The number of tokens that were sold to the user.
     * Emits a {TokensPurchased} event upon successful completion of the purchase.
     * Emits a {NovaPointsAwarded} event when Nova Points are awarded to the user and the referrer.
     * @notice Reverts if the contract is paused, `user_` is a null address, the amount is zero, the sale is not active,
     * the sale round is closed, or the funds transfer fails.
     */
    function _processPurchase(
        address user_,
        address ref_,
        address tokenAddress_,
        uint256 amount_,
        bool max_
    ) internal whenNotPaused returns (uint256) {
        _validatePurchaseParameters(user_, ref_, amount_);
        TokenSaleRegistry.Round memory round = _getAndValidateSaleRound();
        uint256 tokensToSell = _calculateTokensToSell(amount_, tokenAddress_, round);
        uint256 funds = _calculateFundsInUSD(tokenAddress_, amount_);
        _validateFundsAndLimits(user_, funds, max_);

        ref_ = _handleReferral(user_, ref_);

        Currency storage currency = _currencies[tokenAddress_];
        int256 currencyPrice = _getCurrencyPrice(currency);

        (address ref, uint256 coinFunds, uint256 tokenFunds) = _calculateReferralRewards(
            user_,
            ref_,
            amount_,
            tokenAddress_
        );
        _transferPurchaseFunds(tokenAddress_, amount_, coinFunds);

        _recordSale(user_, tokenAddress_, funds, tokensToSell, ref_, coinFunds, tokenFunds);
        uint256 novaPoints = _awardNovaPoints(user_, funds);

        _updateCurrencyCollectedAmount(currency, amount_);

        _emitTokensPurchased(user_, ref, amount_, tokensToSell, funds, currencyPrice, novaPoints);
        _handleReferrerRewards(user_, ref, novaPoints);

        return tokensToSell;
    }

    /**
     * @dev Validates the input parameters for the purchase.
     * @param user_ The address of the user who is making the purchase.
     * @param ref_ The referral address provided by the user.
     * @param amount_ The amount of currency to be used for purchase.
     * @notice Reverts if the user address is null, user address equals referral address,
     * the amount is zero, or the sale is not active.
     */
    function _validatePurchaseParameters(address user_, address ref_, uint256 amount_) internal view {
        if (user_ == address(0)) revert ErrUserNullAddress();
        if (user_ == ref_) revert ErrReferral();
        if (amount_ == 0) revert ErrAmountZero();
        if (!_presaleStorage.isActive()) revert ErrSaleNotActive();
    }

    /**
     * @dev Retrieves and validates the current sale round from the TokenSaleRegistry.
     * @return TokenSaleRegistry.Round memory The current sale round.
     * @notice Reverts if the sale round is not started.
     */
    function _getAndValidateSaleRound() internal view returns (TokenSaleRegistry.Round memory) {
        TokenSaleRegistry.Round memory round = _presaleStorage.getRound(_presaleStorage.getCurrentRound());
        if (round.state != TokenSaleRegistry.State.Started) revert ErrRoundClosed();
        return round;
    }

    /**
     * @dev Calculates the number of tokens to sell based on the provided amount and token address.
     * @param amount_ The amount of currency to be used for purchase.
     * @param tokenAddress_ The address of the ERC20 token used for purchase, or zero address for native currency.
     * @param round The current sale round information.
     * @return uint256 The number of tokens to sell.
     * @notice Reverts if the round allocation is insufficient.
     */
    function _calculateTokensToSell(
        uint256 amount_,
        address tokenAddress_,
        TokenSaleRegistry.Round memory round
    ) internal view returns (uint256) {
        uint256 tokensToSell = _calculateTokensSold(amount_, tokenAddress_);
        if (round.supply < round.sold + tokensToSell) revert ErrRoundAllocation();
        return tokensToSell;
    }

    /**
     * @dev Validates the provided funds against the minimum and maximum limits.
     * @param user_ The address of the user who is making the purchase.
     * @param funds The amount of funds calculated in USD.
     * @param max_ Indicates whether the transaction should respect the maximum limit for contributions.
     * @notice Reverts if the funds are below the minimum or above the user's limit.
     */
    function _validateFundsAndLimits(address user_, uint256 funds, bool max_) internal view {
        if (_presaleStorage.getMin() > funds) revert ErrMin(funds, _presaleStorage.getMin());
        uint256 limit = max_ ? _presaleStorage.maxLimitOf(user_) : _presaleStorage.limitOf(user_);
        if (limit < funds) revert ErrMax(funds, limit);
    }

    /**
     * @dev Handles the referral logic by checking and updating the referral information.
     * @param user_ The address of the user who is making the purchase.
     * @param ref_ The referral address provided by the user.
     * @return address The updated referral address.
     */
    function _handleReferral(address user_, address ref_) internal returns (address) {
        if (_hasPurchased[user_]) {
            ref_ = _referrer[user_];
        } else {
            _referrer[user_] = ref_;
        }
        return ref_;
    }

    /**
     * @dev Retrieves the current price of the currency.
     * @param currency The currency information.
     * @return int256 The current price of the currency.
     */
    function _getCurrencyPrice(Currency storage currency) internal view returns (int256) {
        return currency.useStaticPrice ? int256(1e8) : _getLatestPrice(currency.priceFeed);
    }

    /**
     * @dev Records the sale by processing and recording the sale details in the presale storage.
     * @param user_ The address of the user who is making the purchase.
     * @param tokenAddress_ The address of the ERC20 token used for purchase.
     * @param funds The amount of funds calculated in USD.
     * @param tokensToSell The number of tokens to be sold.
     * @param ref_ The referral address.
     * @param coinFunds The funds associated with the referral in coins.
     * @param tokenFunds The funds associated with the referral in tokens.
     */
    function _recordSale(
        address user_,
        address tokenAddress_,
        uint256 funds,
        uint256 tokensToSell,
        address ref_,
        uint256 coinFunds,
        uint256 tokenFunds
    ) internal {
        _presaleStorage.processAndRecordSale(user_, tokenAddress_, funds, tokensToSell, ref_, coinFunds, tokenFunds);
    }

    /**
     * @dev Awards Nova Points to the user based on the provided funds.
     * @param user_ The address of the user who is making the purchase.
     * @param funds The amount of funds calculated in USD.
     * @return uint256 The number of Nova Points awarded to the user.
     */
    function _awardNovaPoints(address user_, uint256 funds) internal returns (uint256) {
        uint256 novaPoints = _calculateNovaPoints(funds);
        _novaPoints[user_] += novaPoints;
        return novaPoints;
    }

    /**
     * @dev Updates the total collected amount for the given currency.
     * @param currency The currency information.
     * @param amount_ The amount to be added to the total collected amount.
     */
    function _updateCurrencyCollectedAmount(Currency storage currency, uint256 amount_) internal {
        currency.totalCollected += amount_;
    }

    /**
     * @dev Emits the TokensPurchased and NovaPointsAwarded events.
     * @param user_ The address of the user who is making the purchase.
     * @param ref The referral address.
     * @param amount_ The amount of currency used for purchase.
     * @param tokensToSell The number of tokens sold.
     * @param funds The amount of funds calculated in USD.
     * @param currencyPrice The current price of the currency.
     * @param novaPoints The number of Nova Points awarded to the user.
     */
    function _emitTokensPurchased(
        address user_,
        address ref,
        uint256 amount_,
        uint256 tokensToSell,
        uint256 funds,
        int256 currencyPrice,
        uint256 novaPoints
    ) internal {
        uint256 snovaPrice = _presaleStorage.getPrice();
        emit TokensPurchased(
            user_,
            ref,
            amount_,
            snovaPrice,
            tokensToSell,
            _presaleStorage.getCurrentRound(),
            funds,
            currencyPrice,
            novaPoints
        );
        emit NovaPointsAwarded(user_, novaPoints);
    }

    /**
     * @dev Handles the rewards for the referrer by awarding Nova Points and updating referral information.
     * @param user_ The address of the user who is making the purchase.
     * @param ref The referral address.
     * @param novaPoints The number of Nova Points awarded to the user.
     */
    function _handleReferrerRewards(address user_, address ref, uint256 novaPoints) internal {
        if (ref != address(0)) {
            uint256 referrerNovaPoints = (novaPoints * 20) / 100;
            _novaPoints[ref] += referrerNovaPoints;
            emit NovaPointsAwarded(ref, referrerNovaPoints);
            if (!_hasPurchased[user_]) {
                _hasPurchased[user_] = true;
                _referralCount[ref] += 1;
                emit ReferralRegistered(ref);
            }
        }
    }

    /**
     * @dev Retrieves the latest price from the price feed and ensures the data is recent and valid.
     * Adds a check to ensure the price is greater than zero.
     * @param priceFeed The price feed contract.
     * @return int256 The latest price.
     * @notice Reverts with `ErrPriceThreshold` if the price feed update is beyond the acceptable time threshold.
     * Reverts with `ErrInvalidPrice` if the price is zero or negative.
     */
    function _getLatestPrice(AggregatorV3Interface priceFeed) internal view returns (int256) {
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        if (block.timestamp - updatedAt > _priceThresholdSeconds) {
            revert ErrPriceThreshold();
        }
        if (price <= 0) {
            revert ErrInvalidPrice();
        }
        return price;
    }

    /**
     * @dev Converts a specified amount of tokens (native currency, USDT, USDC, or DAI) into its equivalent value in USD.
     * This conversion is based on the latest available price of the native currency in terms of USD.
     * @param tokenAddress_ The address of the ERC20 token used for purchase, or zero address for native currency.
     * @param amount_ The amount of tokens to be converted.
     * @return uint256 The equivalent amount in USD.
     */
    function _calculateFundsInUSD(address tokenAddress_, uint256 amount_) internal view returns (uint256) {
        Currency storage currency = _currencies[tokenAddress_];
        uint8 decimals = currency.useStaticPrice ? 8 : currency.priceFeed.decimals();
        int256 price = currency.useStaticPrice ? int256(1e8) : _getLatestPrice(currency.priceFeed);

        uint256 amountAdjusted = currency.decimals == 6 ? amount_ * 1e12 : amount_;

        return (amountAdjusted * uint256(price)) / (10 ** decimals);
    }

    /**
     * @dev Calculates the number of tokens that can be purchased with a given amount of currency.
     * Includes a check to prevent division by zero if the presale price is zero.
     * @param amount_ The amount of currency provided for the purchase.
     * @param tokenAddress_ The address of the ERC20 token used for purchase, or the native currency address.
     * @return uint256 The calculated number of tokens that can be bought with the specified amount of currency.
     * @notice Reverts with `ErrInvalidPrice` if the presale price is zero.
     */
    function _calculateTokensSold(uint256 amount_, address tokenAddress_) internal view returns (uint256) {
        Currency storage currency = _currencies[tokenAddress_];
        uint8 decimals = currency.useStaticPrice ? 8 : currency.priceFeed.decimals();
        int256 price = currency.useStaticPrice ? int256(1e8) : _getLatestPrice(currency.priceFeed);

        uint256 amountAdjusted = currency.decimals == 6 ? amount_ * 1e12 : amount_;
        uint256 presalePrice = _presaleStorage.getPrice();

        if (presalePrice == 0) {
            revert ErrInvalidPrice();
        }

        return (amountAdjusted * uint256(price) * 1e18) / (presalePrice * (10 ** decimals));
    }

    /**
     * @dev Calculates the referral rewards based on the purchase amount and the rates applicable to the referrer.
     * Handles different decimals for different tokens.
     * @param user_ The user who made the purchase.
     * @param ref_ The referral address.
     * @param amount_ The amount of currency used in the purchase.
     * @param tokenAddress_ The address of the ERC20 token used for purchase, or zero address for native currency.
     * @return address The effective referral address.
     * @return uint256 The amount of native currency as a referral reward.
     * @return uint256 The amount of tokens as a referral reward.
     */
    function _calculateReferralRewards(
        address user_,
        address ref_,
        uint256 amount_,
        address tokenAddress_
    ) internal view returns (address, uint256, uint256) {
        address ref = _presaleStorage.getRef(user_, ref_);
        if (ref == address(0)) {
            return (ref, 0, 0);
        }

        (uint256 fRate, uint256 sRate) = _presaleStorage.getRefRates(ref);

        uint256 coinFunds = (amount_ * fRate) / 1000;
        uint256 tokenFunds = (amount_ * sRate) / 1000;

        uint256 tokenSold = _calculateTokensSold(tokenFunds, tokenAddress_);

        return (ref, coinFunds, tokenSold);
    }

    /**
     * @dev Transfers the purchase funds and referral rewards to the appropriate recipients.
     *      Handles different decimal places for currencies and ensures precise calculations.
     * @param tokenAddress_ The address of the ERC20 token used for purchase, or zero address for native currency.
     * @param amount_ The total amount of the currency used for purchase.
     * @param reward_ The amount of the currency to be transferred as a referral reward.
     */
    function _transferPurchaseFunds(address tokenAddress_, uint256 amount_, uint256 reward_) internal {
        address treasury = _presaleStorage.getFundsWallet();

        if (tokenAddress_ != NATIVE_CURRENCY_ADDRESS) {
            IERC20(tokenAddress_).safeTransferFrom(_msgSender(), treasury, amount_ - reward_);

            if (reward_ > 0) {
                IERC20(tokenAddress_).safeTransferFrom(_msgSender(), address(_presaleStorage), reward_);
            }
        } else {
            Address.sendValue(payable(treasury), amount_ - reward_);

            if (reward_ > 0) {
                Address.sendValue(payable(address(_presaleStorage)), reward_);
            }
        }
    }

    /**
     * @notice Calculates the number of Nova Points awarded based on the investment amount in USD.
     * @dev The investment amount is in USD and the multipliers are predefined for different investment ranges.
     * @param investment_ The investment amount in USD (in 18 decimal places).
     * @return The number of Nova Points awarded.
     */
    function _calculateNovaPoints(uint256 investment_) internal pure returns (uint256) {
        uint256 multiplier = 0;
        if (investment_ >= 20000 * 1e18) {
            multiplier = 20;
        } else if (investment_ >= 15000 * 1e18) {
            multiplier = 16;
        } else if (investment_ >= 10000 * 1e18) {
            multiplier = 13;
        } else if (investment_ >= 5000 * 1e18) {
            multiplier = 10;
        } else if (investment_ >= 1000 * 1e18) {
            multiplier = 9;
        } else if (investment_ >= 500 * 1e18) {
            multiplier = 8;
        } else if (investment_ >= 250 * 1e18) {
            multiplier = 7;
        } else if (investment_ >= 50 * 1e18) {
            multiplier = 6;
        }

        return (investment_ * multiplier) / 1e18;
    }

    /**
     * @dev Fallback function to allow the contract to receive Ether directly.
     */
    receive() external payable {}
}
