import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // ------------------------------------------------------------------
  // Resolve the deployer / resolver address
  // ------------------------------------------------------------------
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // RESOLVER_ADDRESS takes priority; fall back to deriving it from the
  // private key (which Hardhat already loaded as the signer).
  const resolverAddress =
    process.env.RESOLVER_ADDRESS ?? deployer.address;

  console.log("Resolver address:", resolverAddress);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(
    "Deployer ETH balance:",
    ethers.formatEther(balance),
    "ETH (used for gas)"
  );

  // ------------------------------------------------------------------
  // Deploy NumixEscrow
  // ------------------------------------------------------------------
  console.log("\nDeploying NumixEscrow...");

  const NumixEscrow = await ethers.getContractFactory("NumixEscrow");
  const escrow = await NumixEscrow.deploy(resolverAddress);
  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();
  console.log("NumixEscrow deployed to:", contractAddress);

  // ------------------------------------------------------------------
  // Verify deployment state
  // ------------------------------------------------------------------
  const deployedResolver = await escrow.resolver();
  const deployedOwner = await escrow.owner();
  console.log("Owner :", deployedOwner);
  console.log("Resolver:", deployedResolver);

  // ------------------------------------------------------------------
  // Persist deployment info to deployments/worldchain.json
  // ------------------------------------------------------------------
  const network = await ethers.provider.getNetwork();
  const deploymentData = {
    network: "worldchain",
    chainId: Number(network.chainId),
    contractName: "NumixEscrow",
    address: contractAddress,
    resolver: deployedResolver,
    owner: deployedOwner,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, "worldchain.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log(`\nDeployment info written to ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
