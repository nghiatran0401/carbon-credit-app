const CarbonCreditToken = artifacts.require("CarbonCreditToken");

module.exports = function (deployer) {
  // Deploy with a base URI for metadata
  // You can change this to point to your actual metadata storage
  const baseURI = "https://api.carboncredit.example.com/metadata/";

  deployer.deploy(CarbonCreditToken, baseURI);
};
