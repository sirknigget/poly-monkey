import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAddressTable1772394076011 implements MigrationInterface {
  name = 'UserAddressTable1772394076011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_address" ("address" character varying NOT NULL, CONSTRAINT "PK_95ece5968875ece5e5a6fe16d59" PRIMARY KEY ("address"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_address"`);
  }
}
