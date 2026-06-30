-- CreateEnum
CREATE TYPE "SenderProvider" AS ENUM ('shared', 'postmark_domain');

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "from_email_domain_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reply_to_email" TEXT,
ADD COLUMN     "sender_provider" "SenderProvider" NOT NULL DEFAULT 'shared';

