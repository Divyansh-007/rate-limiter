import mongoose, { Schema, Document } from "mongoose";

export interface IRateLimitLog extends Document {
  key: string;
  count: number;
  resetTime: Date;
  createdAt: Date;
}

const RateLimitLogSchema = new Schema<IRateLimitLog>({
  key: {
    type: String,
    required: true,
    index: true,
  },
  count: {
    type: Number,
    required: true,
    default: 1,
  },
  resetTime: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 0, // This will be set dynamically based on TTL
  },
});

// Create compound index for efficient queries
RateLimitLogSchema.index({ key: 1, resetTime: 1 });

export const RateLimitLog = mongoose.model<IRateLimitLog>(
  "RateLimitLog",
  RateLimitLogSchema
);
