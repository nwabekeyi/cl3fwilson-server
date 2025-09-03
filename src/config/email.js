// emailService.js
import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

class EmailConfig {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendWithEjsTemplate(to, subject, templateName, data) {
    const templatePath = path.join(process.cwd(), "views", `${templateName}.ejs`);
    const template = fs.readFileSync(templatePath, "utf8");
    const html = ejs.render(template, data);

    return this.transporter.sendMail({
      from: `"Wilson Studio" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }

  async sendWithHtml(to, subject, html) {
    return this.transporter.sendMail({
      from: `"Wilson Studio" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }
}

export default new EmailConfig();
