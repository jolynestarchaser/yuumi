import mongoose from 'mongoose';
import { initialCompanion, MOODS } from '../services/companionState.js';
import type { StoredCompanion } from '../../../shared/contracts.js';

const bounded = (value) => ({ type: Number, min: 0, max: 100, default: value });
const memorySchema = new mongoose.Schema({
  id: { type: String, required: true }, actor: { type: String, enum: ['joe', 'focus'], required: true },
  kind: { type: String, required: true }, text: { type: String, maxlength: 1000, required: true }, at: Date
}, { _id: false });
const turnSchema = new mongoose.Schema({
  id: String, actor: { type: String, enum: ['joe', 'focus', 'companion'] }, text: { type: String, maxlength: 2000 }, at: Date
}, { _id: false });
const defaults = initialCompanion();
const schema = new mongoose.Schema<StoredCompanion>({
  _id: String,
  familyId: { type: String, required: true, default: 'joe-and-focus', index: true },
  schemaVersion: { type: Number, default: 2, min: 2 },
  archivedAt: { type: Date, default: null, index: true },
  createdOperationId: { type: String, maxlength: 80, sparse: true, unique: true },
  name: { type: String, required: true, maxlength: 32, default: defaults.name },
  form: { type: String, enum: ['pet', 'child', 'creature'], default: 'creature' },
  seed: { type: String, maxlength: 500, default: defaults.seed },
  inspirations: { joe: { type: String, maxlength: 300, default: '' }, focus: { type: String, maxlength: 300, default: '' } },
  bornAt: { type: Date, default: null }, updatedAt: { type: Date, default: Date.now }, needsUpdatedAt: { type: Date, default: Date.now },
  needs: { fullness: bounded(75), energy: bounded(80), joy: bounded(75), comfort: bounded(75) },
  traits: { curiosity: bounded(50), affection: bounded(50), playfulness: bounded(50) },
  bonds: { joe: { type: Number, default: 0, min: 0 }, focus: { type: Number, default: 0, min: 0 } },
  xp: { type: Number, default: 0, min: 0 }, mood: { type: String, enum: MOODS, default: 'curious' },
  thought: { type: String, maxlength: 300, default: defaults.thought },
  chatColor: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: defaults.chatColor },
  appearance: {
    type: new mongoose.Schema({
      visualStyle: { type: String, enum: ['soft', 'pixel'], required: true },
      animated: { type: Boolean, required: true },
      usePortrait: { type: Boolean, required: true },
      species: { type: String, enum: ['spirit', 'bunny', 'cat', 'fox', 'dragon', 'robot', 'child', 'custom'] },
      customDescription: { type: String, maxlength: 500 },
      face: { type: String, enum: ['gentle', 'happy', 'sleepy', 'mischievous', 'starry'] },
      gender: { type: String, enum: ['unspecified', 'female', 'male', 'nonbinary'] },
      theme: { type: String, enum: ['lavender', 'forest', 'ocean', 'sunset', 'starlight', 'candy', 'custom'] },
      silhouette: { type: String, enum: ['round', 'bean', 'fluffy'] },
      bodyColor: { type: String, match: /^#[0-9a-fA-F]{6}$/ },
      accentColor: { type: String, match: /^#[0-9a-fA-F]{6}$/ },
      eyeColor: { type: String, match: /^#[0-9a-fA-F]{6}$/ },
      voice: { type: new mongoose.Schema({ enabled: Boolean, language: { type: String, enum: ['th-TH', 'en-US'] }, voiceURI: { type: String, maxlength: 300 }, rate: { type: Number, min: .5, max: 1.5 }, pitch: { type: Number, min: .5, max: 2 }, preset: { type: String, enum: ['natural', 'spark', 'fairy', 'dragon', 'robot', 'custom'] } }, { _id: false }), default: undefined }
    }, { _id: false }),
    default: undefined
  },
  memories: { type: [memorySchema], default: [], validate: (rows) => rows.length <= 80 },
  turns: { type: [turnSchema], default: [], validate: (rows) => rows.length <= 60 },
  evolutions: { type: [new mongoose.Schema({
    level: { type: Number, min: 3, required: true },
    species: { type: String, enum: ['spirit', 'bunny', 'cat', 'fox', 'dragon', 'robot', 'child', 'custom'], required: true },
    path: { type: String, enum: ['explorer', 'guardian', 'trickster'], required: true },
    at: { type: Date, required: true }
  }, { _id: false })], default: [], validate: (rows) => rows.length <= 40 },
  portrait: { url: String, publicId: String, createdAt: Date },
  revision: { type: Number, default: 0 },
  budget: { day: String, chats: { type: Number, default: 0 }, portraits: { type: Number, default: 0 }, lastChat: Date, lastPortrait: Date },
  lastCare: { joe: Date, focus: Date },
  recentOperations: { type: [String], default: [] },
  lockToken: String, lockedUntil: { type: Date, default: () => new Date(0) }
}, { minimize: false });

export default mongoose.model('Companion', schema);
