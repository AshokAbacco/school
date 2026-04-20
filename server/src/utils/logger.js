import winston from "winston";

const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Save all errors in file
    new winston.transports.File({ filename: "logs/error.log" }),

    // Optional: log everything
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

// Show logs in console (dev only)
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export default logger;