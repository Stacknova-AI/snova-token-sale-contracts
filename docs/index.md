# Solidity API

## PresaleSNOVA

_Manages the pre-sale phase of SNOVA tokens, incorporating price feeds for dynamic pricing and allowing for contributions
in the native currency and other stablecoins (USDT, USDC, DAI). This contract leverages the OpenZeppelin library for role management,
token safety, reentrancy checks, and operational controls (pause/unpause). It is closely tied to the TokenSaleRegistry, from which
it retrieves information about token sale rounds and referral incentives, ensuring consistent and secure transaction processing.

Key functionalities include token purchasing, token and native currency recovery, and configuration of operational parameters._

### PURCHASE_AGENT_ROLE

```solidity
bytes32 PURCHASE_AGENT_ROLE
```

### NATIVE_CURRENCY_ADDRESS

```solidity
address NATIVE_CURRENCY_ADDRESS
```

### Currency

```solidity
struct Currency {
  contract AggregatorV3Interface priceFeed;
  uint256 decimals;
  bool useStaticPrice;
  uint256 totalCollected;
}
```

### PriceThresholdUpdated

```solidity
event PriceThresholdUpdated(uint256 priceFeedTimeThreshold)
```

Emitted when the price threshold time is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeedTimeThreshold | uint256 | New threshold in seconds for price feed update times. |

### Erc20Recovered

```solidity
event Erc20Recovered(address token, uint256 amount)
```

Emitted when ERC20 tokens are recovered from the contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token recovered. |
| amount | uint256 | The amount of tokens recovered. |

### CoinRecovered

```solidity
event CoinRecovered(uint256 amount)
```

Emitted when native currency is recovered from the contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of native currency recovered. |

### TokensPurchased

```solidity
event TokensPurchased(address user, address ref, uint256 amount, uint256 price, uint256 sold, uint256 round, uint256 investmentUSD, int256 currencyPrice, uint256 novaPoints)
```

Emitted when tokens are purchased during the pre-sale.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user who purchased the tokens. |
| ref | address | The referral address provided. |
| amount | uint256 | The amount of native currency used for the purchase. |
| price | uint256 | The price of the token at the moment of purchase. |
| sold | uint256 | The number of tokens sold in the transaction. |
| round | uint256 | The current round of the sale during which the purchase was made. |
| investmentUSD | uint256 | The amount the user invested in USD. |
| currencyPrice | int256 | The price of the currency during the purchase. |
| novaPoints | uint256 | The number of Nova Points awarded. |

### NovaPointsAwarded

```solidity
event NovaPointsAwarded(address user, uint256 points)
```

Emitted when Nova Points are awarded to a user or referrer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user receiving the Nova Points. |
| points | uint256 | The number of Nova Points awarded. |

### ReferralRegistered

```solidity
event ReferralRegistered(address referrer)
```

Emitted when a referral is registered.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| referrer | address | The address of the referrer. |

### ErrCurrencyNotWhitelisted

```solidity
error ErrCurrencyNotWhitelisted()
```

Thrown when trying to purchase with a currency that is not whitelisted.

### ErrSaleNotActive

```solidity
error ErrSaleNotActive()
```

Thrown when attempting an operation while the sale is not active.

### ErrRoundClosed

```solidity
error ErrRoundClosed()
```

Thrown when attempting to interact with a sale round that is closed.

### ErrNullAddress

```solidity
error ErrNullAddress()
```

Thrown when a null address is provided where a valid address is required.

### ErrAmountValidation

```solidity
error ErrAmountValidation()
```

Thrown when the `amount_` parameter is not 0 for native currency purchases.

### ErrValueValidation

```solidity
error ErrValueValidation()
```

Thrown when `msg.value` is not 0 for ERC20 token purchases.

### ErrInvalidPriceThreshold

```solidity
error ErrInvalidPriceThreshold()
```

Thrown when the price threshold is set to an invalid value.

### ErrRoundAllocation

```solidity
error ErrRoundAllocation()
```

Thrown when an allocation error occurs in a sale round due to supply limits.

### ErrPriceThreshold

```solidity
error ErrPriceThreshold()
```

Thrown when the price feed update is beyond the acceptable time threshold.

### ErrUserNullAddress

```solidity
error ErrUserNullAddress()
```

Thrown when a user address provided is a null address.

### ErrAmountZero

```solidity
error ErrAmountZero()
```

Thrown when the native currency amount for a purchase is zero.

### ErrReferral

```solidity
error ErrReferral()
```

Thrown when an invalid referral is used.

### ErrTransferFailure

```solidity
error ErrTransferFailure()
```

Thrown when a transfer of funds fails.

### ErrMin

```solidity
error ErrMin(uint256 amount_, uint256 min_)
```

Thrown when the amount provided is below the minimum required.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount_ | uint256 | The amount provided. |
| min_ | uint256 | The minimum required amount. |

### ErrMax

```solidity
error ErrMax(uint256 amount_, uint256 max_)
```

Thrown when the amount provided exceeds the maximum allowed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount_ | uint256 | The amount provided. |
| max_ | uint256 | The maximum allowed amount. |

### constructor

```solidity
constructor(address payable storage_, uint256 priceThresholdSeconds_) public
```

Initializes a new PresaleSNOVA contract with necessary configuration.

_Sets up roles, price feed interface, and initial thresholds.
Assigns the DEFAULT_ADMIN_ROLE to the deployer, ensuring control over critical functions._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| storage_ | address payable | Address of the TokenSaleRegistry, storing sale rounds and referral details. |
| priceThresholdSeconds_ | uint256 | Time threshold to validate the recency of price updates. |

### addCurrency

