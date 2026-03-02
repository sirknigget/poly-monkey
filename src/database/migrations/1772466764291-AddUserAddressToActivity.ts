import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAddressToActivity1772466764291 implements MigrationInterface {
    name = 'AddUserAddressToActivity1772466764291'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c990b5c4607a6311daf21171fa"`);
        await queryRunner.query(`ALTER TABLE "polymarket_activity" ADD "userAddress" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_885b099a13de6cc0d555eeba8e" ON "polymarket_activity" ("timestamp", "marketSlug", "outcomePurchased", "side", "userAddress") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_885b099a13de6cc0d555eeba8e"`);
        await queryRunner.query(`ALTER TABLE "polymarket_activity" DROP COLUMN "userAddress"`);
        await queryRunner.query(`CREATE INDEX "IDX_c990b5c4607a6311daf21171fa" ON "polymarket_activity" ("timestamp", "marketSlug", "outcomePurchased", "side") `);
    }

}
