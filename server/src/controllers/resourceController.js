export function createResource(Model) {
    return {
        list: async (req, res, next) => { try { res.json(await Model.find().sort({ createdAt: -1 })); } catch (error) { next(error); } },
        create: async (req, res, next) => { try { res.status(201).json(await Model.create(req.body)); } catch (error) { next(error); } },
        update: async (req, res, next) => { try { const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Record not found' }); res.json(item); } catch (error) { next(error); } },
        remove: async (req, res, next) => { try { await Model.findByIdAndDelete(req.params.id); res.status(204).end(); } catch (error) { next(error); } }
    };
}