```solidity
function addCurrency(address tokenAddress_, address priceFeed_, uint256 decimals_, bool useStaticPrice_) external
```

Adds a new currency and its associated price feed.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenAddress_ | address | The address of the ERC20 token. |
| priceFeed_ | address | The address of the new price feed, or zero address for static price. |
| decimals_ | uint256 | The decimals used by the currency. |
| useStaticPrice_ | bool | If true, use a static price of $1 instead of a price feed. |

### _addCurrency

```solidity
function _addCurrency(address tokenAddress_, address priceFeed_, uint256 decimals_, bool useStaticPrice_) internal
```

### pause

```solidity
function pause() external
```

Pauses the contract, preventing operations like token purchase.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

### unpause

```solidity
function unpause() external
```

Unpauses the contract, allowing operations like token purchase to resume.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

### purchaseTokens

```solidity
function purchaseTokens(address ref_, address tokenAddress_, uint256 amount_) external payable
```

Purchases tokens using the specified currency directly sent to the contract.
Reverts if the currency is not whitelisted, the sale is not active, or the round is closed.

_This public function allows any user to purchase tokens when the contract is not paused. It retrieves the
current round details from TokenSaleRegistry, verifies token availability and round status, and calculates the number
of tokens purchasable with the provided currency amount._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref_ | address | Optional referral address provided by the user to potentially earn referral bonuses. |
| tokenAddress_ | address | The address of the ERC20 token used for purchase, or zero address for native currency. |
| amount_ | uint256 | The amount of currency to be used for purchase. For native currency, this should be 0 as `msg.value` is used. |

### purchaseTokensFor

```solidity
function purchaseTokensFor(address user_, address ref_, address tokenAddress_, uint256 amount_) external payable
```

Enables a designated purchase agent to buy tokens on behalf of another user using the specified currency sent with the transaction.
This action must comply with the terms set for the current sale round in the TokenSaleRegistry.
Reverts if the currency is not whitelisted, the sale is not active, or the round is closed.

_This function can be invoked by any user possessing the `PURCHASE_AGENT_ROLE` when the contract is not paused.
It is designed to facilitate purchases where the actual buyer cannot interact directly with the contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user for whom the tokens are being purchased. |
| ref_ | address | Optional referral address provided to potentially earn referral bonuses. |
| tokenAddress_ | address | The address of the ERC20 token used for purchase, or zero address for native currency. |
| amount_ | uint256 | The amount of currency to be used for purchase. For native currency, this should be 0 as `msg.value` is used. |

### setPriceThreshold

```solidity
function setPriceThreshold(uint256 priceThresholdSeconds_) external
```

Updates the time threshold for considering the price feed valid.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceThresholdSeconds_ | uint256 | The new time threshold in seconds. Emits a {PriceThresholdUpdated} event on successful update. |

### recoverCoin

```solidity
function recoverCoin() external
```

Recovers native currency sent to the contract.
Requires successful transfer to the caller.
Emits a {CoinRecovered} event on successful recovery.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

### recoverErc20

```solidity
function recoverErc20(address token_, uint256 amount_) external
```

Recovers ERC20 tokens sent to the contract.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token_ | address | The address of the ERC20 token to recover. |
| amount_ | uint256 | The amount of tokens to recover. Emits an {Erc20Recovered} event on successful recovery. |

### getStorage

```solidity
function getStorage() external view returns (address)
```

Retrieves the address of the token sale storage contract.

_Returns the current address stored in `_presaleStorage`._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | address The address of the token sale registry. |

### getPriceFeed

```solidity
function getPriceFeed(address tokenAddress_) external view returns (address)
```

Retrieves the address of the price feed contract used for pricing information.

_Returns the current address stored in `_currencies`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenAddress_ | address | The address of the ERC20 token used for price feed, or zero address for native currency. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | address The address of the price feed contract. |

### getTotalCollected

```solidity
function getTotalCollected(address tokenAddress_) external view returns (uint256)
```

Returns the total amount of token or native currency collected through sales.

_Accesses the Currency from `_currencies` to provide the total collected funds._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The total amount of token or native currency collected. |

### getPriceThreshold

```solidity
function getPriceThreshold() external view returns (uint256)
```

Gets the current threshold for price updates, in seconds.

_Returns the time period in seconds that is considered acceptable for a price update delay._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The current price update threshold in seconds. |

### getNovaPoints

```solidity
function getNovaPoints(address user_) external view returns (uint256)
```

Returns the Nova Points balance for a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user to retrieve the Nova Points balance for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The Nova Points balance for the specified user. |

### getReferralCount

```solidity
function getReferralCount(address user_) external view returns (uint256)
```

Returns the referral count for a user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user to retrieve the referral count for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The referral count for the specified user. |

### _processPurchase

```solidity
function _processPurchase(address user_, address ref_, address tokenAddress_, uint256 amount_, bool max_) internal returns (uint256)
```

Reverts if the contract is paused, `user_` is a null address, the amount is zero, the sale is not active,
the sale round is closed, or the funds transfer fails.

_Internal function to handle the purchase of tokens during the pre-sale.
This function orchestrates several key operations:
- Validation of the input parameters and state conditions to ensure the purchase can proceed.
- Interaction with the TokenSaleRegistry to retrieve and validate the current sale round.
- Calculation of the number of tokens that can be bought based on the native currency provided and the current token price.
- Handling of referral rewards if a valid referral is provided.
- Transfer of funds to the treasury and issuance of tokens and referral rewards.
- Calculation and awarding of Nova Points to the user.
- Calculation and awarding of Nova Points to the referrer, if applicable.
Each step involves checks and balances to ensure transaction integrity and security._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user who is making the purchase. |
| ref_ | address | Optional referral address that may entitle the referrer to rewards, if applicable. |
| tokenAddress_ | address | The address of the ERC20 token used for purchase, or zero address for native currency. |
| amount_ | uint256 | The amount of currency to be used for purchase. |
| max_ | bool | Indicates whether the transaction should respect the maximum limit for contributions. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The number of tokens that were sold to the user. Emits a {TokensPurchased} event upon successful completion of the purchase. Emits a {NovaPointsAwarded} event when Nova Points are awarded to the user and the referrer. |

