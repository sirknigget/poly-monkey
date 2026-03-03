import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileToUserAddress1772524484621 implements MigrationInterface {
    name = 'AddProfileToUserAddress1772524484621'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_address" ADD "profile" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_address" DROP COLUMN "profile"`);
    }

}
