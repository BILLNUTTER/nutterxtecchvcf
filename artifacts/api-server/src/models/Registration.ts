import { Schema, model, type InferSchemaType } from "mongoose";

const registrationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type RegistrationDoc = InferSchemaType<typeof registrationSchema>;

export const RegistrationModel = model("Registration", registrationSchema);
