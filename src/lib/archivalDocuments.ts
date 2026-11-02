export const DOCUMENT_TYPES = ["Newspaper article", "Letter of recommendation", "Diploma", "Certificate", "Artist notes", "Manuscript", "Manifesto", "Foreword draft", "Audience feedback", "Poster", "Photograph", "Other"];
export const DEFAULT_DOCUMENT_VISIBILITY = false;
export function canPublishDocument(ownerId: string, userId: string | null) { return ownerId === userId; }
export function validArchivalDate(value: string) { return !value || /^\d{4}(-\d{2}(-\d{2})?)?$/.test(value) && !Number.isNaN(Date.parse(value)); }