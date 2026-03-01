import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivitiesTable1772392299076 implements MigrationInterface {
  name = 'ActivitiesTable1772392299076';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "polymarket_activity" ("id" SERIAL NOT NULL, "transactionHashes" text array NOT NULL, "timestamp" TIMESTAMP NOT NULL, "eventTitle" character varying NOT NULL, "eventLink" character varying NOT NULL, "marketSlug" character varying NOT NULL, "outcomePurchased" character varying NOT NULL, "side" character varying NOT NULL, "totalPriceUsd" double precision NOT NULL, "numTokens" double precision NOT NULL, "avgPricePerToken" double precision NOT NULL, "activityCount" integer NOT NULL, "orders" jsonb NOT NULL, CONSTRAINT "PK_54a7adee99178aaf4e6e77f17a8" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "polymarket_activity"`);
  }
}
