/*
  Warnings:

  - Added the required column `updated_at` to the `chat_soporte` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "push_token" TEXT;

-- AlterTable
ALTER TABLE "chat_soporte" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
