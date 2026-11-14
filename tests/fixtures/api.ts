// Development/test examples only. Never import this file in production routes.
import type { Call, Profile, Progress, Squad } from "../../src/contracts";
export const exampleProfile: Profile = { id: "10000000-0000-4000-8000-000000000001", name: "Example learner", track: "spanish", level: "beginner", primaryLanguage: "en", knownLanguages: ["en", "es"], timezone: "UTC", availableForCalls: false };
export const emptyProgress: Progress = { quizAttempts: [], pythonAttempts: [], practice: [] };
export const exampleSquad: Squad = { id: "30000000-0000-4000-8000-000000000001", name: "Example practice team", track: "spanish", level: "beginner", memberCount: 1, members: [{userId:exampleProfile.id,name:exampleProfile.name}], isMember: true, createdBy: exampleProfile.id };
export const exampleCall: Call = { id: "40000000-0000-4000-8000-000000000001", kind: "language", createdBy: exampleProfile.id, squadId: null, moduleId: "spanish-first-conversation", meetUrl: null, createdAt: "2026-11-14T12:00:00Z", participants: [{invitationId:null,userId:exampleProfile.id,name:exampleProfile.name,status:"organizer",transitionedAt:null}], myTransitionedAt: null, myPracticeEndedAt: null };
