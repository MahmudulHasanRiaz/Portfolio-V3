-- Cleanup legacy test/sample data so production finance and freelance modules show accurate live numbers
-- Fixed: workflow_logs has no workflow_id column (it links via run_id -> workflow_runs.id);
-- the TEST workflow id is 64195555-ddf7-4633-bb36-aca4faaddf2d (not the zeroed UUID);
-- broad ILIKE '%test%' filters removed (they would also match real rows containing "test",
-- e.g. "latest") — deletes now use exact TEST ids only, except the expense rule which
-- requires BOTH the 500 BDT amount AND a test description.

DELETE FROM "finance_payments" 
WHERE "client_id" = 'e99f6275-9a83-49bb-a932-66ee422d82c5';
--> statement-breakpoint

DELETE FROM "finance_invoices" 
WHERE "client_id" = 'e99f6275-9a83-49bb-a932-66ee422d82c5'
   OR "invoice_number" IN ('INV-TEST-001', 'INV-TEST-002');
--> statement-breakpoint

DELETE FROM "finance_expenses" 
WHERE ("amount" = 500 AND "currency" = 'BDT' AND "description" ILIKE '%test%');
--> statement-breakpoint

DELETE FROM "proposal_documents" 
WHERE "client_id" = 'e99f6275-9a83-49bb-a932-66ee422d82c5';
--> statement-breakpoint

DELETE FROM "project_deliverables" 
WHERE "project_id" IN ('83e8ab23-5674-41bf-b9b9-04d7ee408118', '2f841015-716f-42e3-b0bb-50bf9376d5b2');
--> statement-breakpoint

DELETE FROM "project_milestones" 
WHERE "project_id" IN ('83e8ab23-5674-41bf-b9b9-04d7ee408118', '2f841015-716f-42e3-b0bb-50bf9376d5b2');
--> statement-breakpoint

DELETE FROM "project_activity_logs" 
WHERE "project_id" IN ('83e8ab23-5674-41bf-b9b9-04d7ee408118', '2f841015-716f-42e3-b0bb-50bf9376d5b2');
--> statement-breakpoint

DELETE FROM "portal_messages" 
WHERE "sender_id" = 'e99f6275-9a83-49bb-a932-66ee422d82c5';
--> statement-breakpoint

DELETE FROM "portal_sessions" 
WHERE "client_email" = 'testlead@example.com';
--> statement-breakpoint

DELETE FROM "workflow_logs" 
WHERE "run_id" IN (SELECT "id" FROM "workflow_runs" WHERE "workflow_id" = '64195555-ddf7-4633-bb36-aca4faaddf2d');
--> statement-breakpoint

DELETE FROM "workflow_runs" 
WHERE "workflow_id" = '64195555-ddf7-4633-bb36-aca4faaddf2d';
--> statement-breakpoint

DELETE FROM "workflows" 
WHERE "id" = '64195555-ddf7-4633-bb36-aca4faaddf2d';
--> statement-breakpoint

DELETE FROM "projects_freelance" 
WHERE "id" IN ('83e8ab23-5674-41bf-b9b9-04d7ee408118', '2f841015-716f-42e3-b0bb-50bf9376d5b2')
   OR "client_id" = 'e99f6275-9a83-49bb-a932-66ee422d82c5';
--> statement-breakpoint

DELETE FROM "lead_activities" 
WHERE "lead_id" = 'e99f6275-9a83-49bb-a932-66ee422d82c5';
--> statement-breakpoint

DELETE FROM "lead_notes" 
WHERE "lead_id" = 'e99f6275-9a83-49bb-a932-66ee422d82c5';
--> statement-breakpoint

DELETE FROM "leads" 
WHERE "id" = 'e99f6275-9a83-49bb-a932-66ee422d82c5' 
   OR "email" = 'testlead@example.com';
