import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

// Small in-app inbox (see the Notification model). Everything is scoped to the
// signed-in user, so a request can never leak to another tenant.
export async function listNotifications(req, res, next) {
    try {
        const items = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(30);
        res.json({
            items,
            // Drives the bell badge without a second round trip.
            unread: await Notification.countDocuments({ userId: req.user.id, readAt: null })
        });
    } catch (error) {
        next(error);
    }
}

// POST /notifications/read - optionally with { ids: [...] }; without ids it
// clears the whole badge.
export async function markNotificationsRead(req, res, next) {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(mongoose.isValidObjectId) : null;
        const filter = { userId: req.user.id, readAt: null, ...(ids?.length ? { _id: { $in: ids } } : {}) };
        const result = await Notification.updateMany(filter, { readAt: new Date() });
        res.json({ updated: result.modifiedCount || 0 });
    } catch (error) {
        next(error);
    }
}

export async function deleteNotification(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
        const removed = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!removed) return res.status(404).json({ message: 'Notification not found' });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
}
