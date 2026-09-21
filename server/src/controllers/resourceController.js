import bcrypt from 'bcryptjs';

const ALLOWED_USER_ROLES = ['user', 'business_owner', 'business_staff', 'super_admin'];

function sanitizeUserPayload(body = {}, { isUpdate = false } = {}) {
    const payload = { ...body };
    if (payload.role && !ALLOWED_USER_ROLES.includes(payload.role)) {
        delete payload.role;
    }
    // Branch scoping is owned exclusively by the /api/business/staff endpoints,
    // which validate branch ObjectIds. Never let a raw value through here or
    // Mongoose throws `Cast to [ObjectId] failed` on allowedBranches.
    delete payload.allowedBranches;
    delete payload.businessOwnerId;
    if ('password' in payload && (payload.password === '' || payload.password == null)) {
        delete payload.password;
    }
    return payload;
}

async function hashPasswordIfPresent(payload) {
    if (payload.password) {
        payload.password = await bcrypt.hash(String(payload.password), 10);
    }
    return payload;
}

export function createResource(Model, { isUserModel = false } = {}) {
    return {
        list: async (req, res, next) => { try { res.json(await Model.find().sort({ createdAt: -1 })); } catch (error) { next(error); } },
        create: async (req, res, next) => {
            try {
                let payload = req.body;
                if (isUserModel) {
                    payload = sanitizeUserPayload(req.body);
                    if (!payload.password) return res.status(400).json({ message: 'Password is required' });
                    await hashPasswordIfPresent(payload);
                    if (!payload.approvalStatus) payload.approvalStatus = 'approved';
                }
                res.status(201).json(await Model.create(payload));
            } catch (error) { next(error); }
        },
        update: async (req, res, next) => {
            try {
                let payload = req.body;
                if (isUserModel) {
                    payload = sanitizeUserPayload(req.body, { isUpdate: true });
                    await hashPasswordIfPresent(payload);
                }
                const item = await Model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
                if (!item) return res.status(404).json({ message: 'Record not found' });
                res.json(item);
            } catch (error) { next(error); }
        },
        remove: async (req, res, next) => { try { await Model.findByIdAndDelete(req.params.id); res.status(204).end(); } catch (error) { next(error); } }
    };
}
