export const factoryAbi = [
  { type: 'function', name: 'allBattles', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { type: 'function', name: 'battlesLength', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'duration', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { type: 'function', name: 'paused', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'minSeed', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function', name: 'startBattle', stateMutability: 'payable',
    inputs: [
      { name: 'stock', type: 'address' },
      {
        name: 'a', type: 'tuple',
        components: [
          { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' },
          { name: 'logo', type: 'string' }, { name: 'description', type: 'string' },
          {
            name: 'socials', type: 'tuple',
            components: [
              { name: 'twitter', type: 'string' }, { name: 'telegram', type: 'string' },
              { name: 'discord', type: 'string' }, { name: 'website', type: 'string' },
              { name: 'farcaster', type: 'string' },
            ],
          },
          { name: 'creatorFeeRecipient', type: 'address' }, { name: 'creatorTaxBps', type: 'uint16' },
          { name: 'buybackEnabled', type: 'bool' }, { name: 'expectedEconomics', type: 'bytes32' },
          { name: 'salt', type: 'bytes32' },
        ],
      },
      {
        name: 'b', type: 'tuple',
        components: [
          { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' },
          { name: 'logo', type: 'string' }, { name: 'description', type: 'string' },
          {
            name: 'socials', type: 'tuple',
            components: [
              { name: 'twitter', type: 'string' }, { name: 'telegram', type: 'string' },
              { name: 'discord', type: 'string' }, { name: 'website', type: 'string' },
              { name: 'farcaster', type: 'string' },
            ],
          },
          { name: 'creatorFeeRecipient', type: 'address' }, { name: 'creatorTaxBps', type: 'uint16' },
          { name: 'buybackEnabled', type: 'bool' }, { name: 'expectedEconomics', type: 'bytes32' },
          { name: 'salt', type: 'bytes32' },
        ],
      },
      { name: 'launchConfigId', type: 'uint256' },
      { name: 'seedEach', type: 'uint256' },
      { name: 'minTokensOutEach', type: 'uint256' },
    ],
    outputs: [{ type: 'address' }],
  },
] as const;

export const battleAbi = [
  { type: 'function', name: 'stock', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'tokenA', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'tokenB', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'curveA', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'curveB', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'startAt', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { type: 'function', name: 'endAt', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { type: 'function', name: 'peakA', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'peakB', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'winner', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'settled', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'winningWeight', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalHarvested', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'sideWeight', stateMutability: 'view', inputs: [{ type: 'uint8' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'weightOf', stateMutability: 'view', inputs: [{ type: 'uint8' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'claimable', stateMutability: 'view', inputs: [{ type: 'uint8' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function', name: 'sides', stateMutability: 'view', inputs: [{ type: 'uint8' }],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint64' }],
  },
  {
    type: 'function', name: 'positions', stateMutability: 'view', inputs: [{ type: 'uint8' }, { type: 'address' }],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint64' }, { type: 'uint256' }],
  },
  { type: 'function', name: 'enter', stateMutability: 'nonpayable', inputs: [{ type: 'uint8' }, { type: 'uint256' }, { type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ type: 'uint8' }, { type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ type: 'uint8' }, { type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'poke', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'settle', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'harvest', stateMutability: 'nonpayable', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'claim', stateMutability: 'nonpayable', inputs: [{ type: 'uint8' }], outputs: [{ type: 'uint256' }] },
] as const;

export const erc20Abi = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;
