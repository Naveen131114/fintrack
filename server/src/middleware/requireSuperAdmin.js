export function requireSuperAdmin(req, res, next) {
    if (req.header('x-user-role') !== 'super_admin') return res.status(403).json({ message: 'Super admin access required' });
    next();
}