### _validatePurchaseParameters

```solidity
function _validatePurchaseParameters(address user_, address ref_, uint256 amount_) internal view
```

Reverts if the user address is null, user address equals referral address,
the amount is zero, or the sale is not active.

_Validates the input parameters for the purchase._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user who is making the purchase. |
| ref_ | address | The referral address provided by the user. |
| amount_ | uint256 | The amount of currency to be used for purchase. |

### _getAndValidateSaleRound

```solidity
function _getAndValidateSaleRound() internal view returns (struct TokenSaleRegistry.Round)
```

Reverts if the sale round is not started.

_Retrieves and validates the current sale round from the TokenSaleRegistry._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct TokenSaleRegistry.Round | TokenSaleRegistry.Round memory The current sale round. |

### _calculateTokensToSell

```solidity
function _calculateTokensToSell(uint256 amount_, address tokenAddress_, struct TokenSaleRegistry.Round round) internal view returns (uint256)
```

Reverts if the round allocation is insufficient.

_Calculates the number of tokens to sell based on the provided amount and token address._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount_ | uint256 | The amount of currency to be used for purchase. |
| tokenAddress_ | address | The address of the ERC20 token used for purchase, or zero address for native currency. |
| round | struct TokenSaleRegistry.Round | The current sale round information. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The number of tokens to sell. |

### _validateFundsAndLimits

```solidity
function _validateFundsAndLimits(address user_, uint256 funds, bool max_) internal view
```

Reverts if the funds are below the minimum or above the user's limit.

_Validates the provided funds against the minimum and maximum limits._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user who is making the purchase. |
| funds | uint256 | The amount of funds calculated in USD. |
| max_ | bool | Indicates whether the transaction should respect the maximum limit for contributions. |

### _handleReferral

```solidity
function _handleReferral(address user_, address ref_) internal returns (address, address)
```

_Handles the referral logic by checking and updating the referral information._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user who is making the purchase. |
| ref_ | address | The referral address provided by the user. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | (address, address) The updated referral address. |
| [1] | address |  |

### _getCurrencyPrice

```solidity
function _getCurrencyPrice(struct PresaleSNOVA.Currency currency) internal view returns (int256)
```

_Retrieves the current price of the currency._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | struct PresaleSNOVA.Currency | The currency information. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | int256 The current price of the currency. |

### _recordSale

```solidity
function _recordSale(address user_, address tokenAddress_, uint256 funds, uint256 tokensToSell, address ref_, uint256 coinFunds, uint256 tokenFunds) internal
```

_Records the sale by processing and recording the sale details in the presale storage._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user who is making the purchase. |
| tokenAddress_ | address | The address of the ERC20 token used for purchase. |
| funds | uint256 | The amount of funds calculated in USD. |
| tokensToSell | uint256 | The number of tokens to be sold. |
| ref_ | address | The referral address. |
| coinFunds | uint256 | The funds associated with the referral in coins. |
| tokenFunds | uint256 | The funds associated with the referral in tokens. |

### _awardNovaPoints

```solidity
function _awardNovaPoints(address user_, uint256 funds) internal returns (uint256)
```

_Awards Nova Points to the user based on the provided funds._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user who is making the purchase. |
| funds | uint256 | The amount of funds calculated in USD. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The number of Nova Points awarded to the user. |

### _updateCurrencyCollectedAmount

```solidity
function _updateCurrencyCollectedAmount(struct PresaleSNOVA.Currency currency, uint256 amount_) internal
```

_Updates the total collected amount for the given currency._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | struct PresaleSNOVA.Currency | The currency information. |
| amount_ | uint256 | The amount to be added to the total collected amount. |

### _emitTokensPurchased

```solidity
function _emitTokensPurchased(address user_, address ref, uint256 amount_, uint256 tokensToSell, uint256 funds, int256 currencyPrice, uint256 novaPoints) internal
```

_Emits the TokensPurchased and NovaPointsAwarded events._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user who is making the purchase. |
| ref | address | The referral address. |
| amount_ | uint256 | The amount of currency used for purchase. |
| tokensToSell | uint256 | The number of tokens sold. |
| funds | uint256 | The amount of funds calculated in USD. |
| currencyPrice | int256 | The current price of the currency. |
| novaPoints | uint256 | The number of Nova Points awarded to the user. |

### _handleReferrerRewards

```solidity
function _handleReferrerRewards(address user_, address ref, uint256 novaPoints) internal
```

_Handles the rewards for the referrer by awarding Nova Points and updating referral information._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user who is making the purchase. |
| ref | address | The referral address. |
| novaPoints | uint256 | The number of Nova Points awarded to the user. |

### _getLatestPrice

```solidity
function _getLatestPrice(contract AggregatorV3Interface priceFeed) internal view returns (int256)
```

Reverts if the price feed update is beyond the acceptable time threshold.

_Retrieves the latest price from the price feed and ensures the data is recent._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | contract AggregatorV3Interface | The price feed contract. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | int256 The latest price. |

### _calculateFundsInUSD

```solidity
function _calculateFundsInUSD(address tokenAddress_, uint256 amount_) internal view returns (uint256)
```

