import type { JsonRpcSigner } from 'ethers';

type HandleContractPair = {
  handle: string;
  contractAddress: string;
};

export async function userDecryptAddress(
  zamaInstance: any,
  signer: JsonRpcSigner,
  contractAddress: string,
  ciphertextHandle: string,
  userAddress: string,
): Promise<string> {
  const keypair = zamaInstance.generateKeypair();
  const handleContractPairs: HandleContractPair[] = [
    {
      handle: ciphertextHandle,
      contractAddress,
    },
  ];
  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '10';
  const contractAddresses = [contractAddress];

  const eip712 = zamaInstance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
  const signature = await signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message,
  );

  const result = await zamaInstance.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace('0x', ''),
    contractAddresses,
    userAddress,
    startTimeStamp,
    durationDays,
  );

  const decrypted = result[ciphertextHandle];
  if (!decrypted) throw new Error('Decryption returned empty result.');
  return decrypted as string;
}

