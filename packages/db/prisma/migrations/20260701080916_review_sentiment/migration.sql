-- CreateEnum
CREATE TYPE "ReviewSentiment" AS ENUM ('positive', 'neutral', 'negative');

-- AlterTable
ALTER TABLE "google_reviews" ADD COLUMN     "sentiment" "ReviewSentiment",
ADD COLUMN     "sentiment_classified_at" TIMESTAMP(3);

