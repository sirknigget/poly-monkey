import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAggregationKeyIndex1772452548255 implements MigrationInterface {
    name = 'AddAggregationKeyIndex1772452548255'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_c990b5c4607a6311daf21171fa" ON "polymarket_activity" ("timestamp", "marketSlug", "outcomePurchased", "side") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c990b5c4607a6311daf21171fa"`);
    }

}
