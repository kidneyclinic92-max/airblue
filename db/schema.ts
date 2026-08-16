import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_inventory_items_flight_id").on(table.flightId)]);

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
