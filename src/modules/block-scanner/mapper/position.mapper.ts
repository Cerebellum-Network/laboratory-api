import {BlockDto} from '../dto/block.dto';
import {BlockEntity} from '../entities/block.entity';

export const toBlockDto = (data: BlockEntity): BlockDto => {
  const {id, blockNumber, blockHash, parentHash, stateRoot, extrinsicRoot, authorPublicKey, timestamp} = data;

  return {
    id,
    blockNumber,
    blockHash,
    parentHash,
    stateRoot,
    extrinsicRoot,
    authorPublicKey,
    timestamp,
  };
};
