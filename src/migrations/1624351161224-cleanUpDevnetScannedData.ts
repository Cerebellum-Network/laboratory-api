import {MigrationInterface, QueryRunner} from "typeorm";

export class cleanUpDevnetScannedData1624351161224 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM transactions WHERE "networkType"='TESTNET_DEV' OR "networkType"='DEVNET'`);

        await queryRunner.query(`DELETE FROM blocks WHERE "networkType"='TESTNET_DEV' OR "networkType"='DEVNET'`);
    }

    public down(queryRunner: QueryRunner): Promise<void> {
        return undefined;
    }
}
