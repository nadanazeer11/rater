-- AlterTable
ALTER TABLE "google_reviews" ADD COLUMN     "owner_replied_at" TIMESTAMP(3),
ADD COLUMN     "owner_reply_text" TEXT;

