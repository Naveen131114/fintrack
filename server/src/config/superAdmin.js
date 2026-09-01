export const SUPER_ADMIN_EMAILS = ['m.naveenkumarmunees@gmail.com'];
export const SUPER_ADMIN_PHONES = ['8489294594'];

export const SUPER_ADMIN_UPI = {
    mobileNumber: process.env.UPI_MOBILE_NUMBER || '8489294594',
    qrCodeUrl: process.env.UPI_QR_IMAGE_URL || '/images/upi-qr.jpeg',
    upiId: process.env.UPI_ID || 'm.naveenkumarmunees@upi'
};

export function isSuperAdminIdentity(emailId, phoneNumber) {
    const normalizedEmail = String(emailId || '').trim().toLowerCase();
    const normalizedPhone = String(phoneNumber || '').trim();

    return SUPER_ADMIN_EMAILS.some((email) => email.toLowerCase() === normalizedEmail)
        || SUPER_ADMIN_PHONES.some((phone) => phone === normalizedPhone);
}
