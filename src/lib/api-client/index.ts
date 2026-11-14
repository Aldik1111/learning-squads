"use client";
import type { AvailabilitySchedule, StudyAvailability, CourseGroup, GroupMessage, GroupMemberProgress, GroupMeeting, ApiEnvelope, AppErrorCode, Call, Course, LearningModule, Notification, Profile, ProfileInput, Progress, PythonAttempt, PythonRunResult, QuizAttempt, Squad, Track, Level } from "@/contracts";
import { ensureGuestSession } from "../auth/guest";
import { browserSupabase } from "../supabase/browser";
import type { TaskBoardItem, TaskResult, TaskResultInput } from "@/contracts";
export { ensureGuestSession };
export class ApiError extends Error {
  constructor(public code: AppErrorCode, message: string) { super(message); this.name = "ApiError"; }
}
async function request<T>(path: string, method = "GET", body?: unknown, publicRead = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!publicRead) {
    await ensureGuestSession();
    const { data } = await browserSupabase().auth.getSession();
    if (!data.session) throw new ApiError("SESSION_REQUIRED", "Please reload to restore your guest session.");
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let response: Response;
  try { response = await fetch(`/api/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000), cache: "no-store" }); }
  catch { throw new ApiError("SERVICE_UNAVAILABLE", "The connection failed. Your changes could not be confirmed. Try again."); }
  let payload: ApiEnvelope<T>;
  try { payload = await response.json() as ApiEnvelope<T>; }
  catch { throw new ApiError("SERVICE_UNAVAILABLE", "We could not read the service response. Please try again."); }
  if (!payload || typeof payload !== "object" || (!("data" in payload) && !("error" in payload))) throw new ApiError("SERVICE_UNAVAILABLE", "The service returned an incomplete response. Please try again.");
  if ("error" in payload) throw new ApiError(payload.error.code, payload.error.message);
  if (!response.ok) throw new ApiError("SERVICE_UNAVAILABLE", "The service could not complete this request.");
  return payload.data;
}
export const getProfile = () => request<Profile>("profile");
export const updateProfile = (profile: ProfileInput) => request<Profile>("profile", "PUT", profile);
export const getCourses = () => request<Course[]>("courses", "GET", undefined, true);
export const getModule = (moduleId: string) => request<LearningModule>(`courses/modules/${encodeURIComponent(moduleId)}`, "GET", undefined, true);
export const submitQuiz = (moduleId: string, contentVersion: number, answers: Record<string, string>, requestId: string) => request<QuizAttempt>("attempts/quiz", "POST", { moduleId, contentVersion, answers, requestId });
export const submitPythonResult = (result: PythonRunResult, requestId: string) => request<PythonAttempt>("attempts/python", "POST", { result, requestId });
export const getProgress = () => request<Progress>("progress");
export const findSquads = (filter: { track?: Track; level?: Level } = {}) => request<Squad[]>(`squads?${new URLSearchParams(filter)}`);
export const createSquad = (input: { name: string; track: Track; level: Level }, requestId: string) => request<Squad>("squads", "POST", { ...input, requestId });
export const joinSquad = (id: string) => request<Squad>(`squads/${id}/membership`, "PUT");
export const leaveSquad = (id: string) => request<void>(`squads/${id}/membership`, "DELETE");
export const setCallAvailability = (available: boolean) => request<Profile>("availability", "PUT", { available });
export const heartbeat = () => request<void>("availability/heartbeat", "POST");
export const requestLanguagePartner = (language: string, requestId: string, moduleId?: string) => request<Call>("calls/language", "POST", { language, requestId, moduleId });
export const createSquadCall = (squadId: string, requestId: string, moduleId?: string, recipientIds?: string[]) => request<Call>("calls/squad", "POST", { squadId, requestId, moduleId, recipientIds });
export const getMyCalls = () => request<Call[]>("calls");
export const finishPractice = (id: string) => request<Call>(`calls/${id}/finish`, "POST");
export const getCall = (id: string) => request<Call>(`calls/${id}`);
export const getNotifications = () => request<Notification[]>("notifications");
export const markRead = (id: string) => request<void>(`notifications/${id}/read`, "PUT");
export const acceptInvitation = (id: string) => request<void>(`invitations/${id}/accepted`, "PUT");
export const declineInvitation = (id: string) => request<void>(`invitations/${id}/declined`, "PUT");
export const cancelInvitation = (id: string) => request<void>(`invitations/${id}/cancelled`, "PUT");
export const setMeetLink = (id: string, meetUrl: string) => request<Call>(`calls/${id}/meet`, "PUT", { meetUrl });
export const recordMeetTransition = (id: string) => request<Call>(`calls/${id}/transition`, "POST");
export const getStudyAvailability = () => request<StudyAvailability | null>("study-availability");
export const updateStudyAvailability = (schedule: AvailabilitySchedule) => request<StudyAvailability>("study-availability", "PUT", schedule);
export const enrollCourse = (courseId: Track, requestId: string) => request<CourseGroup>(`course-groups/enroll`, "POST", { courseId, requestId });
export const getMyCourseGroups = () => request<CourseGroup[]>("course-groups");
export const getCourseGroup = (id: string) => request<CourseGroup>(`course-groups/${id}`);
export const getGroupMessages = (id: string) => request<GroupMessage[]>(`course-groups/${id}/messages`);
export const sendGroupMessage = (id: string, body: string, requestId: string) => request<GroupMessage>(`course-groups/${id}/messages`, "POST", { body, requestId });
export const getGroupProgress = (id: string) => request<GroupMemberProgress[]>(`course-groups/${id}/progress`);
export const getGroupMeetings = (id: string) => request<GroupMeeting[]>(`course-groups/${id}/meetings`);
export const createGroupMeeting = (id: string, requestId: string) => request<GroupMeeting>(`course-groups/${id}/meetings`, "POST", { requestId });
export const getTaskBoard = (courseId?: Track) => request<TaskBoardItem[]>(`tasks${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ""}`);
export const updateTaskResult = (taskId: string, taskVersion: number, input: TaskResultInput, requestId: string) => request<TaskResult>(`tasks/${encodeURIComponent(taskId)}`, "PUT", { taskVersion, ...input, requestId });
export const getGroupTaskResults = (groupId: string) => request<TaskBoardItem[]>(`course-groups/${groupId}/tasks`);
export const api = { getTaskBoard, updateTaskResult, getGroupTaskResults, getStudyAvailability, updateStudyAvailability, enrollCourse, getMyCourseGroups, getCourseGroup, getGroupMessages, sendGroupMessage, getGroupProgress, getGroupMeetings, createGroupMeeting, ensureGuestSession, getProfile, updateProfile, getCourses, getModule, submitQuiz, submitPythonResult, getProgress, findSquads, createSquad, joinSquad, leaveSquad, setCallAvailability, heartbeat, requestLanguagePartner, createSquadCall, getMyCalls, finishPractice, getCall, getNotifications, markRead, acceptInvitation, declineInvitation, cancelInvitation, setMeetLink, recordMeetTransition };
