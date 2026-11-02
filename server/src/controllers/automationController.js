const AutomationEnrollment = require('../models/AutomationEnrollment');
const Challenge = require('../models/Challenge');
const ChallengeMembership = require('../models/ChallengeMembership');
const service = require('../services/automationService');

async function getStatus(req, res, next) {
  try {
    const enrollment = await AutomationEnrollment.findOne({ user: req.user._id, challenge: req.params.challengeId }).select('-verificationCode -leaseToken');
    const challenge = await Challenge.findById(req.params.challengeId).select('title status automation host');
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });
    const membership = await ChallengeMembership.findOne({ user: req.user._id, challenge: challenge._id, status: 'active' });
    const isHost = challenge.host.equals(req.user._id) || req.user.role === 'admin';
    if (!membership && !isHost) return res.status(403).json({ success: false, message: 'You are not a member of this challenge.' });
    res.json({ success: true, challenge, enrollment });
  } catch (e) { next(e); }
}
async function startVerification(req, res, next) {
  try {
    if (req.body.consent !== true) return res.status(400).json({ success: false, message: 'Explicit consent is required to enable automatic LeetCode checks.' });
    const result = await service.startVerification({ userId: req.user._id, challengeId: req.params.challengeId, username: req.body.username });
    res.status(201).json({ success: true, message: 'Add this code to your public LeetCode About Me, then confirm verification.', verificationCode: result.verificationCode, expiresAt: result.expiresAt });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
}
async function confirmVerification(req, res, next) {
  try {
    const enrollment = await service.confirmVerification({ userId: req.user._id, challengeId: req.params.challengeId });
    res.json({ success: true, message: 'LeetCode account verified and automation enrolled.', enrollment: { ...enrollment.toObject(), verificationCode: undefined, leaseToken: undefined } });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
}
async function updateStatus(req, res, next) {
  try {
    const allowed = { pause: 'paused', resume: 'active', disconnect: 'disconnected' };
    const status = allowed[req.params.action];
    if (!status) return res.status(400).json({ success: false, message: 'Unsupported action.' });
    const enrollment = await service.setEnrollmentStatus(req.user._id, req.params.challengeId, status);
    res.json({ success: true, enrollment: { ...enrollment.toObject(), verificationCode: undefined, leaseToken: undefined } });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
}
async function manualSync(req, res, next) {
  try {
    const enrollment = await AutomationEnrollment.findOne({ user: req.user._id, challenge: req.params.challengeId });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Automation enrollment not found.' });
    const result = await service.syncEnrollment(enrollment._id, { manual: true });
    if (result.skipped) return res.status(429).json({ success: false, message: result.reason });
    res.json({ success: true, result });
  } catch (e) { res.status(502).json({ success: false, message: e.message }); }
}
async function toggleChallenge(req, res, next) {
  try {
    const challenge = await Challenge.findById(req.params.challengeId);
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });
    if (!challenge.host.equals(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only the challenge owner can configure automation.' });
    const enabled = req.body.enabled === true;
    challenge.automation = { enabled, enabledAt: enabled ? new Date() : null, enabledBy: enabled ? req.user._id : null };
    await challenge.save();
    res.json({ success: true, challenge: { _id: challenge._id, automation: challenge.automation }, message: enabled ? 'Automation enabled for this challenge.' : 'Automation disabled for this challenge.' });
  } catch (e) { next(e); }
}
async function listEnrollments(req, res, next) {
  try {
    const challenge = await Challenge.findById(req.params.challengeId);
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });
    if (!challenge.host.equals(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only the challenge owner can view enrollments.' });
    const enrollments = await AutomationEnrollment.find({ challenge: challenge._id }).populate('user', 'name email').select('-verificationCode -leaseToken').sort({ createdAt: -1 });
    res.json({ success: true, enrollments });
  } catch (e) { next(e); }
}
module.exports = { getStatus, startVerification, confirmVerification, updateStatus, manualSync, toggleChallenge, listEnrollments };