_Converts a specified amount of tokens (native currency, USDT, USDC, or DAI) into its equivalent value in USD.
This conversion is based on the latest available price of the native currency in terms of USD._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenAddress_ | address | The address of the ERC20 token used for purchase, or zero address for native currency. |
| amount_ | uint256 | The amount of tokens to be converted. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The equivalent amount in USD. |

### _calculateTokensSold

```solidity
function _calculateTokensSold(uint256 amount_, address tokenAddress_) internal view returns (uint256)
```

The calculation is sensitive to the price feed's decimal precision and adjusts the result accordingly.

_Calculates the number of tokens that can be purchased with a given amount of native currency.
This function checks the recency of the price data to ensure that it falls within the acceptable threshold for price updates.
If the data is outdated, the transaction is reverted to prevent incorrect pricing calculations._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount_ | uint256 | The amount of currency provided for the purchase. |
| tokenAddress_ | address | The address of the ERC20 token used for purchase, or zero address for native currency. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The calculated number of tokens that can be bought with the specified amount of currency. |

### _calculateReferralRewards

```solidity
function _calculateReferralRewards(address user_, address ref_, uint256 amount_, address tokenAddress_) internal view returns (address, uint256, uint256)
```

_Calculates the referral rewards based on the purchase amount and the rates applicable to the referrer.
Handles different decimals for different tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The user who made the purchase. |
| ref_ | address | The referral address. |
| amount_ | uint256 | The amount of currency used in the purchase. |
| tokenAddress_ | address | The address of the ERC20 token used for purchase, or zero address for native currency. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | address The effective referral address. |
| [1] | uint256 | uint256 The amount of native currency as a referral reward. |
| [2] | uint256 | uint256 The amount of tokens as a referral reward. |

### _transferPurchaseFunds

```solidity
function _transferPurchaseFunds(address tokenAddress_, uint256 amount_, uint256 reward_) internal
```

_Transfers the purchase funds and referral rewards to the appropriate recipients.
     Handles different decimal places for currencies and ensures precise calculations._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenAddress_ | address | The address of the ERC20 token used for purchase, or zero address for native currency. |
| amount_ | uint256 | The total amount of the currency used for purchase. |
| reward_ | uint256 | The amount of the currency to be transferred as a referral reward. |

### _calculateNovaPoints

```solidity
function _calculateNovaPoints(uint256 investment_) internal pure returns (uint256)
```

Calculates the number of Nova Points awarded based on the investment amount in USD.

_The investment amount is in USD and the multipliers are predefined for different investment ranges._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| investment_ | uint256 | The investment amount in USD (in 18 decimal places). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of Nova Points awarded. |

### receive

```solidity
receive() external payable
```

_Fallback function to allow the contract to receive Ether directly._

## TokenSaleRegistry

_Manages the lifecycle of token sale rounds, including referral programs and fund allocation.
This contract allows for the configuration of sale rounds, referral rates, and the claiming of referral rewards.
It implements AccessControl for administrative actions and utilizes SafeERC20 for token interactions._

### State

Tracks the state of the token sale.

_Used to manage the lifecycle stages of a sale round within the contract._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
enum State {
  Reset,
  Started,
  Ended
}
```

### Round

Structure representing a sale round within the token sale.

_Stores details pertinent to a single round of the sale._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Round {
  bool defined;
  enum TokenSaleRegistry.State state;
  uint256 price;
  uint256 sold;
  uint256 supply;
}
```

### Referral

Details about a referral account used in the token sale.

