// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockAggregatorV3Interface
 * @dev A mock contract to simulate Chainlink's AggregatorV3Interface.
 * This contract provides a controlled environment for testing purposes by
 * allowing the manipulation of price and timestamp values.
 */
contract MockAggregatorV3Interface {
    uint8 private _decimals;
    int256 private _price;
    uint256 private _updatedAt;

    /**
     * @notice Initializes the mock with desired values.
     * @param decimals_ The number of decimals for the price value.
     * @param price_ The initial price value.
     * @param updatedAt_ The initial timestamp when the price was updated.
     */
    constructor(uint8 decimals_, int256 price_, uint256 updatedAt_) {
        _decimals = decimals_;
        _price = price_;
        _updatedAt = updatedAt_;
    }

    /**
     * @notice Sets the latest round data, allowing you to change the price for different test scenarios.
     * @param price_ The new price value.
     * @param updatedAt_ The new timestamp when the price was updated.
     */
    function setLatestRoundData(int256 price_, uint256 updatedAt_) public {
        _price = price_;
        _updatedAt = updatedAt_;
    }

    /**
     * @notice Returns the number of decimals for the price value.
     * @return The number of decimals.
     */
    function decimals() external view returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Returns the latest round data, mocked to return controlled test data.
     * @return roundId The round ID (mocked as 0).
     * @return price The current price value.
     * @return startedAt The timestamp when the round started (mocked as 0).
     * @return updatedAt The timestamp when the price was last updated.
     * @return answeredInRound The round ID in which the answer was computed (mocked as 0).
     */
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (0, _price, 0, _updatedAt, 0);
    }
}
