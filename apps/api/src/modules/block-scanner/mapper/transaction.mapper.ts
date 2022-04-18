import {TransactionDto} from '../dto/transaction.dto';
import {TransactionEntity} from '../../../../../../libs/block-scanner/src/entities/transaction.entity';

export const toTransactionDto = (data: TransactionEntity): TransactionDto => {
  const {transactionHash, senderId, signature, transactionIndex, success, nonce, events, args, method, timestamp} = data;

  return {
    transactionHash,
    senderId,
    signature,
    transactionIndex,
    success,
    nonce,
    events,
    args,
    method,
    timestamp,
    blockHash: data.block ? data.block.blockHash : null,
  };
};
