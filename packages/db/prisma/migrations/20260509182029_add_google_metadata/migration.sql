-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "google_address" TEXT,
ADD COLUMN     "google_rating" DOUBLE PRECISION,
ADD COLUMN     "google_reviews_count" INTEGER;

