-- AlterTable: Replace youtube_url with video_url and video_cloudinary_id
ALTER TABLE "videos_instructivos" DROP COLUMN "youtube_url";
ALTER TABLE "videos_instructivos" ADD COLUMN "video_url" TEXT;
ALTER TABLE "videos_instructivos" ADD COLUMN "video_cloudinary_id" TEXT;
