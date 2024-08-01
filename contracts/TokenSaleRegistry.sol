// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Token Sale Registry
 * @dev Manages the lifecycle of token sale rounds, including referral programs and fund allocation.
 * This contract allows for the configuration of sale rounds, referral rates, and the claiming of referral rewards.
 * It implements AccessControl for administrative actions and utilizes SafeERC20 for token interactions.
 */
contract TokenSaleRegistry is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /**
     * @notice Tracks the state of the token sale.
     * @dev Used to manage the lifecycle stages of a sale round within the contract.
     * @param Reset Initial state, no sale is active.
     * @param Started Sale round has started and is currently active.
     * @param Ended Sale round has completed, and no further sales are possible.
     */
    enum State {
        Reset,
        Started,
        Ended
    }

    /**
     * @notice Structure representing a sale round within the token sale.
     * @dev Stores details pertinent to a single round of the sale.
     * @param defined Boolean indicating if the round is defined, used to check initialization.
     * @param state Current state of the round, corresponding to the State enum.
     * @param sold Total number of tokens sold in this round.
     * @param supply Total number of tokens available for sale in this round.
     */
    struct Round {
        bool defined;
        State state;
        uint256 price;
        uint256 sold;
        uint256 supply;
    }

    /**
     * @notice Details about a referral account used in the token sale.
     * @dev Tracks whether a referral is active and the rates applicable for commission.
     * @param defined Boolean indicating if the referral account is set up in the system.
     * @param enabled Boolean indicating if the referral account is currently enabled.
     * @param primaryRefRate Referral rate for direct referrals, expressed as a percentage of the sale.
     * @param secondaryRefRate Referral rate for secondary referrals, affecting indirect sales influence.
     */
    struct Referral {
        bool defined;
        bool enabled;
        uint256 primaryRefRate;
        uint256 secondaryRefRate;
    }

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    address internal constant NATIVE_CURRENCY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address internal constant TOKEN = 0x0000000000000000000000000000000000000001;
    uint256 internal constant MAX_ALLOCATION = 1e25;
    uint256 internal constant MIN_CONTRIBUTION = 49e18;

    address private _fundsManagementWallet;
    State private _state;

    Round[] private _rounds;
    uint256 private _currentRound;

    uint256 private _max;
    uint256 private _min;

    uint256 private _authLimit;
    mapping(address => bool) private _auth;

    uint256 private _primaryRefRate = 150;
    uint256 private _secondaryRefRate = 50;

    uint256 private _totalSold;
    mapping(address => uint256) private _funds;
    mapping(address => mapping(uint256 => uint256)) private _balances;

    mapping(address => Referral) private _refs;
    mapping(address => address) private _refsUsers;
    mapping(address => mapping(address => uint256)) private _refsBalances;

    /**
     * @notice Emitted when the state of the token sale is updated.
     * @param state The new state of the token sale.
     */
    event StateUpdated(State state);

    /**
     * @notice Emitted when a new sale round starts.
     * @param round The index of the sale round that has started.
     */
    event SaleRoundStarted(uint256 indexed round);

    /**
     * @notice Emitted when a sale round ends.
     * @param round The index of the sale round that has ended.
     */
    event SaleRoundEnded(uint256 indexed round);

    /**
     * @notice Emitted when a new sale round is configured.
     * @param price The price per token.
     * @param supply The total supply of tokens for the round.
     */
    event SaleRoundConfigured(uint256 price, uint256 supply);

    /**
     * @notice Emitted when the pricing of a sale round is adjusted.
     * @param round The index of the sale round.
     * @param price The new price per token.
     */
    event SaleRoundPricingAdjusted(uint256 indexed round, uint256 price);

    /**
     * @notice Emitted when the token supply for a sale round is adjusted.
     * @param round The index of the sale round.
     * @param supply The new total supply for the round.
     */
    event SaleRoundSupplyAdjusted(uint256 indexed round, uint256 supply);

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
     * @notice Emitted when the authorization threshold for participants is updated.
     * @param limit The new authorization limit.
     */
    event AuthorizationThresholdUpdated(uint256 limit);

    /**
     * @notice Emitted when a user's authorization status is updated.
     * @param user The address of the user.
     * @param value The new authorization value (true for authorized, false for not authorized).
     */
    event AuthUserUpdated(address indexed user, bool value);

    /**
     * @notice Emitted when the maximum contribution limit is updated.
     * @param amount The new maximum contribution limit.
     */
    event MaxUpdated(uint256 amount);

    /**
     * @notice Emitted when the minimum contribution limit is updated.
     * @param amount The new minimum contribution limit.
     */
    event MinUpdated(uint256 amount);

    /**
     * @notice Emitted when the funds management wallet address is updated.
     * @param fundsManagementWallet The new funds management wallet address.
     */
    event FundsManagementWalletUpdated(address indexed fundsManagementWallet);

    /**
     * @notice Emitted when referral rates are configured.
     * @param primaryRefRate The primary referral rate.
     * @param secondaryRefRate The secondary referral rate.
     */
    event ReferralRatesConfigured(uint256 primaryRefRate, uint256 secondaryRefRate);

    /**
     * @notice Emitted when a new referral account is initialized.
     * @param ref The address of the referral.
     * @param primaryRefRate The primary referral rate for this account.
     * @param secondaryRefRate The secondary referral rate for this account.
     */
    event ReferralAccountInitialized(address indexed ref, uint256 primaryRefRate, uint256 secondaryRefRate);

    /**
     * @notice Emitted when a referral account is enabled.
     * @param ref The address of the referral account that was enabled.
     */
    event ReferralEnabled(address indexed ref);

    /**
     * @notice Emitted when a referral account is disabled.
     * @param ref The address of the referral account that was disabled.
     */
    event ReferralDisabled(address indexed ref);

    /**
     * @notice Emitted when referral rewards are claimed.
     * @param ref The address of the referral claiming the rewards.
     * @param token The token in which the rewards are claimed.
     * @param amount The amount of rewards claimed.
     */
    event ReferralRewardsClaimed(address indexed ref, address indexed token, uint256 amount);

    /**
     * @notice Thrown when an operation is attempted with invalid parameters.
     */
    error ErrInvalidParameters();

    /**
     * @notice Thrown when an operation is attempted to start a sale that has already been started.
     */
    error ErrSaleAlreadyStarted();

    /**
     * @notice Thrown when an operation is attempted on a sale that is not active.
     */
    error ErrSaleNotActive();

    /**
     * @notice Thrown when a zero address is used where a valid address is required.
     */
    error ErrNullAddress();

    /**
     * @notice Thrown when a specified sale round does not exist.
     * @param index_ The index of the sale round.
     */
    error ErrUndefinedSaleRound(uint256 index_);

    /**
     * @notice Thrown when an operation is attempted on a sale round that has already started.
     * @param index_ The index of the sale round.
     */
    error ErrRoundStarted(uint256 index_);

    /**
     * @notice Thrown when an operation is attempted on a sale round that has already ended.
     * @param index_ The index of the sale round.
     */
    error ErrRoundEnded(uint256 index_);

    /**
     * @notice Thrown when there is insufficient supply in a sale round for an operation.
     * @param index_ The index of the sale round.
     */
    error ErrInsufficientRoundSupply(uint256 index_);

    /**
     * @notice Thrown when the amount provided is below the required minimum.
     * @param amount_ The amount provided.
     * @param min_ The minimum required amount.
     */
    error ErrMin(uint256 amount_, uint256 min_);

    /**
     * @notice Thrown when the amount provided exceeds the allowed maximum.
     * @param amount_ The amount provided.
     * @param max_ The maximum allowed amount.
     */
    error ErrMax(uint256 amount_, uint256 max_);

    /**
     * @notice Thrown when the authorization limit is set outside the allowed range.
     * @param limit_ The authorization limit.
     * @param min_ The minimum allowed limit.
     * @param max_ The maximum allowed limit.
     */
    error ErrAuthLimitOutsideAllowedRange(uint256 limit_, uint256 min_, uint256 max_);

    /**
     * @notice Thrown when the total of referral rates exceeds the limit of 100%.
     * @param rates_ The total referral rates.
     */
    error ErrReferralRatesExceedLimit(uint256 rates_);

    /**
     * @notice Thrown when an undefined referral account is referenced.
     * @param ref_ The referral account address.
     */
    error ErrUndefinedReferralAccount(address ref_);

    /**
     * @notice Thrown when trying to enable an already enabled referral account.
     * @param ref_ The referral account address.
     */
    error ErrReferralAlreadyEnabled(address ref_);

    /**
     * @notice Thrown when trying to disable a referral account that is not enabled.
     * @param ref_ The referral account address.
     */
    error ErrReferralNotEnabled(address ref_);

    /**
     * @notice Thrown when an empty list of tokens is used where it is not permitted.
     */
    error ErrEmptyTokenList();

    /**
     * @notice Thrown when a transfer of funds fails.
     */
    error ErrTransferFailure();

    /**
     * @notice Initializes the TokenSaleRegistry with the specified funds management wallet.
     * @param fundsManagementWallet_ The wallet that will manage the funds collected from token sales. Must be a non-zero address.
     * @dev Sets up the initial admin and operator roles and assigns them to the message sender. Ensures that the contract starts
     * in a predictable state.
     */
    constructor(address fundsManagementWallet_) {
        if (fundsManagementWallet_ == address(0)) {
            revert ErrNullAddress();
        }
        _fundsManagementWallet = fundsManagementWallet_;

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(OPERATOR_ROLE, _msgSender());
    }

    /**
     * @notice Activates the token sale, allowing rounds to be configured and started.
     * @dev Transitions the contract state from 'Reset' to 'Started'. This change is crucial as it permits the creation and management
     * of sale rounds.
     * Reverts if attempting to activate when already active to prevent reinitialization of the sale process.
     * Emits a {StateUpdated} event on success.
     */
    function activateSale() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_state != State.Reset) {
            revert ErrSaleAlreadyStarted();
        }
        _state = State.Started;

        emit StateUpdated(_state);
    }

    /**
     * @notice Deactivates the token sale, preventing any new rounds from starting.
     * @dev Sets the contract state to `Ended`. Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * Reverts if the contract is already inactive.
     * Emits a {StateUpdated} event on success.
     */
    function deactivateSale() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!isActive()) {
            revert ErrSaleNotActive();
        }
        _state = State.Ended;

        emit StateUpdated(_state);
    }

    /**
     * @notice Configures a new sale round with specified prices and supply.
     * @dev Adds a new `Round` to the `_rounds` array with `Reset` state. Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * Reverts if the sale is not active.
     * @param price_ The price for the 'SNOVA token.
     * @param supply_ The total token supply for the round.
     * Emits a {SaleRoundConfigured} event on success.
     */
    function configureSaleRound(uint256 price_, uint256 supply_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (isInactive()) {
            revert ErrSaleNotActive();
        }
        _rounds.push(Round({defined: true, state: State.Reset, price: price_, sold: 0, supply: supply_}));

        emit SaleRoundConfigured(price_, supply_);
    }

    /**
     * @notice Sets the referral rates for primary and secondary referrals.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. Rates are expressed in tenths of a percent (i.e., 10 equals 1%).
     * @param primaryRefRate_ The referral rate for primary referrals, determining the percentage of the sale amount credited as a reward.
     * @param secondaryRefRate_ The referral rate for secondary referrals, used to calculate secondary rewards based on the sale amount.
     * Emits a {ReferralRatesConfigured} event on success.
     */
    function configureReferralRates(
        uint256 primaryRefRate_,
        uint256 secondaryRefRate_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (isInactive()) {
            revert ErrSaleNotActive();
        }
        uint256 refRatesSum = primaryRefRate_ + secondaryRefRate_;
        if (refRatesSum > 1000) {
            revert ErrReferralRatesExceedLimit(refRatesSum);
        }
        _primaryRefRate = primaryRefRate_;
        _secondaryRefRate = secondaryRefRate_;

        emit ReferralRatesConfigured(_primaryRefRate, _secondaryRefRate);
    }

    /**
     * @notice Initializes referral accounts with specific primary and secondary referral rates.
     * @dev Configures each referral account provided in the `refs_` array with rates specified in `primaryRefRate_` and `secondaryRefRate_` arrays.
     *      This method should be used carefully as it directly affects the incentives structure.
     * @param refs_ Array of addresses to be set up as referral accounts.
     * @param primaryRefRate_ Array of primary referral rates corresponding to each address in `refs_`.
     * @param secondaryRefRate_ Array of secondary referral rates corresponding to each address in `refs_`.
     * Emits a {ReferralAccountInitialized} event for each referral account on success.
     */
    function initializeReferralAccounts(
        address[] calldata refs_,
        uint256[] calldata primaryRefRate_,
        uint256[] calldata secondaryRefRate_
    ) external onlyRole(OPERATOR_ROLE) {
        if (isInactive()) {
            revert ErrSaleNotActive();
        }
        if (refs_.length != primaryRefRate_.length || refs_.length != secondaryRefRate_.length) {
            revert ErrInvalidParameters();
        }
        for (uint256 index = 0; index < refs_.length; index++) {
            _refs[refs_[index]] = Referral({
                defined: true,
                enabled: true,
                primaryRefRate: primaryRefRate_[index],
                secondaryRefRate: secondaryRefRate_[index]
            });

            emit ReferralAccountInitialized(refs_[index], primaryRefRate_[index], secondaryRefRate_[index]);
        }
    }

    /**
     * @notice Adjusts the pricing for a specific sale round.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. The round must exist and be in the `Reset` state.
     * @param index_ The index of the sale round to adjust.
     * @param price_ The new investment price.
     * Reverts if the sale is not active, the round does not exist, or the round is not in the `Reset` state.
     * Emits a {SaleRoundPricingAdjusted} event on success.
     */
    function adjustRoundPricing(uint256 index_, uint256 price_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (isInactive()) {
            revert ErrSaleNotActive();
        }
        if (!_rounds[index_].defined) {
            revert ErrUndefinedSaleRound(index_);
        }
        if (_rounds[index_].state != State.Reset) {
            revert ErrRoundStarted(index_);
        }
        _rounds[index_].price = price_;

        emit SaleRoundPricingAdjusted(index_, price_);
    }

    /**
     * @notice Adjusts the supply for a specific sale round.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. The round must exist and cannot be in the `Ended` state.
     * @param index_ The index of the sale round to adjust.
     * @param supply_ The new supply for the round.
     * Reverts if the sale is not active, the round does not exist, or the round is in the `Ended` state.
     * Emits a {SaleRoundSupplyAdjusted} event on success.
     */
    function adjustRoundSupply(uint256 index_, uint256 supply_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (isInactive()) {
            revert ErrSaleNotActive();
        }
        if (!_rounds[index_].defined) {
            revert ErrUndefinedSaleRound(index_);
        }
        if (_rounds[index_].state == State.Ended) {
            revert ErrRoundEnded(index_);
        }
        if (_rounds[index_].sold > supply_) {
            revert ErrInsufficientRoundSupply(index_);
        }
        _rounds[index_].supply = supply_;

        emit SaleRoundSupplyAdjusted(index_, supply_);
    }

    /**
     * @notice Starts a specific sale round, allowing tokens to be sold.
     * @dev Can only be called by an account with the `OPERATOR_ROLE`. The round must exist and be in the `Reset` state.
     * @param index_ The index of the sale round to start.
     * Reverts if the sale is not active, the round does not exist, or the round is not in the `Reset` state.
     * Emits a {SaleRoundStarted} event on success.
     */
    function startSaleRound(uint256 index_) external onlyRole(OPERATOR_ROLE) {
        if (!isActive()) {
            revert ErrSaleNotActive();
        }
        if (!_rounds[index_].defined) {
            revert ErrUndefinedSaleRound(index_);
        }
        if (_rounds[index_].state != State.Reset) {
            revert ErrRoundStarted(index_);
        }
        if (_rounds[_currentRound].state == State.Started) {
            _rounds[_currentRound].state = State.Ended;
        }
        _rounds[index_].state = State.Started;
        _currentRound = index_;

        emit SaleRoundStarted(index_);
    }

    /**
     * @notice Ends a specific sale round, stopping any further token sales.
     * @dev Can only be called by an account with the `OPERATOR_ROLE`. The round must exist and be in the `Started` state.
     * @param index_ The index of the sale round to end.
     * Reverts if the round does not exist or is not in the `Started` state.
     * Emits a {SaleRoundEnded} event on success.
     */
    function endSaleRound(uint256 index_) external onlyRole(OPERATOR_ROLE) {
        if (!_rounds[index_].defined) {
            revert ErrUndefinedSaleRound(index_);
        }
        if (_rounds[index_].state != State.Started) {
            revert ErrRoundEnded(index_);
        }
        _rounds[index_].state = State.Ended;

        emit SaleRoundEnded(index_);
    }

    /**
     * @notice Authorizes or deauthorizes a participant for the token sale.
     * @dev Can only be called by an account with the `OPERATOR_ROLE`.
     * @param user_ The address of the participant to authorize or deauthorize.
     * @param value_ A boolean where `true` authorizes the participant and `false` deauthorizes them.
     * Emits an {AuthUserUpdated} event on success.
     */
    function authorizeParticipant(address user_, bool value_) external onlyRole(OPERATOR_ROLE) {
        _auth[user_] = value_;

        emit AuthUserUpdated(user_, value_);
    }

    /**
     * @notice Batch authorizes or deauthorizes participants for the token sale.
     * @dev Can only be called by an account with the `OPERATOR_ROLE`.
     * @param users_ The addresses of the participants to authorize or deauthorize.
     * @param values_ An array of booleans where `true` authorizes and `false` deauthorizes the corresponding participant.
     * Reverts if the length of `users_` and `values_` arrays do not match.
     * Emits an {AuthUserUpdated} event for each participant on success.
     */

    function batchAuthorizeParticipants(
        address[] calldata users_,
        bool[] calldata values_
    ) external onlyRole(OPERATOR_ROLE) {
        if (users_.length != values_.length) {
            revert ErrInvalidParameters();
        }
        for (uint256 index = 0; index < users_.length; index++) {
            _auth[users_[index]] = values_[index];

            emit AuthUserUpdated(users_[index], values_[index]);
        }
    }

    /**
     * @notice Updates the maximum allocation allowed per participant.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * @param amount_ The new maximum allocation amount.
     * Reverts if `amount_` is greater than `MAX_ALLOCATION` or less than the current minimum contribution limit.
     * Emits a {MaxUpdated} event on success.
     */
    function updateMaximumAllocation(uint256 amount_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount_ > MAX_ALLOCATION) {
            revert ErrMax(amount_, MAX_ALLOCATION);
        }
        if (amount_ < _min) {
            revert ErrMin(amount_, _min);
        }
        _max = amount_;

        emit MaxUpdated(_max);
    }

    /**
     * @notice Updates the minimum contribution required to participate in the sale.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * @param amount_ The new minimum contribution amount.
     * Reverts if `amount_` is less than `MIN_CONTRIBUTION` or greater than the current maximum allocation limit.
     * Emits a {MinUpdated} event on success.
     */

    function updateMinimumContribution(uint256 amount_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount_ < MIN_CONTRIBUTION) {
            revert ErrMin(amount_, MIN_CONTRIBUTION);
        }
        if (amount_ > _max) {
            revert ErrMax(amount_, _max);
        }
        _min = amount_;

        emit MinUpdated(_min);
    }

    /**
     * @notice Sets the threshold for which participants are automatically authorized.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * @param amount_ The new authorization threshold amount.
     * Reverts if `amount_` is not within the bounds of the minimum and maximum contribution limits.
     * Emits an {AuthorizationThresholdUpdated} event on success.
     */
    function updateAuthorizationThreshold(uint256 amount_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_min > amount_ || amount_ > _max) {
            revert ErrAuthLimitOutsideAllowedRange(amount_, _min, _max);
        }
        _authLimit = amount_;

        emit AuthorizationThresholdUpdated(amount_);
    }

    /**
     * @notice Updates the wallet address used for managing funds collected from the sale.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * @param fundsManagementWallet_ The new funds management wallet address.
     * Reverts if `fundsManagementWallet_` is the zero address.
     * Emits a {FundsManagementWalletUpdated} event on success.
     */
    function updateFundsWallet(address fundsManagementWallet_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (fundsManagementWallet_ == address(0)) {
            revert ErrNullAddress();
        }
        _fundsManagementWallet = fundsManagementWallet_;

        emit FundsManagementWalletUpdated(fundsManagementWallet_);
    }

    /**
     * @notice Processes and records a sale transaction, distributing rewards if applicable.
     * @dev This function can only be called by an account with the `OPERATOR_ROLE`. It handles the processing of sales,
     * updates the total sold amount, participant's funds, and manages referral rewards if a valid referral is provided.
     * Refactoring involves separate functions for processing sales, recording, and updating referrals.
     * @param user_ The address of the user participating in the sale.
     * @param token_ The token in which the sale is conducted.
     * @param amount_ The amount of funds involved in the transaction.
     * @param sold_ The amount of tokens sold in this transaction.
     * @param ref_ The referral's address, if any.
     * @param primaryReward_ The 'SNOVA' reward amount for the referral.
     * @param secondaryReward_ The COIN reward amount based on the sale amount.
     */
    function processAndRecordSale(
        address user_,
        address token_,
        uint256 amount_,
        uint256 sold_,
        address ref_,
        uint256 primaryReward_,
        uint256 secondaryReward_
    ) external onlyRole(OPERATOR_ROLE) {
        processSale(user_, amount_, sold_);
        recordReferral(ref_);

        if (ref_ != address(0)) {
            updateReferralRewards(ref_, token_, primaryReward_, secondaryReward_);
        }
        _refsUsers[user_] = ref_;
    }

    /**
     * @notice Enables a referral account, allowing it to receive referral rewards.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. Marks a referral as enabled.
     * @param ref_ The address of the referral account to enable.
     * Reverts if the referral account is already enabled or undefined.
     * Emits a {ReferralEnabled} event upon success.
     */
    function enableReferral(address ref_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_refs[ref_].defined) {
            revert ErrUndefinedReferralAccount(ref_);
        }
        if (_refs[ref_].enabled) {
            revert ErrReferralAlreadyEnabled(ref_);
        }
        _refs[ref_].enabled = true;

        emit ReferralEnabled(ref_);
    }

    /**
     * @notice Disables a referral account, preventing it from receiving further referral rewards.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. Marks a referral as disabled.
     * @param ref_ The address of the referral account to disable.
     * Reverts if the referral account is already disabled or undefined.
     * Emits a {ReferralDisabled} event upon success.
     */
    function disableReferral(address ref_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_refs[ref_].defined) {
            revert ErrUndefinedReferralAccount(ref_);
        }
        if (!_refs[ref_].enabled) {
            revert ErrReferralNotEnabled(ref_);
        }
        _refs[ref_].enabled = false;

        emit ReferralDisabled(ref_);
    }

    /**
     * @notice Allows referral accounts to claim their accrued rewards for specified tokens.
     * @dev Can only be executed by the referral account itself. It transfers the accrued rewards for each token specified in the `tokens_` array.
     * @param tokens_ An array of token addresses for which to claim rewards.
     * Reverts if the caller has no rewards to claim for a specified token or if the referral account is not enabled.
     * Emits a {ReferralRewardsClaimed} event for each token with rewards being claimed.
     */
    function claimRef(address[] calldata tokens_) external nonReentrant {
        address ref_ = _msgSender();
        if (tokens_.length == 0) {
            revert ErrEmptyTokenList();
        }
        if (!_refs[ref_].defined) {
            revert ErrUndefinedReferralAccount(ref_);
        }
        if (!_refs[ref_].enabled) {
            revert ErrReferralNotEnabled(ref_);
        }

        for (uint256 i = 0; i < tokens_.length; i++) {
            address token = tokens_[i];
            uint256 balance = _refsBalances[ref_][token];
            if (balance == 0) {
                continue;
            }

            bool transferSuccess = false;
            if (token == NATIVE_CURRENCY_ADDRESS) {
                (bool success, ) = ref_.call{value: balance}("");
                transferSuccess = success;
            } else {
                bytes memory data = abi.encodeWithSelector(IERC20(token).transfer.selector, ref_, balance);
                (bool success, bytes memory returnData) = token.call(data);
                transferSuccess = success && (returnData.length == 0 || abi.decode(returnData, (bool)));
            }

            if (!transferSuccess) {
                revert ErrTransferFailure();
            }

            _refsBalances[ref_][token] = 0;

            emit ReferralRewardsClaimed(ref_, token, balance);
        }
    }

    /**
     * @notice Retrieves native currency sent to the contract.
     * @dev Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
     * @notice Requires successful transfer to the caller.
     * Emits a {NativeCurrencyRetrieved} event on successful retrieval.
     */
    function retrieveNativeCurrency() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        (bool success, ) = _msgSender().call{value: balance}("");
        if (!success) {
            revert ErrTransferFailure();
        }
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
     * @notice Returns the address of the funds management wallet.
     * @dev Getter function for the address where the funds collected from the sales are managed.
     * @return The address of the funds management wallet.
     */
    function getFundsWallet() external view returns (address) {
        return _fundsManagementWallet;
    }

    /**
     * @notice Retrieves the maximum allowed allocation per participant in the token sale.
     * @dev This getter function provides the maximum amount a participant can contribute to the token sale.
     * @return The maximum allocation amount in the token sale's currency.
     */
    function getMax() external view returns (uint256) {
        return _max;
    }

    /**
     * @notice Retrieves the minimum required contribution for participating in the token sale.
     * @dev This getter function provides the minimum amount required to participate in the token sale.
     * @return The minimum contribution amount in the token sale's currency.
     */
    function getMin() external view returns (uint256) {
        return _min;
    }

    /**
     * @notice Returns the total number of sale rounds configured in the contract.
     * @dev Provides a count of how many rounds have been added to the sale, regardless of their state.
     * @return The total number of sale rounds.
     */
    function getRoundsCount() external view returns (uint256) {
        return _rounds.length;
    }

    /**
     * @notice Retrieves the identifier of the currently active sale round.
     * @dev This function provides the index of the currently active round. Rounds are indexed starting from 0.
     * @return The index of the currently active sale round.
     */
    function getCurrentRound() external view returns (uint256) {
        return _currentRound;
    }

    /**
     * @notice Provides detailed information about a specific sale round.
     * @dev Fetches round data, including prices and state, based on the round index provided.
     * @param index_ The index of the sale round to retrieve information for.
     * @return A `Round` struct containing details about the specified sale round.
     * Reverts if the round index is out of bounds.
     */
    function getRound(uint256 index_) external view returns (Round memory) {
        return _rounds[index_];
    }

    /**
     * @notice Retrieves the total amount of tokens sold across all rounds.
     * @dev Sums up the total tokens sold in all rounds to give a cumulative figure.
     * @return The total amount of tokens sold in the token sale.
     */
    function getTotalSold() external view returns (uint256) {
        return _totalSold;
    }

    /**
     * @notice Checks the amount of tokens a user has purchased in a specific sale round.
     * @dev Provides the number of tokens a given user has bought in a particular round.
     * @param user_ The address of the user.
     * @param round_ The index of the sale round.
     * @return The number of tokens purchased by the user in the specified round.
     */
    function balanceOf(address user_, uint256 round_) external view returns (uint256) {
        return _balances[user_][round_];
    }

    /**
     * @notice Retrieves the referral rewards balance for a user in a specific token.
     * @dev Indicates how much of a particular token a user has earned as referral rewards.
     * @param user_ The address of the user or referral.
     * @param token_ The token for which the referral balance is queried.
     * @return The referral rewards balance for the user in the specified token.
     */
    function refBalanceOf(address user_, address token_) external view returns (uint256) {
        return _refsBalances[user_][token_];
    }

    /**
     * @notice Calculates the remaining allocation a user is allowed to contribute.
     * @dev Determines how much more a user can contribute based on their current contributions and the authorization limit.
     * @param user_ The address of the user.
     * @return The remaining amount the user is allowed to contribute.
     */
    function limitOf(address user_) external view returns (uint256) {
        uint256 amount = _funds[user_];
        uint256 limit = _authLimit;
        if (isAuth(user_)) {
            limit = _max;
        }
        return amount < limit ? limit - amount : 0;
    }

    /**
     * @notice Calculates the maximum limit a user can contribute based on their current contributions.
     * @dev Determines the maximum amount a user is still allowed to contribute towards the sale.
     * @param user_ The address of the participant.
     * @return The maximum remaining contribution amount for the user.
     */
    function maxLimitOf(address user_) external view returns (uint256) {
        uint256 amount = _funds[user_];
        return amount < _max ? _max - amount : 0;
    }

    /**
     * @notice Retrieves the total amount of funds a user has contributed to the sale.
     * @dev Provides the cumulative contribution amount of a user across all sale rounds.
     * @param user_ The address of the user.
     * @return The total contribution amount of the user in the token sale's currency.
     */
    function getFundsOfUser(address user_) external view returns (uint256) {
        return _funds[user_];
    }

    /**
     * @notice Returns the authorization limit for participants.
     * @dev Provides the threshold above which users need special authorization to contribute.
     * @return The authorization limit for contributions.
     */
    function getAuthLimit() external view returns (uint256) {
        return _authLimit;
    }

    /**
     * @notice Retrieves global referral rates for the sale.
     * @dev Provides the default referral rates applied to all referrals unless overridden.
     * @return The primary and secondary referral rates.
     */
    function getGlobalRefRates() external view returns (uint256, uint256) {
        return (_primaryRefRate, _secondaryRefRate);
    }

    /**
     * @notice Determines the referral associated with a user or transaction.
     * @dev Identifies the referral, if any, responsible for a user's participation in the sale.
     * @param user_ The address of the user whose referral is to be identified.
     * @param ref_ A potential referral address provided by the user.
     * @return The address of the referral, if valid and enabled; otherwise, the zero address.
     */
    function getRef(address user_, address ref_) external view returns (address) {
        Referral memory ref = _refs[_refsUsers[user_]];
        if (ref.defined && ref.enabled) {
            return _refsUsers[user_];
        }
        ref = _refs[ref_];
        if (!ref.defined || ref.enabled) {
            return ref_;
        }
        return address(0);
    }

    /**
     * @notice Provides the detailed referral structure for a given referral account.
     * @dev Fetches detailed referral information, including rates and enabled status.
     * @param user_ The address of the referral account.
     * @return The `Referral` struct containing detailed information about the referral.
     */
    function getReferralStruct(address user_) external view returns (Referral memory) {
        return _refs[user_];
    }

    /**
     * @notice Retrieves the referral rates for a specific referral account.
     * @dev Provides the custom referral rates set for a specific referral, if defined; otherwise, returns the global rates.
     * @param ref_ The address of the referral account.
     * @return The primary and secondary referral rates for the specified account.
     */
    function getRefRates(address ref_) external view returns (uint256, uint256) {
        Referral memory ref = _refs[ref_];
        if (ref.defined) {
            return (Math.max(ref.primaryRefRate, _primaryRefRate), Math.max(ref.secondaryRefRate, _secondaryRefRate));
        }
        return (_primaryRefRate, _secondaryRefRate);
    }

    /**
     * @notice Checks if the token sale is currently active.
     * @dev Utility function to determine if the sale is in the `Started` state.
     * @return `true` if the sale is active, `false` otherwise.
     */
    function isActive() public view returns (bool) {
        return _state == State.Started;
    }

    /**
     * @notice Checks if the token sale is currently inactive or ended.
     * @dev Utility function to determine if the sale is in the `Ended` state.
     * @return `true` if the sale is inactive, `false` otherwise.
     */
    function isInactive() public view returns (bool) {
        return _state == State.Ended;
    }

    /**
     * @notice Retrieves the sale price for tokens.
     * @dev Provides the price for the currently active round.
     * @return The sale price per token for the currently active round.
     */
    function getPrice() public view returns (uint256) {
        if (_rounds[_currentRound].state == State.Started) {
            return _rounds[_currentRound].price;
        }
        return 0;
    }

    /**
     * @notice Checks if a user is authorized for '_max' contributions.
     * @dev Determines if a user has been marked as authorized to bypass the standard contribution limit.
     * @param user_ The address of the user to check.
     * @return `true` if the user is authorized, `false` otherwise.
     */
    function isAuth(address user_) public view returns (bool) {
        return _auth[user_];
    }

    /**
     * @dev Updates the internal accounting for the sale, including total funds received and tokens sold.
     * @param user_ The address of the user participating in the sale.
     * @param amount_ The amount of funds involved in the transaction.
     * @param sold_ The amount of tokens sold in this transaction.
     */
    function processSale(address user_, uint256 amount_, uint256 sold_) private {
        _funds[user_] += amount_;
        _totalSold += sold_;
        _rounds[_currentRound].sold += sold_;
        _balances[user_][_currentRound] += sold_;
    }

    /**
     * @dev Updates the referral rewards balances for the given referral.
     * @param ref_ The address of the referral.
     * @param token_ The token in which the sale is conducted.
     * @param primaryReward_ The 'SNOVA' reward amount for the referral.
     * @param secondaryReward_ The COIN reward amount based on the sale amount.
     */
    function updateReferralRewards(
        address ref_,
        address token_,
        uint256 primaryReward_,
        uint256 secondaryReward_
    ) private {
        _refsBalances[ref_][token_] += primaryReward_;
        _refsBalances[ref_][TOKEN] += secondaryReward_;
    }

    /**
     * @dev Handles referral initialization and updates the referral tracking if applicable.
     * @param ref_ The referral's address, if any.
     */
    function recordReferral(address ref_) private {
        if (ref_ != address(0) && !_refs[ref_].defined) {
            _refs[ref_].defined = true;
            _refs[ref_].enabled = true;
            emit ReferralAccountInitialized(ref_, _primaryRefRate, _secondaryRefRate);
        }
    }

    /**
     * @dev Fallback function to allow the contract to receive Ether directly.
     */
    receive() external payable {}
}
