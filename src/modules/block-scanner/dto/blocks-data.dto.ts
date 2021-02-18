import {BlockDto} from './block.dto';

export class BlocksDataDto {
  public constructor(
    public readonly data: BlockDto[],
    public readonly count: number,
  ) {}
}
