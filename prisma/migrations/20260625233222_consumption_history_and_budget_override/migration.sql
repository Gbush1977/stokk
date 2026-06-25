-- RenameTable
ALTER TABLE "usage_logs" RENAME TO "consumption_history";

-- RenameConstraint
ALTER TABLE "consumption_history" RENAME CONSTRAINT "usage_logs_pkey" TO "consumption_history_pkey";
ALTER TABLE "consumption_history" RENAME CONSTRAINT "usage_logs_product_id_fkey" TO "consumption_history_product_id_fkey";

-- AlterTable
ALTER TABLE "products" ADD COLUMN "budget_override" BOOLEAN NOT NULL DEFAULT false;
