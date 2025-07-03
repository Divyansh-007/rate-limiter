// Test setup file
import mongoose from "mongoose";

// Mock mongoose connection
jest.mock("mongoose", () => {
  const mockRateLimitLog = {
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
  };

  return {
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
      collection: jest.fn().mockReturnValue({
        createIndex: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
      readyState: 1, // Connected state
    },
    model: jest.fn().mockReturnValue(mockRateLimitLog),
    Schema: jest.fn().mockReturnValue({
      index: jest.fn().mockReturnThis(),
    }),
  };
});

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test timeout
jest.setTimeout(10000);
