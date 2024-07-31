# <img src="https://private-user-images.githubusercontent.com/103837756/354002804-cce06117-94b8-4a09-a51a-a9c10b4fc46c.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MjI0NjE1NjAsIm5iZiI6MTcyMjQ2MTI2MCwicGF0aCI6Ii8xMDM4Mzc3NTYvMzU0MDAyODA0LWNjZTA2MTE3LTk0YjgtNGEwOS1hNTFhLWE5YzEwYjRmYzQ2Yy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjQwNzMxJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI0MDczMVQyMTI3NDBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0zMWZkZTU3M2U2M2FjODgzZjhlOWQxOTY3ZGQwN2RhODQ5OGQ3NGZlODRhODFlMWQwYmFkODI5YTU1YmRkY2UyJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZhY3Rvcl9pZD0wJmtleV9pZD0wJnJlcG9faWQ9MCJ9.YocgLvGUNDBezk49SxTFlPfuzIX9eimxOGD4BqVIGaM" alt="Stacknova AI" width="27" height="27" /> Stacknova AI: Pre-sale Contract for SNOVA Tokens <img src="https://private-user-images.githubusercontent.com/103837756/354002804-cce06117-94b8-4a09-a51a-a9c10b4fc46c.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MjI0NjE1NjAsIm5iZiI6MTcyMjQ2MTI2MCwicGF0aCI6Ii8xMDM4Mzc3NTYvMzU0MDAyODA0LWNjZTA2MTE3LTk0YjgtNGEwOS1hNTFhLWE5YzEwYjRmYzQ2Yy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjQwNzMxJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI0MDczMVQyMTI3NDBaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0zMWZkZTU3M2U2M2FjODgzZjhlOWQxOTY3ZGQwN2RhODQ5OGQ3NGZlODRhODFlMWQwYmFkODI5YTU1YmRkY2UyJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZhY3Rvcl9pZD0wJmtleV9pZD0wJnJlcG9faWQ9MCJ9.YocgLvGUNDBezk49SxTFlPfuzIX9eimxOGD4BqVIGaM" alt="Stacknova AI" width="27" height="27" />

<!-- [![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Documentation Status](https://img.shields.io/badge/Docs-latest-orange.svg)](https://github.com/ILESKOV/Presale/blob/experimental/Stacknova_Presale/docs/index.md) -->

## Table of Contents

-   [Description](#description)
-   [Installation](#installation)
-   [Usage](#usage)
    -   [Running Tests](#running-tests)
    -   [Deployment](#deployment)
-   [Configuration](#configuration)
    -   [Environment Variables](#environment-variables)
-   [Documentation](#documentation)
-   [License](#license)
-   [Contact](#contact)

## Description

This project includes smart contracts for the pre-sale phase of SNOVA tokens. It allows for contributions in native currency and stablecoins (USDT, USDC, DAI). The contracts ensure dynamic pricing through Chainlink price feeds, role management, and secure transaction processing. It also incorporates a referral system for incentivizing early participants.

## Installation

To install the project dependencies, run:

```bash
yarn install
```

## Usage

### Running Tests

To run the tests, use:

```bash
yarn test
```

For test coverage:

```bash
yarn run coverage
```

### Deployment

To deploy the contracts on various networks, use the respective command:

```bash
# Ethereum Mainnet
yarn run deploy:eth

# Binance Smart Chain
yarn run deploy:bsc

# Polygon
yarn run deploy:polygon

# Arbitrum
yarn run deploy:arbitrum

# Avalanche
yarn run deploy:avalanche

# Optimism
yarn run deploy:op

# Base
yarn run deploy:base
```

## Configuration

### Environment Variables

Create a .env file in the root directory and add the [following](https://github.com/ILESKOV/Presale/blob/experimental/Stacknova_Presale/.env.example) environment variables:

## Documentation

To generate the project documentation, use:

```bash
yarn run docgen
```

The documentation will be available in the [docs](https://github.com/ILESKOV/Presale/blob/experimental/Stacknova_Presale/docs/index.md) directory.

## License

This project is licensed under the [MIT License](https://github.com/ILESKOV/Presale/blob/experimental/Stacknova_Presale/LICENSE).

## Contact

For any inquiries or issues, please open an issue on GitHub.
