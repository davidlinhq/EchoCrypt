export const DEFAULT_ECHO_CONTRACT_ADDRESS = '0x455Fc01961C851b7091Ed22F70e9d725E3e88ac0';

export const ECHO_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'groupId', type: 'uint256' },
      { internalType: 'address', name: 'member', type: 'address' },
    ],
    name: 'AlreadyMember',
    type: 'error',
  },
  { inputs: [], name: 'EmptyCiphertext', type: 'error' },
  { inputs: [], name: 'EmptyGroupName', type: 'error' },
  { inputs: [{ internalType: 'uint256', name: 'groupId', type: 'uint256' }], name: 'GroupDoesNotExist', type: 'error' },
  {
    inputs: [
      { internalType: 'uint256', name: 'groupId', type: 'uint256' },
      { internalType: 'address', name: 'member', type: 'address' },
    ],
    name: 'NotMember',
    type: 'error',
  },
  { inputs: [], name: 'ZamaProtocolUnsupported', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'groupId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
    ],
    name: 'GroupCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'groupId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'member', type: 'address' },
    ],
    name: 'GroupJoined',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'groupId', type: 'uint256' },
      { indexed: true, internalType: 'uint256', name: 'messageIndex', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
    ],
    name: 'MessageSent',
    type: 'event',
  },
  {
    inputs: [],
    name: 'confidentialProtocolId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'externalEaddress', name: 'encryptedKeyExternal', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'createGroup',
    outputs: [{ internalType: 'uint256', name: 'groupId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'groupId', type: 'uint256' }],
    name: 'getGroup',
    outputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'uint64', name: 'createdAt', type: 'uint64' },
      { internalType: 'uint32', name: 'memberCount', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'groupId', type: 'uint256' }],
    name: 'getGroupEncryptedKey',
    outputs: [{ internalType: 'eaddress', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'groupId', type: 'uint256' },
      { internalType: 'uint256', name: 'messageIndex', type: 'uint256' },
    ],
    name: 'getMessage',
    outputs: [
      { internalType: 'address', name: 'sender', type: 'address' },
      { internalType: 'uint64', name: 'timestamp', type: 'uint64' },
      { internalType: 'string', name: 'ciphertext', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'groupId', type: 'uint256' }],
    name: 'getMessageCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'groupCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'groupId', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'isMember',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'groupId', type: 'uint256' }],
    name: 'joinGroup',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'groupId', type: 'uint256' },
      { internalType: 'string', name: 'ciphertext', type: 'string' },
    ],
    name: 'sendMessage',
    outputs: [{ internalType: 'uint256', name: 'messageIndex', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

