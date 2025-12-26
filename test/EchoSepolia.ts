import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { Echo } from "../types";
import { expect } from "chai";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EchoSepolia", function () {
  let signers: Signers;
  let echo: Echo;
  let echoAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("Echo");
      echoAddress = deployment.address;
      echo = await ethers.getContractAt("Echo", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("creates a group and decrypts the group key", async function () {
    steps = 8;
    this.timeout(6 * 40000);

    const groupName = `Echo-${Date.now()}`;
    const groupKey = ethers.Wallet.createRandom().address;

    progress(`Encrypting group key=${groupKey}...`);
    const encryptedKeyInput = await fhevm.createEncryptedInput(echoAddress, signers.alice.address).addAddress(groupKey).encrypt();

    progress(`Call Echo.createGroup("${groupName}")...`);
    const tx = await echo.createGroup(groupName, encryptedKeyInput.handles[0], encryptedKeyInput.inputProof);
    await tx.wait();

    progress(`Call Echo.groupCount()...`);
    const groupId = await echo.groupCount();
    expect(groupId).to.not.eq(0);

    progress(`Call Echo.getGroupEncryptedKey(${groupId})...`);
    const encryptedKeyHandle = await echo.getGroupEncryptedKey(groupId);

    progress(`Decrypting Echo.getGroupEncryptedKey(${groupId})=${encryptedKeyHandle}...`);
    const clearKey = await fhevm.userDecryptEaddress(encryptedKeyHandle, echoAddress, signers.alice);
    progress(`Clear group key=${clearKey}`);

    expect(clearKey.toLowerCase()).to.eq(groupKey.toLowerCase());
  });
});

