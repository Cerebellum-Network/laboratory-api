export class BlockStatusDto {
  public constructor(
    public readonly isDelay: boolean,
    public readonly finalizedBlock: number,
    public readonly bestBlock: number,
  ) {}
}
