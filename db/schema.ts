import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flightId: text("flight_id").notNull(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  required: integer("required_count").notNull(),
  loaded: integer("loaded_count").notNull(),
  unit: text("unit").notNull(),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  workflowStatus: text("workflow_status").notNull().default("draft"),
  preparedBy: text("prepared_by").notNull().default(""),
  submittedAt: text("submitted_at"),
  crewVerifiedBy: text("crew_verified_by").notNull().default(""),
  crewVerifiedAt: text("crew_verified_at"),
  cateringNotes: text("catering_notes").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_inventory_items_flight_id").on(table.flightId), index("idx_inventory_items_flight_workflow").on(table.flightId, table.workflowStatus)]);

export const handovers = sqliteTable("handovers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromFlightId: text("from_flight_id").notNull(),
  toFlightNo: text("to_flight_no").notNull(),
  toRoute: text("to_route").notNull(),
  toCrew: text("to_crew").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("sent"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_handovers_from_flight_id").on(table.fromFlightId)]);

export const rfidCredentials = sqliteTable("rfid_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }), userId: integer("user_id").notNull(), cardHash: text("card_hash").notNull(), cardFingerprint: text("card_fingerprint").notNull(), active: integer("active", { mode: "boolean" }).notNull().default(true), enrolledAt: text("enrolled_at").notNull().default(sql`CURRENT_TIMESTAMP`), lastUsedAt: text("last_used_at"),
}, (table) => [uniqueIndex("idx_rfid_credentials_card_hash").on(table.cardHash), index("idx_rfid_credentials_user_active").on(table.userId, table.active)]);

export const rfidChallenges = sqliteTable("rfid_challenges", {
  id: text("id").primaryKey(), userId: integer("user_id").notNull(), purpose: text("purpose").notNull(), expiresAt: text("expires_at").notNull(), usedAt: text("used_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_rfid_challenges_user_expiry").on(table.userId, table.expiresAt)]);

export const handoverSignatures = sqliteTable("handover_signatures", {
  id: integer("id").primaryKey({ autoIncrement: true }), handoverId: integer("handover_id").notNull(), userId: integer("user_id").notNull(), signerName: text("signer_name").notNull(), employeeId: text("employee_id").notNull(), purpose: text("purpose").notNull(), cardFingerprint: text("card_fingerprint").notNull(), signatureHash: text("signature_hash").notNull(), validationStatus: text("validation_status").notNull().default("valid"), signedAt: text("signed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_handover_signatures_handover_purpose").on(table.handoverId, table.purpose), index("idx_handover_signatures_user_id").on(table.userId)]);

export const flights = sqliteTable("flights", {
  flightNo: text("flight_no").primaryKey(),
  flightDate: text("flight_date").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  departure: text("departure").notNull(),
  aircraft: text("aircraft").notNull(),
  registration: text("registration").notNull(),
  gate: text("gate").notNull(),
  passengers: integer("passengers").notNull().default(0),
  status: text("status").notNull().default("scheduled"),
  readiness: integer("readiness").notNull().default(0),
  supervisor: text("supervisor").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_flights_flight_date").on(table.flightDate),
  index("idx_flights_status").on(table.status),
]);

export const crewUsers = sqliteTable("crew_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  employeeId: text("employee_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  station: text("station").notNull().default("ISB"),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull().default(150000),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_crew_users_email").on(table.email), uniqueIndex("idx_crew_users_employee_id").on(table.employeeId)]);

export const crewSessions = sqliteTable("crew_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_crew_sessions_token_hash").on(table.tokenHash), index("idx_crew_sessions_user_id").on(table.userId), index("idx_crew_sessions_expires_at").on(table.expiresAt)]);

export const crewPlans = sqliteTable("crew_plans", {
  flightNo: text("flight_no").primaryKey(),
  baseCabinCrew: integer("base_cabin_crew").notNull(),
  leadCrew: integer("lead_crew").notNull().default(1),
  additionalCrew: integer("additional_crew").notNull().default(0),
  doubleCrew: integer("double_crew", { mode: "boolean" }).notNull().default(false),
  requiredTotal: integer("required_total").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const crewAssignments = sqliteTable("crew_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flightNo: text("flight_no").notNull(),
  userId: integer("user_id"),
  crewName: text("crew_name").notNull(),
  employeeId: text("employee_id").notNull(),
  assignmentRole: text("assignment_role").notNull(),
  status: text("status").notNull().default("confirmed"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_crew_assignments_flight_no").on(table.flightNo), uniqueIndex("idx_crew_assignments_flight_employee").on(table.flightNo, table.employeeId)]);

export const departmentHandovers = sqliteTable("department_handovers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flightNo: text("flight_no").notNull(),
  department: text("department").notNull(),
  subject: text("subject").notNull(),
  notes: text("notes").notNull(),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("sent"),
  sentBy: text("sent_by").notNull(),
  recipient: text("recipient").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_department_handovers_flight_no").on(table.flightNo), index("idx_department_handovers_department_status").on(table.department, table.status)]);

export const cabinDefects = sqliteTable("cabin_defects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flightNo: text("flight_no").notNull(),
  aircraftRegistration: text("aircraft_registration").notNull(),
  equipmentType: text("equipment_type").notNull(),
  defectType: text("defect_type").notNull(),
  description: text("description").notNull(),
  cabinLocation: text("cabin_location").notNull(),
  safetyHazard: integer("safety_hazard", { mode: "boolean" }).notNull().default(false),
  engineerRequired: integer("engineer_required", { mode: "boolean" }).notNull().default(false),
  melClassification: text("mel_classification").notNull().default("none"),
  status: text("status").notNull().default("open"),
  engineerNotes: text("engineer_notes").notNull().default(""),
  reportedBy: text("reported_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  resolvedAt: text("resolved_at"),
}, (table) => [index("idx_cabin_defects_flight_no").on(table.flightNo), index("idx_cabin_defects_status").on(table.status), index("idx_cabin_defects_equipment_type").on(table.equipmentType)]);
