import { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract, ethers } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';

import { Header } from './Header';
import { DEFAULT_ECHO_CONTRACT_ADDRESS, ECHO_ABI } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { decryptTextWithAddressKey, encryptTextWithAddressKey } from '../lib/crypto';
import { userDecryptAddress } from '../lib/zama';
import { normalizeAndValidateAddress } from '../lib/address';
import '../styles/EchoApp.css';

type GroupInfo = {
  id: number;
  name: string;
  creator: `0x${string}`;
  createdAt: number;
  memberCount: number;
  isMember: boolean;
};

type ChatMessage = {
  index: number;
  sender: `0x${string}`;
  timestamp: number;
  ciphertext: string;
};

export function EchoApp() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const signerPromise = useEthersSigner({ chainId: sepolia.id });
  const { instance: zama, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [contractAddressInput, setContractAddressInput] = useState(DEFAULT_ECHO_CONTRACT_ADDRESS);
  const [contractAddress, setContractAddress] = useState<`0x${string}`>(() => DEFAULT_ECHO_CONTRACT_ADDRESS);

  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const selectedGroup = useMemo(
    () => (selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : undefined),
    [groups, selectedGroupId],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newMessageText, setNewMessageText] = useState('');

  const [decryptedKeys, setDecryptedKeys] = useState<Record<number, string>>({});
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});

  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<string>('');

  const canUseContract = contractAddress !== DEFAULT_ECHO_CONTRACT_ADDRESS;

  const setStatusFor = (message: string) => setStatus(message);

  const applyContractAddress = useCallback(() => {
    const normalized = normalizeAndValidateAddress(contractAddressInput);
    if (!normalized) {
      setStatusFor('Invalid contract address.');
      return;
    }
    setContractAddress(normalized);
    setSelectedGroupId(null);
    setGroups([]);
    setMessages([]);
    setDecryptedKeys({});
    setDecryptedMessages({});
    setStatusFor('Contract address updated.');
  }, [contractAddressInput]);

  const refreshGroups = useCallback(async () => {
    if (!publicClient || !canUseContract) return;

    setIsBusy(true);
    try {
      setStatusFor('Loading groups...');
      const groupCount = await publicClient.readContract({
        address: contractAddress,
        abi: ECHO_ABI,
        functionName: 'groupCount',
      });

      const count = Number(groupCount as bigint);
      const ids = Array.from({ length: count }, (_, i) => i + 1);

      const groupResults = await Promise.all(
        ids.map(async (id) => {
          const [name, creator, createdAt, memberCount] = (await publicClient.readContract({
            address: contractAddress,
            abi: ECHO_ABI,
            functionName: 'getGroup',
            args: [BigInt(id)],
          })) as unknown as [string, `0x${string}`, bigint, bigint];

          const isMember = address
            ? ((await publicClient.readContract({
                address: contractAddress,
                abi: ECHO_ABI,
                functionName: 'isMember',
                args: [BigInt(id), address],
              })) as boolean)
            : false;

          return {
            id,
            name,
            creator,
            createdAt: Number(createdAt),
            memberCount: Number(memberCount),
            isMember,
          } satisfies GroupInfo;
        }),
      );

      setGroups(groupResults);
      setStatusFor(`Loaded ${groupResults.length} group(s).`);
    } catch (e) {
      console.error(e);
      setStatusFor('Failed to load groups.');
    } finally {
      setIsBusy(false);
    }
  }, [address, canUseContract, contractAddress, publicClient]);

  const refreshMessages = useCallback(
    async (groupId: number) => {
      if (!publicClient || !canUseContract) return;

      setIsBusy(true);
      try {
        setStatusFor('Loading messages...');
        const messageCount = await publicClient.readContract({
          address: contractAddress,
          abi: ECHO_ABI,
          functionName: 'getMessageCount',
          args: [BigInt(groupId)],
        });

        const count = Number(messageCount as bigint);
        const indexes = Array.from({ length: count }, (_, i) => i);

        const results = await Promise.all(
          indexes.map(async (index) => {
            const [sender, timestamp, ciphertext] = (await publicClient.readContract({
              address: contractAddress,
              abi: ECHO_ABI,
              functionName: 'getMessage',
              args: [BigInt(groupId), BigInt(index)],
            })) as unknown as [`0x${string}`, bigint, string];

            return {
              index,
              sender,
              timestamp: Number(timestamp),
              ciphertext,
            } satisfies ChatMessage;
          }),
        );

        setMessages(results);
        setStatusFor(`Loaded ${results.length} message(s).`);
      } catch (e) {
        console.error(e);
        setStatusFor('Failed to load messages.');
      } finally {
        setIsBusy(false);
      }
    },
    [canUseContract, contractAddress, publicClient],
  );

  useEffect(() => {
    if (!canUseContract) return;
    void refreshGroups();
  }, [canUseContract, refreshGroups, address]);

  useEffect(() => {
    if (!selectedGroupId) return;
    void refreshMessages(selectedGroupId);
  }, [selectedGroupId, refreshMessages]);

  const getEthersContract = useCallback(async () => {
    if (!signerPromise) throw new Error('Signer not available.');
    const signer = await signerPromise;
    if (!signer) throw new Error('Signer not available.');
    return new Contract(contractAddress, ECHO_ABI, signer);
  }, [contractAddress, signerPromise]);

  const createGroup = useCallback(async () => {
    if (!zama || zamaLoading) {
      setStatusFor('Encryption service is not ready.');
      return;
    }
    if (!address) {
      setStatusFor('Connect your wallet first.');
      return;
    }
    if (!canUseContract) {
      setStatusFor('Set the Echo contract address first.');
      return;
    }
    if (!newGroupName.trim()) {
      setStatusFor('Group name is required.');
      return;
    }

    setIsBusy(true);
    try {
      setStatusFor('Encrypting group key...');
      const groupKey = ethers.Wallet.createRandom().address;
      const input = zama.createEncryptedInput(contractAddress, address);
      input.addAddress(groupKey);
      const encryptedInput = await input.encrypt();

      const echo = await getEthersContract();
      setStatusFor('Submitting createGroup transaction...');
      const tx = await echo.createGroup(newGroupName.trim(), encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      setNewGroupName('');
      setStatusFor('Group created. Refreshing...');
      await refreshGroups();
    } catch (e) {
      console.error(e);
      setStatusFor('Failed to create group.');
    } finally {
      setIsBusy(false);
    }
  }, [address, canUseContract, contractAddress, getEthersContract, newGroupName, refreshGroups, zama, zamaLoading]);

  const joinGroup = useCallback(
    async (groupId: number) => {
      if (!address) {
        setStatusFor('Connect your wallet first.');
        return;
      }
      if (!canUseContract) {
        setStatusFor('Set the Echo contract address first.');
        return;
      }

      setIsBusy(true);
      try {
        const echo = await getEthersContract();
        setStatusFor(`Submitting joinGroup(${groupId})...`);
        const tx = await echo.joinGroup(groupId);
        await tx.wait();
        setStatusFor('Joined group. Refreshing...');
        await refreshGroups();
      } catch (e) {
        console.error(e);
        setStatusFor('Failed to join group.');
      } finally {
        setIsBusy(false);
      }
    },
    [address, canUseContract, getEthersContract, refreshGroups],
  );

  const decryptGroupKey = useCallback(
    async (groupId: number): Promise<string | null> => {
      if (!zama || zamaLoading) {
        setStatusFor('Encryption service is not ready.');
        return null;
      }
      if (!address) {
        setStatusFor('Connect your wallet first.');
        return null;
      }
      if (!canUseContract) {
        setStatusFor('Set the Echo contract address first.');
        return null;
      }
      if (!publicClient) return null;
      if (!signerPromise) {
        setStatusFor('Signer not available.');
        return null;
      }

      setIsBusy(true);
      try {
        setStatusFor('Fetching encrypted group key...');
        const handle = (await publicClient.readContract({
          address: contractAddress,
          abi: ECHO_ABI,
          functionName: 'getGroupEncryptedKey',
          args: [BigInt(groupId)],
        })) as string;

        const signer = await signerPromise;
        if (!signer) throw new Error('Signer not available.');

        setStatusFor('Requesting decryption...');
        const clearKey = await userDecryptAddress(zama, signer, contractAddress, handle, address);
        setDecryptedKeys((prev) => ({ ...prev, [groupId]: clearKey }));
        setStatusFor('Group key decrypted.');
        return clearKey;
      } catch (e) {
        console.error(e);
        setStatusFor('Failed to decrypt group key. Make sure you joined the group.');
        return null;
      } finally {
        setIsBusy(false);
      }
    },
    [address, canUseContract, contractAddress, publicClient, signerPromise, zama, zamaLoading],
  );

  const sendMessage = useCallback(async () => {
    if (!address) {
      setStatusFor('Connect your wallet first.');
      return;
    }
    if (!selectedGroupId) {
      setStatusFor('Select a group first.');
      return;
    }
    if (!canUseContract) {
      setStatusFor('Set the Echo contract address first.');
      return;
    }
    if (!newMessageText.trim()) {
      setStatusFor('Message cannot be empty.');
      return;
    }

    setIsBusy(true);
    try {
      let groupKey = decryptedKeys[selectedGroupId];
      if (!groupKey) {
        groupKey = (await decryptGroupKey(selectedGroupId)) ?? '';
      }
      if (!groupKey) {
        setStatusFor('Group key is not available yet.');
        return;
      }

      setStatusFor('Encrypting message...');
      const ciphertext = await encryptTextWithAddressKey(newMessageText.trim(), groupKey);

      const echo = await getEthersContract();
      setStatusFor('Submitting sendMessage transaction...');
      const tx = await echo.sendMessage(selectedGroupId, ciphertext);
      await tx.wait();

      setNewMessageText('');
      setStatusFor('Message sent. Refreshing...');
      await refreshMessages(selectedGroupId);
    } catch (e) {
      console.error(e);
      setStatusFor('Failed to send message.');
    } finally {
      setIsBusy(false);
    }
  }, [
    address,
    canUseContract,
    decryptGroupKey,
    decryptedKeys,
    getEthersContract,
    newMessageText,
    refreshMessages,
    selectedGroupId,
  ]);

  const decryptMessage = useCallback(
    async (messageIndex: number) => {
      if (!selectedGroupId) return;
      const groupKey = decryptedKeys[selectedGroupId];
      if (!groupKey) {
        setStatusFor('Decrypt the group key first.');
        return;
      }

      const message = messages.find((m) => m.index === messageIndex);
      if (!message) return;

      setIsBusy(true);
      try {
        const clear = await decryptTextWithAddressKey(message.ciphertext, groupKey);
        const mapKey = `${selectedGroupId}:${messageIndex}`;
        setDecryptedMessages((prev) => ({ ...prev, [mapKey]: clear }));
        setStatusFor('Message decrypted.');
      } catch (e) {
        console.error(e);
        setStatusFor('Failed to decrypt message.');
      } finally {
        setIsBusy(false);
      }
    },
    [decryptedKeys, messages, selectedGroupId],
  );

  return (
    <div className="echo-page">
      <Header />

      <main className="echo-main">
        <section className="echo-settings">
          <div className="echo-card">
            <div className="echo-card-title">Contract</div>
            <div className="echo-row">
              <input
                className="echo-input"
                value={contractAddressInput}
                onChange={(e) => setContractAddressInput(e.target.value)}
                placeholder="Echo contract address on Sepolia (0x...)"
              />
              <button className="echo-button" onClick={applyContractAddress} disabled={isBusy}>
                Apply
              </button>
              <button className="echo-button secondary" onClick={() => void refreshGroups()} disabled={isBusy || !canUseContract}>
                Refresh
              </button>
            </div>
            <div className="echo-muted">
              {zamaError ? `Encryption service error: ${zamaError}` : zamaLoading ? 'Initializing encryption service...' : 'Encryption service ready.'}
            </div>
          </div>

          <div className="echo-card">
            <div className="echo-card-title">Create Group</div>
            <div className="echo-row">
              <input
                className="echo-input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
              />
              <button className="echo-button" onClick={() => void createGroup()} disabled={isBusy || !canUseContract}>
                Create
              </button>
            </div>
          </div>

          <div className="echo-status">{status}</div>
        </section>

        <section className="echo-content">
          <aside className="echo-sidebar">
            <div className="echo-card">
              <div className="echo-card-title">Groups</div>
              <div className="echo-group-list">
                {groups.length === 0 ? <div className="echo-muted">No groups loaded.</div> : null}
                {groups.map((g) => (
                  <button
                    key={g.id}
                    className={`echo-group-item ${selectedGroupId === g.id ? 'selected' : ''}`}
                    onClick={() => setSelectedGroupId(g.id)}
                  >
                    <div className="echo-group-name">
                      #{g.id} {g.name}
                    </div>
                    <div className="echo-group-meta">
                      Members: {g.memberCount} {g.isMember ? '(Joined)' : ''}
                    </div>
                          {!g.isMember && address ? (
                            <div className="echo-group-actions">
                              <span
                                className="echo-link"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void joinGroup(g.id);
                                }}
                              >
                                Join
                              </span>
                            </div>
                          ) : null}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="echo-chat">
            <div className="echo-card echo-chat-card">
              <div className="echo-card-title">Chat</div>
              {!selectedGroup ? (
                <div className="echo-muted">Select a group to view messages.</div>
              ) : (
                <>
                  <div className="echo-chat-header">
                    <div className="echo-chat-title">
                      Group #{selectedGroup.id}: {selectedGroup.name}
                    </div>
                    <div className="echo-chat-actions">
                      <button
                        className="echo-button secondary"
                        onClick={() => void decryptGroupKey(selectedGroup.id)}
                        disabled={isBusy || !selectedGroup.isMember}
                      >
                        Decrypt Key
                      </button>
                      <button className="echo-button secondary" onClick={() => void refreshMessages(selectedGroup.id)} disabled={isBusy}>
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="echo-muted">
                    Key status: {decryptedKeys[selectedGroup.id] ? 'Decrypted' : selectedGroup.isMember ? 'Not decrypted' : 'Join required'}
                  </div>

                  <div className="echo-messages">
                    {messages.length === 0 ? <div className="echo-muted">No messages.</div> : null}
                    {messages.map((m) => {
                      const mapKey = `${selectedGroup.id}:${m.index}`;
                      const clear = decryptedMessages[mapKey];
                      return (
                        <div className="echo-message" key={m.index}>
                          <div className="echo-message-meta">
                            <span className="echo-mono">{m.sender}</span> •{' '}
                            <span>{new Date(m.timestamp * 1000).toLocaleString()}</span>
                          </div>
                          <div className="echo-message-body">
                            {clear ? <div className="echo-message-clear">{clear}</div> : <div className="echo-message-cipher">{m.ciphertext}</div>}
                          </div>
                          {!clear ? (
                            <button className="echo-button small" onClick={() => void decryptMessage(m.index)} disabled={isBusy}>
                              Decrypt
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="echo-compose">
                    <textarea
                      className="echo-textarea"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder={selectedGroup.isMember ? 'Write a message...' : 'Join the group to send messages.'}
                      disabled={!selectedGroup.isMember || isBusy}
                    />
                    <button className="echo-button" onClick={() => void sendMessage()} disabled={!selectedGroup.isMember || isBusy}>
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
