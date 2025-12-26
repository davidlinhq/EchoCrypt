import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Example:
 *   - npx hardhat --network sepolia task:echo-address
 */
task("task:echo-address", "Prints the Echo contract address").setAction(async function (_: TaskArguments, hre) {
  const { deployments } = hre;
  const echo = await deployments.get("Echo");
  console.log("Echo address is " + echo.address);
});

/**
 * Example:
 *   - npx hardhat --network sepolia task:echo-create-group --name "My Echo"
 */
task("task:echo-create-group", "Creates a group with a fresh encrypted key")
  .addParam("name", "Group name")
  .addOptionalParam("address", "Optionally specify the Echo contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const EchoDeployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("Echo");
    const [signer] = await ethers.getSigners();
    const echo = await ethers.getContractAt("Echo", EchoDeployment.address);

    const randomAddr = ethers.Wallet.createRandom().address;
    const encryptedInput = await fhevm
      .createEncryptedInput(EchoDeployment.address, signer.address)
      .addAddress(randomAddr)
      .encrypt();

    const tx = await echo.createGroup(taskArguments.name, encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Created group name="${taskArguments.name}" key=${randomAddr}`);
  });

