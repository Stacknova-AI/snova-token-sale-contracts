# <img src="https://private-user-images.githubusercontent.com/103837756/354002804-cce06117-94b8-4a09-a51a-a9c10b4fc46c.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MjI0NjE1NjAsIm5iZiI6MTcyMjQ2MTI2MCwicGF0aCI6Ii8xMDM4Mzc3NTYvMzU0MDAyODA0LWNjZTA2MTE3LTk0YjgtNGEwOS1hNTFhLWE5YzEwYjRmYzQ2Yy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjQwNzMxJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI0MDczMVQyMTI3NDBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0zMWZkZTU3M2U2M2FjODgzZjhlOWQxOTY3ZGQwN2RhODQ5OGQ3NGZlODRhODFlMWQwYmFkODI5YTU1YmRkY2UyJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZhY3Rvcl9pZD0wJmtleV9pZD0wJnJlcG9faWQ9MCJ9.YocgLvGUNDBezk49SxTFlPfuzIX9eimxOGD4BqVIGaM" alt="Stacknova AI" width="27" height="27" /> Stacknova AI: Pre-sale Contract for SNOVA Tokens <img src="https://private-user-images.githubusercontent.com/103837756/354002804-cce06117-94b8-4a09-a51a-a9c10b4fc46c.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MjI0NjE1NjAsIm5iZiI6MTcyMjQ2MTI2MCwicGF0aCI6Ii8xMDM4Mzc3NTYvMzU0MDAyODA0LWNjZTA2MTE3LTk0YjgtNGEwOS1hNTFhLWE5YzEwYjRmYzQ2Yy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjQwNzMxJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI0MDczMVQyMTI3NDBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0zMWZkZTU3M2U2M2FjODgzZjhlOWQxOTY3ZGQwN2RhODQ5OGQ3NGZlODRhODFlMWQwYmFkODI5YTU1YmRkY2UyJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZhY3Rvcl9pZD0wJmtleV9pZD0wJnJlcG9faWQ9MCJ9.YocgLvGUNDBezk49SxTFlPfuzIX9eimxOGD4BqVIGaM" alt="Stacknova AI" width="27" height="27" />

## Table of Contents

-   [Description](#description)
-   [Installation](#installation)
-   [Configuration](#configuration)
    -   [Environment Variables](#environment-variables)
-   [Usage](#usage)
    -   [Running Tests](#running-tests)
    -   [Deployment](#deployment)
-   [Documentation](#documentation)
-   [License](#license)
-   [Contact](#contact)

## Description

This project includes smart contracts for the pre-sale phase of SNOVA tokens. It allows for contributions in native currency and stablecoins (USDT, USDC, DAI). The contracts ensure dynamic pricing through Chainlink price feeds, role management, and secure transaction processing. It also incorporates a referral system for incentivizing early participants.

## Installation

To install the project dependencies, run:

```bash
npm install
```

## Configuration

### Environment Variables

Create a .env file in the root directory and add the [following](https://github.com/Stacknova-AI/snova-token-sale-contracts/blob/main/.env.example) environment variables:

## Usage

### Running Tests

To run the tests, use:

```bash
npm run test
```

For test coverage:

```bash
npm run coverage
```

### Deployment

To deploy the contracts on various networks, use the respective command:

```bash
# Ethereum Mainnet
npm run deploy:eth

# Binance Smart Chain
npm run deploy:bsc

# Polygon
npm run deploy:polygon

# Arbitrum
npm run deploy:arbitrum

# Avalanche
npm run deploy:avalanche

# Optimism
npm run deploy:op

# Base
npm run deploy:base
```

## Documentation

To generate the project documentation, use:

```bash
npm run docgen
```

The documentation will be available in the [docs](https://github.com/Stacknova-AI/snova-token-sale-contracts/blob/main/docs/index.md) directory.

## License

This project is licensed under the [MIT License](https://github.com/Stacknova-AI/snova-token-sale-contracts/blob/main/LICENSE).

## Contact

For any inquiries or issues, please open an issue on GitHub.
