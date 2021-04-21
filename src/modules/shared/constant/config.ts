const config = {
  ChainId: 'u8',
  DepositNonce: 'u64',
  ResourceId: '[u8; 32]',
  ProposalVotes: {
    votes_for: 'Vec<AccountId>',
    votes_against: 'Vec<AccountId>',
    status: 'enum',
    expiry: 'BlockNumber'
  },
  TokenId: 'U256',
  Erc721Token: {
    id: 'TokenId',
    metadata: 'Vec<u8>'
  },
};

const submitExtrinsicConfig = {
  Address: 'AccountId',
  LookupSource: 'Address',
};

export default config;

export {submitExtrinsicConfig};