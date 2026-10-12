import orchestrator from "@/tests/orchestrator/orchestrator.mjs";
import nodemailer from "nodemailer";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: process.env.EMAIL_SMTP_PORT,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    user: process.env.EMAIL_SMTP_PASSWORD,
  },
  secure: process.env.NODE_ENV === "production" ? true : false,
});

async function sendMail(mailOptions) {
  await transporter.sendMail(mailOptions);
}

const email = {
  sendMail,
};

export default email;
