-- DropIndex
DROP INDEX "location_users_clerk_user_id_idx";

-- DropIndex
DROP INDEX "location_users_location_id_clerk_user_id_key";

-- DropIndex
DROP INDEX "locations_clerk_organization_id_key";

-- AlterTable
ALTER TABLE "location_users" DROP COLUMN "clerk_user_id",
ADD COLUMN     "auth_user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "locations" DROP COLUMN "clerk_organization_id";

-- CreateIndex
CREATE INDEX "location_users_auth_user_id_idx" ON "location_users"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_users_location_id_auth_user_id_key" ON "location_users"("location_id", "auth_user_id");

