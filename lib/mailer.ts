import nodemailer from "nodemailer";

const requiredEnvKeys = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "MAIL_FROM",
] as const;

type MailerEnvKey = (typeof requiredEnvKeys)[number];

const getMailerEnv = (key: MailerEnvKey) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required mail environment variable: ${key}`);
  }

  return value;
};

export const createMailerTransport = () => {
  const host = getMailerEnv("SMTP_HOST");
  const port = Number(getMailerEnv("SMTP_PORT"));
  const user = getMailerEnv("SMTP_USER");
  const pass = getMailerEnv("SMTP_PASS");

  if (Number.isNaN(port)) {
    throw new Error("SMTP_PORT must be a valid number");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export const getMailFrom = () => getMailerEnv("MAIL_FROM");
