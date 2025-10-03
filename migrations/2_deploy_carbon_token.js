const CarbonToken = artifacts.require("CarbonToken");

module.exports = function (deployer) {
  // Deploy with initial supply of 1,000,000 tokens
  deployer.deploy(CarbonToken, 100000);
};
