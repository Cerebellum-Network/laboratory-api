import {TransactionDto} from '../dto/transaction.dto';
import {TransactionEntity} from '../entities/transaction.entity';

export const toTransactionDto = (data: TransactionEntity): TransactionDto => {
  const {
    transactionHash,

    senderId,

    signature,

    transactionIndex,

    success,

    nonce,

    destination,

    value,

    events,

    args,
  } = data;

  return {
    transactionHash,

    senderId,

    signature,

    transactionIndex,

    success,

    nonce,

    destination,

    value,

    events,

    args,
  };
};