_Tracks whether a referral is active and the rates applicable for commission._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Referral {
  bool defined;
  bool enabled;
  uint256 primaryRefRate;
  uint256 secondaryRefRate;
}
```

### OPERATOR_ROLE

```solidity
bytes32 OPERATOR_ROLE
```

### ETH

```solidity
address ETH
```

### TOKEN

```solidity
address TOKEN
```

### MAX_ALLOCATION

```solidity
uint256 MAX_ALLOCATION
```

### MIN_CONTRIBUTION

```solidity
uint256 MIN_CONTRIBUTION
```

### StateUpdated

```solidity
event StateUpdated(enum TokenSaleRegistry.State state)
```

Emitted when the state of the token sale is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| state | enum TokenSaleRegistry.State | The new state of the token sale. |

### SaleRoundStarted

```solidity
event SaleRoundStarted(uint256 round)
```

Emitted when a new sale round starts.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| round | uint256 | The index of the sale round that has started. |

### SaleRoundEnded

```solidity
event SaleRoundEnded(uint256 round)
```

Emitted when a sale round ends.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| round | uint256 | The index of the sale round that has ended. |

### SaleRoundConfigured

```solidity
event SaleRoundConfigured(uint256 price, uint256 supply)
```

Emitted when a new sale round is configured.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| price | uint256 | The price per token. |
| supply | uint256 | The total supply of tokens for the round. |

### SaleRoundPricingAdjusted

```solidity
event SaleRoundPricingAdjusted(uint256 round, uint256 price)
```

Emitted when the pricing of a sale round is adjusted.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| round | uint256 | The index of the sale round. |
| price | uint256 | The new price per token. |

### SaleRoundSupplyAdjusted

```solidity
event SaleRoundSupplyAdjusted(uint256 round, uint256 supply)
```

Emitted when the token supply for a sale round is adjusted.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| round | uint256 | The index of the sale round. |
| supply | uint256 | The new total supply for the round. |

### Erc20Recovered

```solidity
event Erc20Recovered(address token, uint256 amount)
```

Emitted when ERC20 tokens are recovered from the contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | The address of the ERC20 token recovered. |
| amount | uint256 | The amount of tokens recovered. |

### CoinRecovered

```solidity
event CoinRecovered(uint256 amount)
```

Emitted when native currency is recovered from the contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of native currency recovered. |

### AuthorizationThresholdUpdated

```solidity
event AuthorizationThresholdUpdated(uint256 limit)
```

Emitted when the authorization threshold for participants is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| limit | uint256 | The new authorization limit. |

### AuthUserUpdated

```solidity
event AuthUserUpdated(address user, bool value)
```

Emitted when a user's authorization status is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user. |
| value | bool | The new authorization value (true for authorized, false for not authorized). |

### MaxUpdated

```solidity
event MaxUpdated(uint256 amount)
```

Emitted when the maximum contribution limit is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The new maximum contribution limit. |

### MinUpdated

```solidity
event MinUpdated(uint256 amount)
```

Emitted when the minimum contribution limit is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The new minimum contribution limit. |

### FundsManagementWalletUpdated

```solidity
event FundsManagementWalletUpdated(address fundsManagementWallet)
```

Emitted when the funds management wallet address is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundsManagementWallet | address | The new funds management wallet address. |

### ReferralRatesConfigured

```solidity
event ReferralRatesConfigured(uint256 primaryRefRate, uint256 secondaryRefRate)
```

Emitted when referral rates are configured.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| primaryRefRate | uint256 | The primary referral rate. |
| secondaryRefRate | uint256 | The secondary referral rate. |

### ReferralAccountInitialized

```solidity
event ReferralAccountInitialized(address ref, uint256 primaryRefRate, uint256 secondaryRefRate)
```

Emitted when a new referral account is initialized.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref | address | The address of the referral. |
| primaryRefRate | uint256 | The primary referral rate for this account. |
| secondaryRefRate | uint256 | The secondary referral rate for this account. |

### ReferralEnabled

```solidity
event ReferralEnabled(address ref)
```

Emitted when a referral account is enabled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref | address | The address of the referral account that was enabled. |

### ReferralDisabled

```solidity
event ReferralDisabled(address ref)
```

Emitted when a referral account is disabled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref | address | The address of the referral account that was disabled. |

### ReferralRewardsClaimed

```solidity
event ReferralRewardsClaimed(address ref, address token, uint256 amount)
```

Emitted when referral rewards are claimed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref | address | The address of the referral claiming the rewards. |
| token | address | The token in which the rewards are claimed. |
| amount | uint256 | The amount of rewards claimed. |

### ErrInvalidParameters

```solidity
error ErrInvalidParameters()
```

Thrown when an operation is attempted with invalid parameters.

### ErrSaleAlreadyStarted

```solidity
error ErrSaleAlreadyStarted()
```

Thrown when an operation is attempted to start a sale that has already been started.

### ErrSaleNotActive

```solidity
error ErrSaleNotActive()
```

Thrown when an operation is attempted on a sale that is not active.

### ErrNullAddress

```solidity
error ErrNullAddress()
```

Thrown when a zero address is used where a valid address is required.

### ErrUndefinedSaleRound

```solidity
error ErrUndefinedSaleRound(uint256 index_)
```

Thrown when a specified sale round does not exist.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index_ | uint256 | The index of the sale round. |

### ErrRoundStarted

```solidity
error ErrRoundStarted(uint256 index_)
```

Thrown when an operation is attempted on a sale round that has already started.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index_ | uint256 | The index of the sale round. |

### ErrRoundEnded

```solidity
error ErrRoundEnded(uint256 index_)
```

Thrown when an operation is attempted on a sale round that has already ended.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index_ | uint256 | The index of the sale round. |

### ErrInsufficientRoundSupply

```solidity
error ErrInsufficientRoundSupply(uint256 index_)
```

Thrown when there is insufficient supply in a sale round for an operation.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index_ | uint256 | The index of the sale round. |

### ErrMin

```solidity
error ErrMin(uint256 amount_, uint256 min_)
```

Thrown when the amount provided is below the required minimum.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount_ | uint256 | The amount provided. |
| min_ | uint256 | The minimum required amount. |

### ErrMax

```solidity
error ErrMax(uint256 amount_, uint256 max_)
```

Thrown when the amount provided exceeds the allowed maximum.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount_ | uint256 | The amount provided. |
| max_ | uint256 | The maximum allowed amount. |

### ErrAuthLimitOutsideAllowedRange

```solidity
error ErrAuthLimitOutsideAllowedRange(uint256 limit_, uint256 min_, uint256 max_)
```

Thrown when the authorization limit is set outside the allowed range.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| limit_ | uint256 | The authorization limit. |
| min_ | uint256 | The minimum allowed limit. |
| max_ | uint256 | The maximum allowed limit. |

### ErrReferralRatesExceedLimit

```solidity
error ErrReferralRatesExceedLimit(uint256 rates_)
```

Thrown when the total of referral rates exceeds the limit of 100%.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rates_ | uint256 | The total referral rates. |

### ErrUndefinedReferralAccount

```solidity
error ErrUndefinedReferralAccount(address ref_)
```

Thrown when an undefined referral account is referenced.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref_ | address | The referral account address. |

### ErrReferralAlreadyEnabled

```solidity
error ErrReferralAlreadyEnabled(address ref_)
```

Thrown when trying to enable an already enabled referral account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref_ | address | The referral account address. |

### ErrReferralNotEnabled

```solidity
error ErrReferralNotEnabled(address ref_)
```

Thrown when trying to disable a referral account that is not enabled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref_ | address | The referral account address. |

### ErrEmptyTokenList

```solidity
error ErrEmptyTokenList()
```

Thrown when an empty list of tokens is used where it is not permitted.

### ErrTransferFailure

```solidity
error ErrTransferFailure()
```

Thrown when a transfer of funds fails.

### constructor

```solidity
constructor(address fundsManagementWallet_) public
```

Initializes the TokenSaleRegistry with the specified funds management wallet.

_Sets up the initial admin and operator roles and assigns them to the message sender. Ensures that the contract starts
in a predictable state._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundsManagementWallet_ | address | The wallet that will manage the funds collected from token sales. Must be a non-zero address. |

### activateSale

```solidity
function activateSale() external
```

Activates the token sale, allowing rounds to be configured and started.

_Transitions the contract state from 'Reset' to 'Started'. This change is crucial as it permits the creation and management
of sale rounds.
Reverts if attempting to activate when already active to prevent reinitialization of the sale process.
Emits a {StateUpdated} event on success._

### deactivateSale

```solidity
function deactivateSale() external
```

Deactivates the token sale, preventing any new rounds from starting.

_Sets the contract state to `Ended`. Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
Reverts if the contract is already inactive.
Emits a {StateUpdated} event on success._

### configureSaleRound

```solidity
function configureSaleRound(uint256 price_, uint256 supply_) external
```

Configures a new sale round with specified prices and supply.

_Adds a new `Round` to the `_rounds` array with `Reset` state. Can only be called by an account with the `DEFAULT_ADMIN_ROLE`.
Reverts if the sale is not active._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| price_ | uint256 | The price for the 'SNOVA token. |
| supply_ | uint256 | The total token supply for the round. Emits a {SaleRoundConfigured} event on success. |

### configureReferralRates

```solidity
function configureReferralRates(uint256 primaryRefRate_, uint256 secondaryRefRate_) external
```

Sets the referral rates for primary and secondary referrals.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. Rates are expressed in tenths of a percent (i.e., 10 equals 1%)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| primaryRefRate_ | uint256 | The referral rate for primary referrals, determining the percentage of the sale amount credited as a reward. |
| secondaryRefRate_ | uint256 | The referral rate for secondary referrals, used to calculate secondary rewards based on the sale amount. Emits a {ReferralRatesConfigured} event on success. |

### initializeReferralAccounts

```solidity
function initializeReferralAccounts(address[] refs_, uint256[] primaryRefRate_, uint256[] secondaryRefRate_) external
```

Initializes referral accounts with specific primary and secondary referral rates.

_Configures each referral account provided in the `refs_` array with rates specified in `primaryRefRate_` and `secondaryRefRate_` arrays.
     This method should be used carefully as it directly affects the incentives structure._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| refs_ | address[] | Array of addresses to be set up as referral accounts. |
| primaryRefRate_ | uint256[] | Array of primary referral rates corresponding to each address in `refs_`. |
| secondaryRefRate_ | uint256[] | Array of secondary referral rates corresponding to each address in `refs_`. Emits a {ReferralAccountInitialized} event for each referral account on success. |

### adjustRoundPricing

```solidity
function adjustRoundPricing(uint256 index_, uint256 price_) external
```

Adjusts the pricing for a specific sale round.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. The round must exist and be in the `Reset` state._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index_ | uint256 | The index of the sale round to adjust. |
| price_ | uint256 | The new investment price. Reverts if the sale is not active, the round does not exist, or the round is not in the `Reset` state. Emits a {SaleRoundPricingAdjusted} event on success. |

### adjustRoundSupply

```solidity
function adjustRoundSupply(uint256 index_, uint256 supply_) external
```

Adjusts the supply for a specific sale round.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. The round must exist and cannot be in the `Ended` state._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index_ | uint256 | The index of the sale round to adjust. |
| supply_ | uint256 | The new supply for the round. Reverts if the sale is not active, the round does not exist, or the round is in the `Ended` state. Emits a {SaleRoundSupplyAdjusted} event on success. |

### startSaleRound

```solidity
function startSaleRound(uint256 index_) external
```

Starts a specific sale round, allowing tokens to be sold.

_Can only be called by an account with the `OPERATOR_ROLE`. The round must exist and be in the `Reset` state._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index_ | uint256 | The index of the sale round to start. Reverts if the sale is not active, the round does not exist, or the round is not in the `Reset` state. Emits a {SaleRoundStarted} event on success. |

### endSaleRound

```solidity
function endSaleRound(uint256 index_) external
```

Ends a specific sale round, stopping any further token sales.

_Can only be called by an account with the `OPERATOR_ROLE`. The round must exist and be in the `Started` state._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index_ | uint256 | The index of the sale round to end. Reverts if the round does not exist or is not in the `Started` state. Emits a {SaleRoundEnded} event on success. |

### authorizeParticipant

```solidity
function authorizeParticipant(address user_, bool value_) external
```

Authorizes or deauthorizes a participant for the token sale.

_Can only be called by an account with the `OPERATOR_ROLE`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the participant to authorize or deauthorize. |
| value_ | bool | A boolean where `true` authorizes the participant and `false` deauthorizes them. Emits an {AuthUserUpdated} event on success. |

### batchAuthorizeParticipants

```solidity
function batchAuthorizeParticipants(address[] users_, bool[] values_) external
```

Batch authorizes or deauthorizes participants for the token sale.

_Can only be called by an account with the `OPERATOR_ROLE`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| users_ | address[] | The addresses of the participants to authorize or deauthorize. |
| values_ | bool[] | An array of booleans where `true` authorizes and `false` deauthorizes the corresponding participant. Reverts if the length of `users_` and `values_` arrays do not match. Emits an {AuthUserUpdated} event for each participant on success. |

### updateMaximumAllocation

```solidity
function updateMaximumAllocation(uint256 amount_) external
```

Updates the maximum allocation allowed per participant.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount_ | uint256 | The new maximum allocation amount. Reverts if `amount_` is greater than `MAX_ALLOCATION` or less than the current minimum contribution limit. Emits a {MaxUpdated} event on success. |

### updateMinimumContribution

```solidity
function updateMinimumContribution(uint256 amount_) external
```

Updates the minimum contribution required to participate in the sale.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount_ | uint256 | The new minimum contribution amount. Reverts if `amount_` is less than `MIN_CONTRIBUTION` or greater than the current maximum allocation limit. Emits a {MinUpdated} event on success. |

### updateAuthorizationThreshold

```solidity
function updateAuthorizationThreshold(uint256 amount_) external
```

Sets the threshold for which participants are automatically authorized.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount_ | uint256 | The new authorization threshold amount. Reverts if `amount_` is not within the bounds of the minimum and maximum contribution limits. Emits an {AuthorizationThresholdUpdated} event on success. |

### updateFundsWallet

```solidity
function updateFundsWallet(address fundsManagementWallet_) external
```

Updates the wallet address used for managing funds collected from the sale.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundsManagementWallet_ | address | The new funds management wallet address. Reverts if `fundsManagementWallet_` is the zero address. Emits a {FundsManagementWalletUpdated} event on success. |

### processAndRecordSale

```solidity
function processAndRecordSale(address user_, address token_, uint256 amount_, uint256 sold_, address ref_, uint256 primaryReward_, uint256 secondaryReward_) external
```

Processes and records a sale transaction, distributing rewards if applicable.

_This function can only be called by an account with the `OPERATOR_ROLE`. It handles the processing of sales,
updates the total sold amount, participant's funds, and manages referral rewards if a valid referral is provided.
Refactoring involves separate functions for processing sales, recording, and updating referrals._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user participating in the sale. |
| token_ | address | The token in which the sale is conducted. |
| amount_ | uint256 | The amount of funds involved in the transaction. |
| sold_ | uint256 | The amount of tokens sold in this transaction. |
| ref_ | address | The referral's address, if any. |
| primaryReward_ | uint256 | The 'SNOVA' reward amount for the referral. |
| secondaryReward_ | uint256 | The COIN reward amount based on the sale amount. |

### enableReferral

```solidity
function enableReferral(address ref_) external
```

Enables a referral account, allowing it to receive referral rewards.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. Marks a referral as enabled._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref_ | address | The address of the referral account to enable. Reverts if the referral account is already enabled or undefined. Emits a {ReferralEnabled} event upon success. |

### disableReferral

```solidity
function disableReferral(address ref_) external
```

Disables a referral account, preventing it from receiving further referral rewards.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. Marks a referral as disabled._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref_ | address | The address of the referral account to disable. Reverts if the referral account is already disabled or undefined. Emits a {ReferralDisabled} event upon success. |

### claimRef

```solidity
function claimRef(address[] tokens_) external
```

Allows referral accounts to claim their accrued rewards for specified tokens.

_Can only be executed by the referral account itself. It transfers the accrued rewards for each token specified in the `tokens_` array._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokens_ | address[] | An array of token addresses for which to claim rewards. Reverts if the caller has no rewards to claim for a specified token or if the referral account is not enabled. Emits a {ReferralRewardsClaimed} event for each token with rewards being claimed. |

### recoverCoin

```solidity
function recoverCoin() external
```

Allows the recovery of Ether or any other native coin from EVM compatible blockchain mistakenly sent to the contract.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. Transfers the contract's Ether balance back to the caller.
Reverts if the contract has no Ether balance.
Emits a {CoinRecovered} event upon success._

### recoverErc20

```solidity
function recoverErc20(address token_, uint256 amount_) external
```

Allows the recovery of ERC20 tokens mistakenly sent to the contract.

_Can only be called by an account with the `DEFAULT_ADMIN_ROLE`. Transfers specified amount of a token back to the caller._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token_ | address | The ERC20 token address. |
| amount_ | uint256 | The amount of the token to recover. Reverts if the contract holds less than `amount_` of the specified token. Emits an {Erc20Recovered} event upon success. |

### getFundsWallet

```solidity
function getFundsWallet() external view returns (address)
```

Returns the address of the funds management wallet.

_Getter function for the address where the funds collected from the sales are managed._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the funds management wallet. |

### getMax

```solidity
function getMax() external view returns (uint256)
```

Retrieves the maximum allowed allocation per participant in the token sale.

_This getter function provides the maximum amount a participant can contribute to the token sale._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The maximum allocation amount in the token sale's currency. |

### getMin

```solidity
function getMin() external view returns (uint256)
```

Retrieves the minimum required contribution for participating in the token sale.

_This getter function provides the minimum amount required to participate in the token sale._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The minimum contribution amount in the token sale's currency. |

### getRoundsCount

```solidity
function getRoundsCount() external view returns (uint256)
```

Returns the total number of sale rounds configured in the contract.

_Provides a count of how many rounds have been added to the sale, regardless of their state._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total number of sale rounds. |

### getCurrentRound

```solidity
function getCurrentRound() external view returns (uint256)
```

Retrieves the identifier of the currently active sale round.

_This function provides the index of the currently active round. Rounds are indexed starting from 0._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The index of the currently active sale round. |

### getRound

```solidity
function getRound(uint256 index_) external view returns (struct TokenSaleRegistry.Round)
```

Provides detailed information about a specific sale round.

_Fetches round data, including prices and state, based on the round index provided._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| index_ | uint256 | The index of the sale round to retrieve information for. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct TokenSaleRegistry.Round | A `Round` struct containing details about the specified sale round. Reverts if the round index is out of bounds. |

### getTotalSold

```solidity
function getTotalSold() external view returns (uint256)
```

Retrieves the total amount of tokens sold across all rounds.

_Sums up the total tokens sold in all rounds to give a cumulative figure._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total amount of tokens sold in the token sale. |

### balanceOf

```solidity
function balanceOf(address user_, uint256 round_) external view returns (uint256)
```

Checks the amount of tokens a user has purchased in a specific sale round.

_Provides the number of tokens a given user has bought in a particular round._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user. |
| round_ | uint256 | The index of the sale round. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of tokens purchased by the user in the specified round. |

### refBalanceOf

```solidity
function refBalanceOf(address user_, address token_) external view returns (uint256)
```

Retrieves the referral rewards balance for a user in a specific token.

_Indicates how much of a particular token a user has earned as referral rewards._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user or referral. |
| token_ | address | The token for which the referral balance is queried. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The referral rewards balance for the user in the specified token. |

### limitOf

```solidity
function limitOf(address user_) external view returns (uint256)
```

Calculates the remaining allocation a user is allowed to contribute.

_Determines how much more a user can contribute based on their current contributions and the authorization limit._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The remaining amount the user is allowed to contribute. |

### maxLimitOf

```solidity
function maxLimitOf(address user_) external view returns (uint256)
```

Calculates the maximum limit a user can contribute based on their current contributions.

_Determines the maximum amount a user is still allowed to contribute towards the sale._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the participant. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The maximum remaining contribution amount for the user. |

### getFundsOfUser

```solidity
function getFundsOfUser(address user_) external view returns (uint256)
```

Retrieves the total amount of funds a user has contributed to the sale.

_Provides the cumulative contribution amount of a user across all sale rounds._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total contribution amount of the user in the token sale's currency. |

### getAuthLimit

```solidity
function getAuthLimit() external view returns (uint256)
```

Returns the authorization limit for participants.

_Provides the threshold above which users need special authorization to contribute._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The authorization limit for contributions. |

### getGlobalRefRates

```solidity
function getGlobalRefRates() external view returns (uint256, uint256)
```

Retrieves global referral rates for the sale.

_Provides the default referral rates applied to all referrals unless overridden._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The primary and secondary referral rates. |
| [1] | uint256 |  |

### getRef

```solidity
function getRef(address user_, address ref_) external view returns (address)
```

Determines the referral associated with a user or transaction.

_Identifies the referral, if any, responsible for a user's participation in the sale._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user whose referral is to be identified. |
| ref_ | address | A potential referral address provided by the user. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the referral, if valid and enabled; otherwise, the zero address. |

### getReferralStruct

```solidity
function getReferralStruct(address user_) external view returns (struct TokenSaleRegistry.Referral)
```

Provides the detailed referral structure for a given referral account.

_Fetches detailed referral information, including rates and enabled status._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the referral account. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct TokenSaleRegistry.Referral | The `Referral` struct containing detailed information about the referral. |

### getRefRates

```solidity
function getRefRates(address ref_) external view returns (uint256, uint256)
```

Retrieves the referral rates for a specific referral account.

_Provides the custom referral rates set for a specific referral, if defined; otherwise, returns the global rates._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ref_ | address | The address of the referral account. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The primary and secondary referral rates for the specified account. |
| [1] | uint256 |  |

### isActive

```solidity
function isActive() public view returns (bool)
```

Checks if the token sale is currently active.

_Utility function to determine if the sale is in the `Started` state._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | `true` if the sale is active, `false` otherwise. |

### isInactive

```solidity
function isInactive() public view returns (bool)
```

Checks if the token sale is currently inactive or ended.

_Utility function to determine if the sale is in the `Ended` state._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | `true` if the sale is inactive, `false` otherwise. |

### getPrice

```solidity
function getPrice() public view returns (uint256)
```

Retrieves the sale price for tokens.

_Provides the price for the currently active round._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The sale price per token for the currently active round. |

### isAuth

```solidity
function isAuth(address user_) public view returns (bool)
```

Checks if a user is authorized for '_max' contributions.

_Determines if a user has been marked as authorized to bypass the standard contribution limit._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user_ | address | The address of the user to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | `true` if the user is authorized, `false` otherwise. |

### receive

```solidity
receive() external payable
```

_Fallback function to allow the contract to receive Ether directly._

## ERC20Mock

_A mock ERC20 token contract for testing purposes.
This contract allows the creation of a token with an initial supply that is assigned to the deployer._

### constructor

```solidity
constructor(string name, string symbol, uint256 initialSupply) public
```

Initializes the mock ERC20 token with a name, symbol, and initial supply.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | The name of the token. |
| symbol | string | The symbol of the token. |
| initialSupply | uint256 | The initial supply of the token. |

## MockAggregatorV3Interface

_A mock contract to simulate Chainlink's AggregatorV3Interface.
This contract provides a controlled environment for testing purposes by
allowing the manipulation of price and timestamp values._

### constructor

```solidity
constructor(uint8 decimals_, int256 price_, uint256 updatedAt_) public
```

Initializes the mock with desired values.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| decimals_ | uint8 | The number of decimals for the price value. |
| price_ | int256 | The initial price value. |
| updatedAt_ | uint256 | The initial timestamp when the price was updated. |

### setLatestRoundData

```solidity
function setLatestRoundData(int256 price_, uint256 updatedAt_) public
```

Sets the latest round data, allowing you to change the price for different test scenarios.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| price_ | int256 | The new price value. |
| updatedAt_ | uint256 | The new timestamp when the price was updated. |

### decimals

```solidity
function decimals() external view returns (uint8)
```

Returns the number of decimals for the price value.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | The number of decimals. |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

Returns the latest round data, mocked to return controlled test data.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | The round ID (mocked as 0). |
| price | int256 | The current price value. |
| startedAt | uint256 | The timestamp when the round started (mocked as 0). |
| updatedAt | uint256 | The timestamp when the price was last updated. |
| answeredInRound | uint80 | The round ID in which the answer was computed (mocked as 0). |

