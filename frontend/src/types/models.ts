export type TicketStatus = 'Open' | 'InProgress' | 'Resolved';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  requiredSkills: string[] | null;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  assignedEmployeeId: number | null;
  resolution: string | null;
  resolvedAt: string | null;
}

export interface Employee {
  id: number;
  name: string;
  skills: string[];
  maxCapacity: number;
}

export interface TicketAnalysis {
  ticketId: number;
  category: string;
  requiredSkills: string[];
  summary: string;
}

export interface Recommendation {
  ticketId: number;
  employeeId: number;
  score: number;
  skillScore: number;
  experienceScore: number;
  availableCapacity: number;
  maxCapacity: number;
  explanation: string;
}

export interface EmployeeProfile {
  employeeId: number;
  summary: string;
  generatedAt: string;
  isOutdated: boolean;
}