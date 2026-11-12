import { pgTable, uuid, text, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { formFieldType } from "../enums";

export const formFields = pgTable("form_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id"),
  label: text("label"),
  fieldType: formFieldType("field_type"),
  isRequired: boolean("is_required"),
  placeholder: text("placeholder"),
  description: text("description"),
  options: jsonb("options"),
  validationRules: jsonb("validation_rules"),
  sortOrder: integer("sort_order"),
});
