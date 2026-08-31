import Transaction from '../models/Transaction.js';

export async function listTransactions(req, res, next) { try { const transactions = await Transaction.find().sort({ date: -1 }); res.json(transactions); } catch (error) { next(error); } }
export async function createTransaction(req, res, next) { try { const payload = { ...req.body, title: req.body.title?.trim() || req.body.description?.trim() }; const transaction = await Transaction.create(payload); res.status(201).json(transaction); } catch (error) { next(error); } }
export async function updateTransaction(req, res, next) { try { const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!transaction) return res.status(404).json({ message: 'Transaction not found' }); res.json(transaction); } catch (error) { next(error); } }
export async function deleteTransaction(req, res, next) { try { await Transaction.findByIdAndDelete(req.params.id); res.status(204).end(); } catch (error) { next(error); } }
