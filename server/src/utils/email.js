import nodemailer from 'nodemailer';
import { SUPER_ADMIN_EMAILS } from '../config/superAdmin.js';

export async function sendSuperAdminNotification({ name, phoneNumber, emailId, userName, planName, period, amount, paymentReference, paymentScreenshotUrl }) {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || SUPER_ADMIN_EMAILS[0];
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.log(`Subscription request alert for ${name} (${emailId}) is ready for approval. Send to: ${adminEmail}`);
        return { sent: false, reason: 'SMTP not configured' };
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });

    const subject = `Fintrack subscription request: ${name} (${planName})`;
    const text = [
        'A new subscription request has been submitted.',
        `Name: ${name}`,
        `Phone: ${phoneNumber}`,
        `Email: ${emailId}`,
        `Username: ${userName}`,
        `Plan: ${planName}`,
        `Period: ${period}`,
        `Amount: ₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `Payment reference: ${paymentReference || 'Not provided'}`,
        `Payment screenshot: ${paymentScreenshotUrl || 'Not provided'}`,
        'Please review and approve the user account in the admin panel.'
    ].join('\n');

    await transporter.sendMail({
        from: smtpUser,
        to: adminEmail,
        subject,
        text
    });

    return { sent: true };
}

export async function sendUserNotification({ userName, emailId, status, message, subscriptionPlan, subscriptionStartDate, subscriptionEndDate }) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.log(`Subscription ${status} notification for ${userName} (${emailId})`);
        return { sent: false, reason: 'SMTP not configured' };
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });

    const subject = status === 'approved' ? 'Fintrack Subscription Approved ✓' : 'Fintrack Subscription Status Update';

    const statusText = status === 'approved' ? 'APPROVED' : 'REJECTED';
    const textLines = [
        `Hello ${userName},`,
        '',
        `Your Fintrack subscription request has been ${statusText}.`,
        '',
        message
    ];

    if (status === 'approved' && subscriptionPlan && subscriptionStartDate) {
        textLines.push('');
        textLines.push('Subscription Details:');
        textLines.push(`Plan: ${subscriptionPlan}`);
        textLines.push(`Start Date: ${new Date(subscriptionStartDate).toLocaleDateString('en-IN')}`);
        textLines.push(`End Date: ${new Date(subscriptionEndDate).toLocaleDateString('en-IN')}`);
        textLines.push('');
        textLines.push('You can now log in to your account at https://fintrack.app');
    }

    textLines.push('');
    textLines.push('If you have any questions, please contact our support team.');
    textLines.push('');
    textLines.push('Best regards,');
    textLines.push('Fintrack Team');

    await transporter.sendMail({
        from: smtpUser,
        to: emailId,
        subject,
        text: textLines.join('\n')
    });

    return { sent: true };
}
