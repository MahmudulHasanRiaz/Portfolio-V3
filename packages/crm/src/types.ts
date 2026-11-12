export interface LeadFilters {
  status?: string | string[];
  source?: string;
  assignedTo?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadListResponse {
  leads: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LeadRow {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  budget: string | null;
  timeline: string | null;
  projectType: string | null;
  inquiryType: string | null;
  message: string | null;
  leadSource: string | null;
  status: string;
  assignedUserId: string | null;
  followUpDate: string | null;
  followUpNotes: string | null;
  convertedToProjectId: string | null;
  convertedToEventId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  slaMinutes: number | null;
  firstResponseAt: string | null;
  responseStatus: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
