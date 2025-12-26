import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { Echo, Echo__factory } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("Echo")) as Echo__factory;
  const echo = (await factory.deploy()) as Echo;
  const address = await echo.getAddress();
  return { echo, address };
}

describe("Echo", function () {
  let signers: Signers;
  let echo: Echo;
  let echoAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ echo, address: echoAddress } = await deployFixture());
  });

  it("creates a group and shares the key with members", async function () {
    const groupKey = ethers.Wallet.createRandom().address;
    const encryptedKeyInput = await fhevm
      .createEncryptedInput(echoAddress, signers.alice.address)
      .addAddress(groupKey)
      .encrypt();

    const tx = await echo.connect(signers.alice).createGroup("My Echo", encryptedKeyInput.handles[0], encryptedKeyInput.inputProof);
    await tx.wait();

    expect(await echo.groupCount()).to.eq(1);

    const encryptedKeyHandle = await echo.getGroupEncryptedKey(1);

    const aliceClear = await fhevm.userDecryptEaddress(encryptedKeyHandle, echoAddress, signers.alice);
    expect(aliceClear.toLowerCase()).to.eq(groupKey.toLowerCase());

    let bobDecryptFailed = false;
    try {
      await fhevm.userDecryptEaddress(encryptedKeyHandle, echoAddress, signers.bob);
    } catch {
      bobDecryptFailed = true;
    }
    expect(bobDecryptFailed).to.eq(true);

    const joinTx = await echo.connect(signers.bob).joinGroup(1);
    await joinTx.wait();

    const bobClear = await fhevm.userDecryptEaddress(encryptedKeyHandle, echoAddress, signers.bob);
    expect(bobClear.toLowerCase()).to.eq(groupKey.toLowerCase());
  });

  it("requires membership to send messages", async function () {
    const groupKey = ethers.Wallet.createRandom().address;
    const encryptedKeyInput = await fhevm
      .createEncryptedInput(echoAddress, signers.alice.address)
      .addAddress(groupKey)
      .encrypt();
    await (await echo.connect(signers.alice).createGroup("g", encryptedKeyInput.handles[0], encryptedKeyInput.inputProof)).wait();

    await expect(echo.connect(signers.bob).sendMessage(1, "ciphertext")).to.be.revertedWithCustomError(
      echo,
      "NotMember",
    );

    await (await echo.connect(signers.bob).joinGroup(1)).wait();
    await (await echo.connect(signers.bob).sendMessage(1, "ciphertext")).wait();

    expect(await echo.getMessageCount(1)).to.eq(1);
    const m = await echo.getMessage(1, 0);
    expect(m[0]).to.eq(signers.bob.address);
    expect(m[2]).to.eq("ciphertext");
  });
});

